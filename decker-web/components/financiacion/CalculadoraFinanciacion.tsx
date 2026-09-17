'use client';

import { useId, useMemo, useState } from 'react';
import { IconoWhatsapp } from '@/components/ui/Iconos';
import NumeroAnimado from '@/components/ui/NumeroAnimado';
import { calcularFinanciacion, calcularLeasing, cotizacionConMargen } from '@/lib/financiacion';
import { formatearNumero, formatearPrecio, formatearUsd } from '@/lib/format';
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
 * - El plazo sale de botones y no de un `<select>`: son pocas opciones, se
 *   comparan de un vistazo y se tocan en un gesto. La entrega, en cambio, se
 *   tipea: los atajos de 30/40/50% invitaban a elegir un porcentaje redondo en
 *   vez del importe que la persona realmente tiene.
 * - Los grupos de opciones —plazo, modalidad— comparten tratamiento:
 *   activo en blanco pleno, inactivo en negro-800. El amarillo acá tiene otro
 *   trabajo —es la señalética de 0 km y la cifra de la cuota—, y gastarlo en un
 *   chip le sacaba peso al número que importa.
 */

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
  /**
   * La entrega puede ser efectivo o un usado en parte de pago. Es un checkbox y
   * no dos opciones "Sí / No": la pregunta ya está en el rótulo, y un par de
   * botones para contestarla obligaría a leer tres textos donde alcanza con
   * uno. Destildado —el caso más común— el formulario queda igual que antes.
   *
   * El importe vive en un solo estado: se tilde o no, es el mismo número
   * restándose del mismo lugar. Guardarlo en dos campos separados dejaría al
   * visitante con un valor escrito que no ve y que igual entra en la cuenta.
   */
  const [entregaEsUsado, setEntregaEsUsado] = useState(false);

  const [plazo, setPlazo] = useState<number>(parametros.plazoPorDefecto);

  /**
   * LAS TASAS NO SON ESTADO, y eso es el punto.
   *
   * Fueron campos editables hasta acá, y estaba mal: la tasa la pacta Decker,
   * no la persona que está cotizando. Un visitante podía bajarla a 0 y sacar
   * una captura de una cuota que nadie le iba a dar.
   *
   * Ahora salen de `parametros`, que viene de `lib/data/financiacion.ts` —un
   * archivo, un lugar, sin panel ni build especial—. Cuando Decker pida un
   * cambio de tasa se edita ahí y sale en el próximo deploy.
   */
  const { tasaAnual, interesMensualAdicional, tasaAnualLeasing, aumentoMensualLeasing } =
    parametros;

  const valorNum = Number(valor);
  const anticipoNum = Number(anticipo);

  /**
   * Cotización de la simulación: dólar oficial venta más el margen de Decker.
   * Es la misma para las dos modalidades y se calcula una sola vez.
   */
  const cotizacion = useMemo(
    () =>
      cotizacionConMargen(parametros.dolarOficialVenta, parametros.margenDolarPesos),
    [parametros.dolarOficialVenta, parametros.margenDolarPesos],
  );

  const resultadoEstandar = useMemo(
    () =>
      calcularFinanciacion({
        valorUsd: valorNum,
        anticipoUsd: anticipoNum,
        entregaEsUsado,
        plazo,
        tasaAnual,
        interesMensualAdicional,
        cotizacion,
      }),
    [
      valorNum,
      anticipoNum,
      entregaEsUsado,
      plazo,
      tasaAnual,
      interesMensualAdicional,
      cotizacion,
    ],
  );

  const resultadoLeasing = useMemo(
    () =>
      calcularLeasing({
        valorUsd: valorNum,
        plazo,
        tasaAnual: tasaAnualLeasing,
        aumentoMensual: aumentoMensualLeasing,
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
      tasaAnualLeasing,
      aumentoMensualLeasing,
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
          className="flex flex-col p-6 sm:p-8 lg:p-10"
          onSubmit={(evento) => evento.preventDefault()}
          aria-label={
            esEstandar ? 'Simulador de financiación estándar' : 'Simulador de leasing'
          }
        >
          {campoValor}

          {esEstandar ? (
            <>
              {/* La pregunta va ARRIBA del campo, no al lado: decide qué
                  importe se está por escribir, así que tiene que leerse antes
                  de que la persona empiece a tipear. */}
              <label className="mt-6 flex items-center gap-2.5">
                <input
                  type="checkbox"
                  // h-5 y no h-4: 16px es un blanco chico para el pulgar. El
                  // `<label>` que lo envuelve ya hace clickeable todo el texto.
                  className="h-5 w-5 rounded-sm accent-rojo"
                  checked={entregaEsUsado}
                  onChange={(evento) => setEntregaEsUsado(evento.target.checked)}
                />
                <span className="text-sm text-gris-300">Entrega de usado</span>
              </label>

              <div className="mt-4">
                <label htmlFor={`${id}-anticipo`} className="campo-label text-gris-400">
                  {entregaEsUsado ? 'Entrega estimada (USD)' : 'Entrega inicial (USD)'}
                </label>

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

                {/* Con el usado tildado, el importe es una ESTIMACIÓN del
                    visitante: la aclaración va acá y no en la leyenda del pie,
                    porque es de este campo y se lee mientras se lo completa.
                    Mismo criterio que el resto del disclaimer legal. */}
                <p id={`${id}-anticipo-ayuda`} className="mt-3 text-sm text-gris-400">
                  {entregaEsUsado ? (
                    <>
                      La entrega estimada del usado queda sujeta a tasación real del equipo
                      comercial.
                    </>
                  ) : valorNum > 0 ? (
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
                    {entregaEsUsado
                      ? 'El usado supera el valor de la unidad: no queda saldo a financiar.'
                      : 'La entrega supera el valor de la unidad: no queda saldo a financiar.'}
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
            </>
          ) : (
            <>
              {selectorPlazo}

              {/* La advertencia se queda aunque el campo se haya ido: que la
                  cuota no sea fija es lo primero que hay que saber del leasing,
                  y sin el input que lo insinuaba hace más falta, no menos. El
                  cuánto lo dice el resultado, con las dos puntas. */}
              <p className="mt-6 max-w-sm text-sm leading-relaxed text-gris-400">
                Las cuotas no son fijas: arrancan en un valor y suben todos los
                meses.
              </p>

              <p className="mt-3 max-w-sm text-sm leading-relaxed text-gris-400">
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
                </div>

                <dl className="mt-8 space-y-3 border-t border-negro-800 pt-6">
                  {[
                    { t: 'Valor en pesos', v: resultadoEstandar.valorPesos },
                    {
                      t: resultadoEstandar.entregaEsUsado
                        ? 'Entrega de usado'
                        : 'Entrega inicial',
                      v: resultadoEstandar.anticipoPesos,
                    },
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
                  <span className="dato">{resultadoLeasing.plazo}</span> cuotas, subiendo mes
                  a mes: la última sale{' '}
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

        </div>

        {/* EL TEXTO LEGAL ES UNA FRANJA AL PIE Y NO UNA COLUMNA, y las dos
            cosas importan.

            Estaba adentro del panel de resultado. Cuando se sacaron los campos
            de tasa, el formulario quedó bastante más corto que el resultado y
            la columna izquierda terminaba en un bloque de negro vacío. Mudarlo
            al pie del formulario tapaba ese hueco, pero en celular —donde las
            columnas se apilan— dejaba el descargo ANTES de los números que
            descarga, que es justo al revés de como se lee.

            Cruzando las dos columnas queda último en los dos lados: al pie de
            la tarjeta en escritorio, después del resultado en celular. Y le da
            al formulario un cierre, que era el problema original.

            Tiene que poder leerse, no ser una marca de agua. */}
        <p className="border-t border-negro-800 p-6 text-xs leading-relaxed text-gris-400 sm:px-8 lg:col-span-2 lg:px-10">
          {parametros.leyenda}
        </p>
      </div>
    </div>
  );
}
