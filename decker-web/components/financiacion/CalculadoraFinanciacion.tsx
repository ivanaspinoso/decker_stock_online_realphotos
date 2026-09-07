'use client';

import { useId, useMemo, useState } from 'react';
import { IconoWhatsapp } from '@/components/ui/Iconos';
import NumeroAnimado from '@/components/ui/NumeroAnimado';
import { calcularFinanciacion } from '@/lib/financiacion';
import { formatearNumero, formatearPrecio } from '@/lib/format';
import { linkConsultaFinanciacion } from '@/lib/whatsapp';
import type { ParametrosFinanciacion, Unidad } from '@/lib/types';

/**
 * Calculadora de financiación.
 *
 * Recalcula a medida que se tipea: el usuario está tanteando escenarios, no
 * completando un trámite, así que no hay botón "calcular". Tasa, plazos y
 * anticipo mínimo salen de `lib/data/financiacion.ts` — acá no hay ningún
 * número comercial hardcodeado.
 *
 * Si viene `unidad`, arranca con su precio y el WhatsApp deriva al asesor de
 * esa sucursal en vez de al número general.
 *
 * Decisiones de diseño:
 * - Un solo panel oscuro y no dos tarjetas sueltas: entrada y resultado son un
 *   mismo objeto, y el negro le da a la cuota el peso que tiene en la decisión.
 * - Los montos se escriben con separador de miles. Un `<input type="number">`
 *   no lo permite, así que son `type="text"` con `inputMode="numeric"`: se
 *   guarda sólo el dígito y se muestra formateado. "85.000.000" es legible;
 *   "85000000" hay que contarlo con el dedo.
 * - Plazo y anticipo salen de botones y no de un `<select>`: son pocas
 *   opciones, se comparan de un vistazo y se tocan en un gesto.
 */

/** Atajos de anticipo, en porcentaje del valor de la unidad. */
const ATAJOS_ANTICIPO = [30, 40, 50];

const soloDigitos = (texto: string) => texto.replace(/\D/g, '');
const conSeparadores = (digitos: string) =>
  digitos ? formatearNumero(Number(digitos)) : '';

