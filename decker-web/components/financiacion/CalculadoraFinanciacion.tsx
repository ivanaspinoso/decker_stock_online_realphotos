'use client';

import { useId, useMemo, useState } from 'react';
import { IconoWhatsapp } from '@/components/ui/Iconos';
import NumeroAnimado from '@/components/ui/NumeroAnimado';
import { calcularFinanciacion, calcularLeasing, cotizacionConMargen } from '@/lib/financiacion';
import {
  formatearNumero,
  formatearPorcentaje,
  formatearPrecio,
  formatearUsd,
} from '@/lib/format';
import { linkConsultaFinanciacion, linkConsultaLeasing } from '@/lib/whatsapp';
import type { ModalidadFinanciacion, ParametrosFinanciacion, Unidad } from '@/lib/types';

/**
 * Calculadora de financiación, con dos modalidades.
 *
 * Recalcula a medida que se tipea: el usuario está tanteando escenarios, no
 * completando un trámite, así que no hay botón "calcular". Tasa, plazos,
 * anticipo mínimo, cotización del dólar e inflación estimada salen de
 * `lib/data/financiacion.ts` — acá no hay ningún número comercial hardcodeado.
 *
 * Si viene `unidad`, arranca con su precio en dólares y el WhatsApp deriva al
 * asesor de esa sucursal en vez de al número general.
 *
 * Decisiones de diseño:
 * - DOS MODALIDADES, UN FORMULARIO A LA VEZ. Financiación estándar y leasing no
 *   comparten reglas —una amortiza capital con interés, la otra paga un canon
 *   ajustado y una compra final—, así que tampoco comparten campos en pantalla.
 *   Mostrar los dos juegos juntos obligaría al visitante a decidir cuáles
 *   ignorar antes de poder leer ningún número. El único dato que sobrevive al
 *   cambio de pestaña es el valor de la unidad: es de la unidad, no de la
 *   modalidad, y volver a tipearlo para comparar sería absurdo.
 * - EL VALOR ENTRA EN DÓLARES Y TODO LO DEMÁS SALE EN PESOS. Es como se cotiza
 *   el stock y como se paga la cuota. Para que ese salto no sea un truco, la
 *   cotización usada está impresa debajo del campo, no escondida en el cálculo.
 * - Un solo panel oscuro y no dos tarjetas sueltas: entrada y resultado son un
 *   mismo objeto, y el negro le da a la cuota el peso que tiene en la decisión.
 * - Los montos se escriben con separador de miles. Un `<input type="number">`
 *   no lo permite, así que son `type="text"` con `inputMode="numeric"`: se
 *   guarda sólo el dígito y se muestra formateado.
 * - Plazo y anticipo salen de botones y no de un `<select>`: son pocas
 *   opciones, se comparan de un vistazo y se tocan en un gesto.
 * - Los grupos de opciones —anticipo, plazo, modalidad— comparten tratamiento:
 *   activo en blanco pleno, inactivo en negro-800. El amarillo acá tiene otro
 *   trabajo —es la señalética de 0 km y la cifra de la cuota—, y gastarlo en un
 *   chip le sacaba peso al número que importa.
 */

/** Atajos de entrega inicial, en porcentaje del valor de la unidad. */
const ATAJOS_ANTICIPO = [30, 40, 50];

const MODALIDADES: { id: ModalidadFinanciacion; rotulo: string }[] = [
  { id: 'estandar', rotulo: 'Financiación estándar' },
  { id: 'leasing', rotulo: 'Leasing' },
];

const soloDigitos = (texto: string) => texto.replace(/\D/g, '');
const conSeparadores = (digitos: string) =>
  digitos ? formatearNumero(Number(digitos)) : '';

/** Al entrar a un campo se selecciona todo lo que tenga: se escribe encima. */
const seleccionarTodo = (evento: React.FocusEvent<HTMLInputElement>) =>
  evento.target.select();

export default function CalculadoraFinanciacion({
  parametros,
  unidad,
}: {
  parametros: ParametrosFinanciacion;
  unidad?: Unidad;
}) {
  const id = useId();

  const [modalidad, setModalidad] = useState<ModalidadFinanciacion>('estandar');

  /**
   * Los campos de importe arrancan VACÍOS y muestran el ejemplo como
   * placeholder —"60.000" en gris—, no como valor cargado.
   *
   * Un importe escrito de verdad se lee como un dato de la operación: el
   * simulador estaría afirmando un precio que nadie eligió, y el visitante
   * tendría que borrarlo antes de poner el suyo.
   *
   * Desde una ficha con `precioUsd` sí arranca cargado: ahí el importe no es un
   * ejemplo, es el precio de esa unidad. Si la unidad no tiene precio en
   * dólares, el campo queda vacío: convertir su precio en pesos hacia atrás
   * sería afirmar una cotización histórica que nadie pactó.
   */
  const ejemploValor = parametros.valorEjemploUsd;
  const ejemploAnticipo = Math.round(
    (ejemploValor * parametros.anticipoSugeridoPorcentaje) / 100,
  );

  const precioUsdUnidad = unidad?.precioUsd ?? null;

  const [valor, setValor] = useState<string>(
    precioUsdUnidad ? String(precioUsdUnidad) : '',
  );
  const [anticipo, setAnticipo] = useState<string>(
    precioUsdUnidad
      ? String(Math.round((precioUsdUnidad * parametros.anticipoSugeridoPorcentaje) / 100))
      : '',
  );
  const [plazo, setPlazo] = useState<number>(parametros.plazoPorDefecto);
  const [tasa, setTasa] = useState<string>(String(parametros.tasaAnualPorDefecto));
  const [interesMensual, setInteresMensual] = useState<string>(
    String(parametros.interesMensualAdicionalPorDefecto),
  );
  const [tasaLeasing, setTasaLeasing] = useState<string>(
    String(parametros.tasaAnualLeasingPorDefecto),
  );
  const [aumentoMensual, setAumentoMensual] = useState<string>(
    String(parametros.aumentoMensualLeasingPorDefecto),
  );

  const valorNum = Number(valor);
  const anticipoNum = Number(anticipo);

  /**
   * Cotización de la simulación: dólar oficial venta más el margen de Decker.
   * Es la misma para las dos modalidades y se calcula una sola vez.
   */
  const cotizacion = useMemo(
    () =>
      cotizacionConMargen(parametros.dolarOficialVenta, parametros.margenDolarPorcentaje),
    [parametros.dolarOficialVenta, parametros.margenDolarPorcentaje],
  );

  const resultadoEstandar = useMemo(
    () =>
      calcularFinanciacion({
        valorUsd: valorNum,
        anticipoUsd: anticipoNum,
        plazo,
        tasaAnual: Number(tasa),
        interesMensualAdicional: Number(interesMensual),
        cotizacion,
      }),
    [valorNum, anticipoNum, plazo, tasa, interesMensual, cotizacion],
  );

  const resultadoLeasing = useMemo(
    () =>
      calcularLeasing({
        valorUsd: valorNum,
        plazo,
        tasaAnual: Number(tasaLeasing),
        aumentoMensual: Number(aumentoMensual),
        pagoFinalPorcentaje: parametros.pagoFinalLeasingPorcentaje,
        ivaBienPorcentaje: parametros.ivaBienPorcentaje,
        ivaAlquilerPorcentaje: parametros.ivaAlquilerPorcentaje,
        cotizacion,
        // El canon inicial son 3 cuotas para 0 km y 1 para usada. Sin unidad no
        // hay estado que mirar: se asume usada, que es el caso más frecuente
        // del stock y el más conservador de los dos.
        esCeroKm: unidad?.estado === '0 km',
      }),
    [
      valorNum,
      plazo,
      tasaLeasing,
      aumentoMensual,
      parametros.pagoFinalLeasingPorcentaje,
      parametros.ivaBienPorcentaje,
      parametros.ivaAlquilerPorcentaje,
      cotizacion,
      unidad?.estado,
    ],
  );

  const valorEnPesos = valorNum > 0 ? valorNum * cotizacion : 0;
  const anticipoMinimo =
    valorNum > 0 ? (valorNum * parametros.anticipoMinimoPorcentaje) / 100 : 0;
  const anticipoInsuficiente = valorNum > 0 && anticipoNum < anticipoMinimo;
  const anticipoExcedido = valorNum > 0 && anticipoNum > valorNum;

  /** Porcentaje del valor que representa la entrega cargada. */
  const porcentajeAnticipo =
    valorNum > 0 && anticipoNum > 0 ? Math.round((anticipoNum / valorNum) * 100) : null;

  const esEstandar = modalidad === 'estandar';

  /** Campo del valor de la unidad: idéntico en las dos modalidades. */
  const campoValor = (
    <div>
      <label htmlFor={`${id}-valor`} className="campo-label text-gris-400">
        Valor de la unidad (USD)
      </label>
      <div className="relative">
        <span
          aria-hidden="true"
          className="dato pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-gris-400"
        >
          US$
        </span>
        <input
          id={`${id}-valor`}
          className="campo campo-oscuro dato h-14 pl-14 text-lg"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={conSeparadores(String(ejemploValor))}
          value={conSeparadores(valor)}
          onFocus={seleccionarTodo}
          onChange={(evento) => setValor(soloDigitos(evento.target.value))}
          aria-describedby={`${id}-cotizacion`}
        />
      </div>
      {/* El equivalente en pesos, sin el detalle de cómo se llegó a la
          cotización: el desglose "oficial venta $X + Y%" era información de
          cocina —el margen es una decisión comercial de Decker— y competía con
          el número que la persona vino a ver. Los dos importes siguen siendo
          verificables contra el resultado de la derecha.

          Con el campo vacío no se dice nada: una conversión de cero es ruido. */}
      {valorNum > 0 && (
        <p id={`${id}-cotizacion`} className="mt-3 text-sm text-gris-400">
          Equivale a{' '}
          <span className="dato text-white">
            {formatearPrecio(Math.round(valorEnPesos))}
          </span>
          .
        </p>
      )}
    </div>
  );

  const selectorPlazo = (
    <fieldset className="mt-6">
      <legend className="campo-label text-gris-400">
        {esEstandar ? 'Plazo' : 'Plazo del leasing'}
      </legend>
      <div className="flex flex-wrap gap-2">
        {parametros.plazosDisponibles.map((cuotas) => {
          const activo = plazo === cuotas;
          return (
            <button
              key={cuotas}
              type="button"
              aria-pressed={activo}
              onClick={() => setPlazo(cuotas)}
              className={`centrado-optico inline-flex h-11 items-center rounded-sm px-4 text-sm font-medium transition-colors duration-rapido ${
                activo
                  ? 'bg-white text-negro'
                  : 'bg-negro-800 text-gris-300 hover:bg-negro-700 hover:text-white'
              }`}
            >
              {/* El ancho fijo va en el número, que es lo que tiene que medir
                  igual en los cuatro botones; el rótulo es texto. */}
              <span className="dato">{cuotas}</span>
              <span className="ml-1 text-2xs font-medium opacity-60">cuotas</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );

  return (
    <div className="oscuro overflow-hidden rounded-lg bg-negro-950 shadow-nivel-3">
      {/* Selector de modalidad. Arriba de todo y no dentro del formulario:
          decide QUÉ formulario se está por completar, no un dato de la
          operación. */}
      <div
        role="tablist"
        aria-label="Modalidad de pago"
        className="flex flex-wrap gap-2 border-b border-negro-800 p-3 sm:px-5"
      >
        {MODALIDADES.map((opcion) => {
          const activa = modalidad === opcion.id;
          return (
            <button
              key={opcion.id}
              type="button"
              role="tab"
              id={`${id}-tab-${opcion.id}`}
              aria-selected={activa}
              aria-controls={`${id}-panel-${opcion.id}`}
              onClick={() => setModalidad(opcion.id)}
              className={`centrado-optico inline-flex h-11 items-center rounded-sm px-4 text-sm font-medium transition-colors duration-rapido ${
                activa
                  ? 'bg-white text-negro'
                  : 'bg-negro-800 text-gris-300 hover:bg-negro-700 hover:text-white'
              }`}
            >
              {opcion.rotulo}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${id}-panel-${modalidad}`}
        aria-labelledby={`${id}-tab-${modalidad}`}
        className="grid lg:grid-cols-[1.05fr_0.95fr]"
      >
        <form
          className="p-6 sm:p-8 lg:p-10"
          onSubmit={(evento) => evento.preventDefault()}
          aria-label={
            esEstandar ? 'Simulador de financiación estándar' : 'Simulador de leasing'
          }
        >
          {campoValor}

          {esEstandar ? (
            <>
              <div className="mt-6">
                <div className="flex items-baseline justify-between gap-3">
                  <label htmlFor={`${id}-anticipo`} className="campo-label text-gris-400">
                    Entrega inicial (USD)
                  </label>
                  {/* La mono se queda con la cifra; "del valor" es texto y va en
                      la normal. */}
                  {porcentajeAnticipo !== null && (
                    <span className="text-xs text-gris-400">
                      <span className="dato">{porcentajeAnticipo}%</span> del valor
                    </span>
                  )}
                </div>

                <div className="relative">
                  <span
                    aria-hidden="true"
                    className="dato pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-gris-400"
                  >
                    US$
                  </span>
                  <input
                    id={`${id}-anticipo`}
                    className="campo campo-oscuro dato h-14 pl-14 text-lg"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder={conSeparadores(String(ejemploAnticipo))}
                    value={conSeparadores(anticipo)}
                    onFocus={seleccionarTodo}
                    onChange={(evento) => setAnticipo(soloDigitos(evento.target.value))}
                    aria-describedby={`${id}-anticipo-ayuda`}
                  />
                </div>

                {/* Atajos: la entrega casi siempre se piensa en porcentaje, no
                    en importe. Se desactivan hasta que haya un valor. */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {ATAJOS_ANTICIPO.map((porcentaje) => {
                    const activo = porcentajeAnticipo === porcentaje;
                    return (
                      <button
                        key={porcentaje}
                        type="button"
                        disabled={valorNum <= 0}
                        aria-pressed={activo}
                        onClick={() =>
                          setAnticipo(String(Math.round((valorNum * porcentaje) / 100)))
                        }
                        className={`centrado-optico dato inline-flex h-11 items-center rounded-sm px-4 text-sm font-medium transition-colors duration-rapido disabled:pointer-events-none disabled:opacity-40 ${
                          activo
                            ? 'bg-white text-negro'
                            : 'bg-negro-800 text-gris-300 hover:bg-negro-700 hover:text-white'
                        }`}
                      >
                        {porcentaje}%
                      </button>
                    );
                  })}
                </div>

                <p id={`${id}-anticipo-ayuda`} className="mt-3 text-sm text-gris-400">
                  {valorNum > 0 ? (
                    <>
                      Entrega mínima sugerida ({parametros.anticipoMinimoPorcentaje}%):{' '}
                      <span className="dato text-white">
                        {formatearUsd(Math.round(anticipoMinimo))}
                      </span>
                    </>
                  ) : (
                    <>
                      Entrega mínima sugerida: {parametros.anticipoMinimoPorcentaje}% del
                      valor.
                    </>
                  )}
                </p>

                {anticipoExcedido && (
                  <p className="mt-2 text-sm font-medium text-amarillo" role="status">
                    La entrega supera el valor de la unidad: no queda saldo a financiar.
                  </p>
                )}
                {!anticipoExcedido && anticipoInsuficiente && (
                  <p className="mt-2 text-sm font-medium text-amarillo" role="status">
                    Con menos del {parametros.anticipoMinimoPorcentaje}% la operación queda
                    sujeta a evaluación del equipo comercial.
                  </p>
                )}
              </div>

              {selectorPlazo}

              {/* Los dos porcentajes de la tasa van juntos y en la misma fila:
                  se leen como una sola condición ("18% anual más 1% mensual"),
                  que es como se pacta. */}
              <div className="mt-6 flex flex-wrap gap-4">
                <div className="min-w-[150px] flex-1">
                  <label htmlFor={`${id}-tasa`} className="campo-label text-gris-400">
                    Tasa anual (%)
                  </label>
                  <input
                    id={`${id}-tasa`}
                    className="campo campo-oscuro dato h-11"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={200}
                    step={0.5}
                    value={tasa}
                    onFocus={seleccionarTodo}
                    onChange={(evento) => setTasa(evento.target.value)}
                  />
                </div>
                <div className="min-w-[150px] flex-1">
                  <label htmlFor={`${id}-interes`} className="campo-label text-gris-400">
                    Interés mensual adicional (%)
                  </label>
                  <input
                    id={`${id}-interes`}
                    className="campo campo-oscuro dato h-11"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={50}
                    step={0.1}
                    value={interesMensual}
                    onFocus={seleccionarTodo}
                    onChange={(evento) => setInteresMensual(evento.target.value)}
                  />
                </div>
              </div>

              {resultadoEstandar && (
                <p className="mt-3 text-sm text-gris-400">
                  Tasa efectiva mensual del cálculo:{' '}
                  <span className="dato text-white">
                    {formatearNumero(Math.round(resultadoEstandar.tasaMensual * 100) / 100)}%
                  </span>
                </p>
              )}
            </>
          ) : (
            <>
              {selectorPlazo}

              {/* Dos campos cortos, uno al lado del otro. `max-w-lg` y no
                  `max-w-md`: con 448px repartidos en dos, el rótulo más largo
                  se partía en dos líneas y desalineaba los campos entre sí. */}
              <div className="mt-6 grid gap-4 sm:max-w-lg sm:grid-cols-2">
                <div>
                  <label htmlFor={`${id}-tasa-leasing`} className="campo-label text-gris-400">
                    Tasa anual (%)
                  </label>
                  <input
                    id={`${id}-tasa-leasing`}
                    className="campo campo-oscuro dato h-11"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={200}
                    step={0.5}
                    value={tasaLeasing}
                    onFocus={seleccionarTodo}
                    onChange={(evento) => setTasaLeasing(evento.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor={`${id}-aumento`} className="campo-label text-gris-400">
                    Aumento mensual (%)
                  </label>
                  <input
                    id={`${id}-aumento`}
                    className="campo campo-oscuro dato h-11"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={100}
                    step={0.25}
                    value={aumentoMensual}
                    onFocus={seleccionarTodo}
                    onChange={(evento) => setAumentoMensual(evento.target.value)}
                    aria-describedby={`${id}-aumento-ayuda`}
                  />
                </div>
                <p id={`${id}-aumento-ayuda`} className="text-sm text-gris-400 sm:col-span-2">
                  Las cuotas no son fijas: arrancan en un valor y suben ese
                  porcentaje todos los meses.
                </p>
              </div>

              <p className="mt-6 max-w-sm text-sm leading-relaxed text-gris-400">
                En leasing pagás las cuotas —cheque o dólares— durante el plazo que elijas y
                al final ejercés la compra con un pago del{' '}
                <span className="dato text-white">
                  {formatearNumero(parametros.pagoFinalLeasingPorcentaje)}%
                </span>
                .
              </p>
            </>
          )}
        </form>

        {/* Panel de resultado: un escalón más claro que el de los campos, para
            que se lea como la salida y no como otro bloque de formulario. */}
        <div className="flex flex-col border-t border-negro-800 bg-negro-900 p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
          <p className="etiqueta text-amarillo">Resultado estimado</p>

          {esEstandar ? (
            !resultadoEstandar || resultadoEstandar.montoAFinanciar <= 0 ? (
              /* my-auto: sin resultado el panel queda vacío, y el mensaje pegado
                 arriba deja un hueco raro. Centrado se lee como un estado, no
                 como contenido faltante. */
              <p className="my-auto max-w-xs text-base leading-relaxed text-gris-300">
                {valorNum > 0 && resultadoEstandar
                  ? 'No queda saldo a financiar con esa entrega inicial.'
                  : 'Cargá el valor de la unidad en dólares para ver el monto a financiar y una cuota aproximada.'}
              </p>
            ) : (
              <>
                <div className="mt-6">
                  <p className="rotulo-dato text-gris-400">Cuota aproximada</p>
                  {/**
                   * La cuota es el número por el que se abrió el simulador, y el
                   * único de esta pantalla que se mueve: recorre desde el valor
                   * anterior hasta el nuevo en 400ms cada vez que se cambia un
                   * dato. Es lo que conecta "toqué 40%" con "la cuota bajó".
                   *
                   * El resto de la columna se actualiza sin animación: si se
                   * movieran todos, no se movería ninguno.
                   */}
                  <p className="dato mt-2 text-4xl font-medium text-amarillo sm:text-5xl">
                    <NumeroAnimado
                      valor={Math.round(resultadoEstandar.cuotaMensual)}
                      formato="precio"
                      duracion={400}
                      desdeViewport
                    />
                  </p>
                  <p className="mt-3 text-sm text-gris-400">
                    <span className="dato">{resultadoEstandar.plazo}</span> cuotas · tasa{' '}
                    <span className="dato">
                      {formatearNumero(resultadoEstandar.tasaAnual)}%
                    </span>{' '}
                    anual +{' '}
                    <span className="dato">
                      {formatearNumero(resultadoEstandar.interesMensualAdicional)}%
                    </span>{' '}
                    mensual
                  </p>
                </div>

                <dl className="mt-8 space-y-3 border-t border-negro-800 pt-6">
                  {[
                    { t: 'Valor en pesos', v: resultadoEstandar.valorPesos },
                    { t: 'Entrega inicial', v: resultadoEstandar.anticipoPesos },
                    { t: 'Monto a financiar', v: resultadoEstandar.montoAFinanciar },
                    { t: 'Total a pagar', v: resultadoEstandar.totalAPagar },
                    { t: 'Costo financiero', v: resultadoEstandar.costoFinanciero },
                  ].map((fila) => (
                    <div key={fila.t} className="flex items-baseline justify-between gap-4">
                      <dt className="text-sm text-gris-400">{fila.t}</dt>
                      <dd className="dato-columna text-base font-medium text-white">
                        {formatearPrecio(Math.round(fila.v))}
                      </dd>
                    </div>
                  ))}
                </dl>

                <a
                  href={linkConsultaFinanciacion(resultadoEstandar, unidad)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="centrado-optico mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded bg-rojo text-sm font-medium text-white transition-colors duration-rapido hover:bg-rojo-700"
                >
                  <IconoWhatsapp className="h-4 w-4" />
                  Consultar con un asesor
                </a>
              </>
            )
          ) : !resultadoLeasing ? (
            <p className="my-auto max-w-xs text-base leading-relaxed text-gris-300">
              Cargá el valor de la unidad en dólares para ver la cuota del leasing y el pago
              final.
            </p>
          ) : (
            <>
              <div className="mt-6">
                <p className="rotulo-dato text-gris-400">Primera cuota</p>
                <p className="dato mt-2 text-4xl font-medium text-amarillo sm:text-5xl">
                  <NumeroAnimado
                    valor={Math.round(resultadoLeasing.primeraCuota)}
                    formato="precio"
                    duracion={400}
                    desdeViewport
                  />
                </p>
                {/* Las cuotas se ajustan mes a mes: dar un único "valor de
                    cuota" sería afirmar algo que la fórmula no dice. Se muestra
                    la punta de arriba al lado de la de abajo. */}
                <p className="mt-3 text-sm text-gris-400">
                  <span className="dato">{resultadoLeasing.plazo}</span> cuotas · subiendo{' '}
                  <span className="dato">
                    {formatearPorcentaje(resultadoLeasing.aumentoMensual)}%
                  </span>{' '}
                  por mes, la última sale{' '}
                  <span className="dato text-white">
                    {formatearPrecio(Math.round(resultadoLeasing.ultimaCuota))}
                  </span>
                </p>
                {/* EL CANON VA ACÁ ARRIBA Y NO EN LA LISTA DEL PIE.
                    Es el primer desembolso real: quien simula quiere saber
                    cuánto pone el día que firma, y para una 0 km no es una
                    cuota sino tres. Enterarse de eso al final, entre los
                    totales, es enterarse tarde. */}
                <p className="mt-2 text-sm text-gris-400">
                  Canon inicial:{' '}
                  <span className="dato text-white">
                    {formatearPrecio(Math.round(resultadoLeasing.canonInicial))}
                  </span>{' '}
                  ({resultadoLeasing.cuotasDeCanon}{' '}
                  {resultadoLeasing.cuotasDeCanon === 1 ? 'cuota' : 'cuotas'}
                  {resultadoLeasing.cuotasDeCanon === 3 ? ', por ser 0 km' : ''})
                </p>
              </div>

              {/* El pago final va en bloque propio y no en la lista: son dos
                  números distintos de la misma operación y el cliente tiene que
                  poder leerlos por separado, no sumarlos de memoria. */}
              <div className="mt-8 rounded-sm border border-negro-700 bg-negro-950 p-5">
                <p className="rotulo-dato text-gris-400">
                  Pago final ({formatearNumero(resultadoLeasing.pagoFinalPorcentaje)}%)
                </p>
                <p className="dato mt-2 text-2xl font-medium text-white sm:text-3xl">
                  {formatearPrecio(Math.round(resultadoLeasing.pagoFinal))}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-gris-300">
                  Recién al abonar este monto final pasás a ser propietario de la unidad.
                </p>
                {/* Se muestran los dólares además de los pesos porque el 30%
                    se pacta en moneda dura: es el número que no se mueve. */}
                <p className="mt-2 text-xs leading-relaxed text-gris-400">
                  Son{' '}
                  <span className="dato">
                    {formatearUsd(Math.round(resultadoLeasing.pagoFinalUsd))}
                  </span>
                  : el {formatearNumero(resultadoLeasing.pagoFinalPorcentaje)}% del valor de
                  la unidad, sin el IVA del bien.
                </p>
              </div>

              <dl className="mt-8 space-y-3 border-t border-negro-800 pt-6">
                {[
                  { t: 'Capital financiado', v: resultadoLeasing.capitalPesos },
                  { t: 'Total de las cuotas', v: resultadoLeasing.totalCuotas },
                  { t: 'Total de la operación', v: resultadoLeasing.totalOperacion },
                ].map((fila) => (
                  <div key={fila.t} className="flex items-baseline justify-between gap-4">
                    <dt className="text-sm text-gris-400">{fila.t}</dt>
                    <dd className="dato-columna text-base font-medium text-white">
                      {formatearPrecio(Math.round(fila.v))}
                    </dd>
                  </div>
                ))}
              </dl>

              <a
                href={linkConsultaLeasing(resultadoLeasing, unidad)}
                target="_blank"
                rel="noopener noreferrer"
                className="centrado-optico mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded bg-rojo text-sm font-medium text-white transition-colors duration-rapido hover:bg-rojo-700"
              >
                <IconoWhatsapp className="h-4 w-4" />
                Consultar con un asesor
              </a>
            </>
          )}

          {/* Es el texto legal de la simulación: tiene que poder leerse, no ser
              una marca de agua. Acompaña a las dos modalidades por igual. */}
          <p className="mt-auto pt-8 text-xs leading-relaxed text-gris-400">
            {parametros.leyenda}
          </p>
        </div>
      </div>
    </div>
  );
}