export default function CalculadoraFinanciacion({
  parametros,
  unidad,
}: {
  parametros: ParametrosFinanciacion;
  unidad?: Unidad;
}) {
  const id = useId();
  const precioInicial = unidad?.precio ?? null;

  const [valor, setValor] = useState<string>(precioInicial ? String(precioInicial) : '');
  const [anticipo, setAnticipo] = useState<string>(
    precioInicial
      ? String(Math.round((precioInicial * parametros.anticipoSugeridoPorcentaje) / 100))
      : '',
  );
  const [plazo, setPlazo] = useState<number>(parametros.plazoPorDefecto);
  const [tasa, setTasa] = useState<string>(String(parametros.tasaAnualPorDefecto));

  const valorNum = Number(valor);
  const anticipoNum = Number(anticipo);
  const tasaNum = Number(tasa);

  const resultado = useMemo(
    () =>
      calcularFinanciacion({
        valorUnidad: valorNum,
        anticipo: anticipoNum,
        plazo,
        tasaAnual: tasaNum,
      }),
    [valorNum, anticipoNum, plazo, tasaNum],
  );

  const anticipoMinimo = valorNum > 0 ? (valorNum * parametros.anticipoMinimoPorcentaje) / 100 : 0;
  const anticipoInsuficiente = valorNum > 0 && anticipoNum >= 0 && anticipoNum < anticipoMinimo;
  const anticipoExcedido = valorNum > 0 && anticipoNum > valorNum;
  const hayResultado = Boolean(resultado && resultado.montoAFinanciar > 0);

  /** Porcentaje del valor que representa el anticipo cargado. */
  const porcentajeAnticipo =
    valorNum > 0 && anticipoNum > 0 ? Math.round((anticipoNum / valorNum) * 100) : null;

  return (
    <div className="oscuro overflow-hidden rounded-lg bg-negro-950 shadow-nivel-3">
      <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
        <form
          className="p-6 sm:p-8 lg:p-10"
          onSubmit={(evento) => evento.preventDefault()}
          aria-label="Simulador de financiación"
        >
          <div>
            <label htmlFor={`${id}-valor`} className="campo-label text-gris-400">
              Valor de la unidad
            </label>
            <div className="relative">
              <span
                aria-hidden="true"
                className="dato pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-gris-400"
              >
                $
              </span>
              <input
                id={`${id}-valor`}
                className="campo campo-oscuro dato h-14 pl-9 text-lg"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="85.000.000"
                value={conSeparadores(valor)}
                onChange={(evento) => setValor(soloDigitos(evento.target.value))}
              />
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor={`${id}-anticipo`} className="campo-label text-gris-400">
                Entrega inicial
              </label>
              {/* La mono se queda con la cifra; "del valor" es texto y va en la
                  normal. Envolver la frase entera en ancho fijo la hace parecer
                  de otra tipografía por un número de dos dígitos. */}
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
                $
              </span>
              <input
                id={`${id}-anticipo`}
                className="campo campo-oscuro dato h-14 pl-9 text-lg"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="25.000.000"
                value={conSeparadores(anticipo)}
                onChange={(evento) => setAnticipo(soloDigitos(evento.target.value))}
                aria-describedby={`${id}-anticipo-ayuda`}
              />
            </div>

            {/* Atajos: el anticipo casi siempre se piensa en porcentaje, no en
                pesos. Se desactivan hasta que haya un valor sobre el que aplicar. */}
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
                    className={`dato inline-flex h-11 items-center rounded-sm px-4 text-sm font-medium transition-colors duration-rapido disabled:pointer-events-none disabled:opacity-30 ${
                      activo
                        ? 'bg-amarillo text-negro'
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
                    {formatearPrecio(Math.round(anticipoMinimo))}
                  </span>
                </>
              ) : (
                <>Entrega mínima sugerida: {parametros.anticipoMinimoPorcentaje}% del valor.</>
              )}
            </p>

            {anticipoExcedido && (
              <p className="mt-2 text-sm font-medium text-amarillo" role="status">
                La entrega supera el valor de la unidad: no queda saldo a financiar.
              </p>
            )}
            {!anticipoExcedido && anticipoInsuficiente && (
              <p className="mt-2 text-sm font-medium text-amarillo" role="status">
                Con menos del {parametros.anticipoMinimoPorcentaje}% la operación queda sujeta a
                evaluación del equipo comercial.
              </p>
            )}
          </div>

          <fieldset className="mt-6">
            <legend className="campo-label text-gris-400">Plazo</legend>
            <div className="flex flex-wrap gap-2">
              {parametros.plazosDisponibles.map((cuotas) => {
                const activo = plazo === cuotas;
                return (
                  <button
                    key={cuotas}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => setPlazo(cuotas)}
                    className={`inline-flex h-11 items-center rounded-sm px-4 text-sm font-medium transition-colors duration-rapido ${
                      activo
                        ? 'bg-white text-negro'
                        : 'bg-negro-800 text-gris-300 hover:bg-negro-700 hover:text-white'
                    }`}
                  >
                    {/* El ancho fijo va en el número, que es lo que tiene que
                        medir igual en los cuatro botones; el rótulo es texto. */}
                    <span className="dato">{cuotas}</span>
                    <span className="ml-1 text-2xs font-medium opacity-60">cuotas</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-6 max-w-[260px]">
            <label htmlFor={`${id}-tasa`} className="campo-label text-gris-400">
              Tasa anual orientativa (%)
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
              onChange={(evento) => setTasa(evento.target.value)}
            />
          </div>
        </form>

        {/* Panel de resultado: un escalón más claro que el de los campos, para
            que se lea como la salida y no como otro bloque de formulario. */}
        <div className="flex flex-col border-t border-negro-800 bg-negro-900 p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
          <p className="etiqueta text-amarillo">Resultado estimado</p>

          {!hayResultado || !resultado ? (
            /* my-auto: sin resultado el panel queda vacío, y el mensaje pegado
               arriba deja un hueco raro. Centrado se lee como un estado, no
               como contenido faltante. */
            <p className="my-auto max-w-xs text-base leading-relaxed text-gris-300">
              {valorNum > 0 && resultado
                ? 'No queda saldo a financiar con esa entrega inicial.'
                : 'Cargá el valor de la unidad para ver el monto a financiar y una cuota aproximada.'}
            </p>
          ) : (
            <>
              <div className="mt-6">
                <p className="rotulo-dato text-gris-400">Cuota aproximada</p>
                {/**
                 * La cuota es el número por el que se abrió el simulador, y el
                 * único de esta pantalla que se mueve: recorre desde el valor
                 * anterior hasta el nuevo en 400ms cada vez que se cambia un
                 * dato. Es lo que conecta "toqué 40%" con "la cuota bajó" sin
                 * tener que leer dos veces.
                 *
                 * El resto de la columna —monto, total, costo— se actualiza sin
                 * animación: si se movieran los cuatro, no se movería ninguno.
                 */}
                <p className="dato mt-2 text-4xl font-medium text-amarillo sm:text-5xl">
                  <NumeroAnimado
                    valor={Math.round(resultado.cuotaMensual)}
                    formato="precio"
                    duracion={400}
                    desdeViewport
                  />
                </p>
                {/* Misma regla: en ancho fijo van las dos cifras, no la frase
                    que las une. */}
                <p className="mt-3 text-sm text-gris-400">
                  <span className="dato">{resultado.plazo}</span> cuotas · tasa anual{' '}
                  <span className="dato">{formatearNumero(resultado.tasaAnual)}%</span>
                </p>
              </div>

              <dl className="mt-8 space-y-3 border-t border-negro-800 pt-6">
                {[
                  { t: 'Monto a financiar', v: resultado.montoAFinanciar },
                  { t: 'Total a pagar', v: resultado.totalAPagar },
                  { t: 'Costo financiero', v: resultado.costoFinanciero },
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
                href={linkConsultaFinanciacion(resultado, unidad)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded bg-rojo text-sm font-medium text-negro transition-colors duration-rapido hover:bg-rojo-700"
              >
                <IconoWhatsapp className="h-4 w-4" />
                Consultar con un asesor
              </a>
            </>
          )}

          {/* Es el texto legal de la simulación: tiene que poder leerse, no ser
              una marca de agua. */}
          <p className="mt-auto pt-8 text-xs leading-relaxed text-gris-400">
            {parametros.leyenda}
          </p>
        </div>
      </div>
    </div>
  );
}
