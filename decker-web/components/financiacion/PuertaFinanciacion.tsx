'use client';

import { useEffect, useId, useRef, useState } from 'react';
import CalculadoraFinanciacion from '@/components/financiacion/CalculadoraFinanciacion';
import {
  emailValido,
  guardarLead,
  leerLead,
  leerOrigen,
  normalizarCelular,
  nuevoIdDeLead,
  type LeadFinanciacion,
} from '@/lib/lead-financiacion';
import { registrarLeadFinanciacion } from '@/lib/leads';
import type { ParametrosFinanciacion, Unidad } from '@/lib/types';

/**
 * La calculadora, detrás de tres pasos: celular, email, nombre y apellido.
 *
 * Es el mismo recorrido que Kavak pone antes de "Simulá tu financiamiento", y
 * por el mismo motivo: la simulación es lo que la persona vino a buscar, y es
 * el momento en que deja sus datos con gusto. Los datos van al Google Sheet de
 * Decker (ver `lib/lead-financiacion.ts` y `/api/contacto/financiacion`).
 *
 * Decisiones:
 * - EN EL LUGAR DE LA CALCULADORA, NO EN UN MODAL. Ocupa el mismo panel negro
 *   y, al terminar, ese panel se convierte en la calculadora: la persona ve
 *   que lo que pidió apareció justo donde estaba completando. La columna de la
 *   derecha ya muestra el hueco de la cuota, tapado, para que se sepa qué se
 *   destraba.
 * - UN DATO POR PASO, como Kavak. Tres pantallas con un campo se completan más
 *   que una con cuatro: cada una se responde sin pensar.
 * - El celular primero: es el dato que más vale para comercial. Si alguien
 *   abandona en el paso 2, igual no queda nada —el lead se manda al final—,
 *   pero el orden pone el compromiso más chico arriba.
 * - Sin verificación por SMS (ver `lib/lead-financiacion.ts`).
 */

type Paso = 1 | 2 | 3;

export default function PuertaFinanciacion({
  parametros,
  unidad,
}: {
  parametros: ParametrosFinanciacion;
  unidad?: Unidad;
}) {
  /**
   * `undefined` mientras no se leyó el navegador. El servidor no sabe si esta
   * persona ya dejó sus datos, así que la primera pintura es siempre la
   * puerta; un instante después, si estaba guardado, se abre sola.
   */
  const [lead, setLead] = useState<LeadFinanciacion | null | undefined>(undefined);

  useEffect(() => {
    setLead(leerLead());
  }, []);

  if (lead) {
    return <CalculadoraFinanciacion parametros={parametros} unidad={unidad} lead={lead} />;
  }

  return <Pasos unidad={unidad} alTerminar={setLead} />;
}

function Pasos({
  unidad,
  alTerminar,
}: {
  unidad?: Unidad;
  alTerminar: (lead: LeadFinanciacion) => void;
}) {
  const id = useId();
  const [paso, setPaso] = useState<Paso>(1);
  const [celular, setCelular] = useState('');
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [aceptaWhatsapp, setAceptaWhatsapp] = useState(false);
  const [trampa, setTrampa] = useState('');
  /** El error se muestra recién cuando intentó avanzar, no mientras tipea. */
  const [intento, setIntento] = useState(false);

  const primerCampo = useRef<HTMLInputElement>(null);
  const yaInteractuo = useRef(false);

  // Al cambiar de paso, el foco va al campo nuevo. No en el primer render:
  // enfocar al cargar la página la scrollearía hasta acá.
  useEffect(() => {
    if (yaInteractuo.current) primerCampo.current?.focus();
  }, [paso]);

  const celularNormalizado = normalizarCelular(celular);
  const valido =
    paso === 1
      ? celularNormalizado !== null
      : paso === 2
        ? emailValido(email)
        : nombre.trim().length > 0 && apellido.trim().length > 0;

  const avanzar = (evento: React.FormEvent) => {
    evento.preventDefault();
    yaInteractuo.current = true;
    if (!valido) {
      setIntento(true);
      return;
    }
    setIntento(false);
    if (paso < 3) {
      setPaso((paso + 1) as Paso);
      return;
    }

    const lead: LeadFinanciacion = {
      id: nuevoIdDeLead(),
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      celular: celularNormalizado ?? '',
      email: email.trim(),
      aceptaWhatsapp,
    };
    registrarLeadFinanciacion({
      ...lead,
      unidad: unidad ? { slug: unidad.slug, nombre: unidad.nombre } : undefined,
      pagina: window.location.pathname,
      origen: leerOrigen(),
      web: trampa,
    });
    guardarLead(lead);
    alTerminar(lead);
  };

  const volver = () => {
    yaInteractuo.current = true;
    setIntento(false);
    setPaso((paso - 1) as Paso);
  };

  const titulo =
    paso === 1
      ? 'Encontrá el mejor plan para vos'
      : paso === 2
        ? '¿Cuál es tu email?'
        : '¿Cómo te llamás?';
  const bajada =
    paso === 1
      ? 'Dejanos tu celular y descubrí las opciones de financiación disponibles.'
      : paso === 2
        ? 'Para que un asesor pueda mandarte la propuesta por escrito.'
        : 'Es el último paso. Después ves la cuota al instante.';

  return (
    <div className="oscuro overflow-hidden rounded-lg bg-negro-950 shadow-nivel-3">
      <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
        <form
          noValidate
          onSubmit={avanzar}
          aria-labelledby={`${id}-titulo`}
          className="p-6 sm:p-8 lg:p-10"
        >
          {/* Progreso: tres tramos, el amarillo avanza. Lo leen los lectores
              de pantalla por el texto, no por las barras. */}
          <p className="etiqueta text-gris-400">
            Paso <span className="dato">{paso}</span> de <span className="dato">3</span>
          </p>
          <div aria-hidden="true" className="mt-3 grid grid-cols-3 gap-1.5">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={`h-1 rounded-full transition-colors duration-rapido ${
                  n <= paso ? 'bg-amarillo' : 'bg-negro-800'
                }`}
              />
            ))}
          </div>

          <h3
            id={`${id}-titulo`}
            className="mt-8 font-display text-2xl font-extrabold text-white sm:text-3xl"
          >
            {titulo}
          </h3>
          <p className="mt-2 max-w-md text-base text-gris-300">{bajada}</p>

          <div className="mt-8 max-w-md">
            {paso === 1 && (
              <>
                <label htmlFor={`${id}-celular`} className="campo-label text-gris-400">
                  Celular
                </label>
                <div className="flex gap-2">
                  {/* El prefijo es fijo: el sitio vende en Argentina. Va aparte
                      del campo para que nadie lo tipee dos veces. */}
                  <span className="dato inline-flex h-14 shrink-0 items-center rounded-sm bg-negro-800 px-4 text-lg text-gris-300">
                    +54
                  </span>
                  <input
                    ref={primerCampo}
                    id={`${id}-celular`}
                    className="campo campo-oscuro dato h-14 text-lg"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder="291 400 0000"
                    value={celular}
                    onChange={(evento) => setCelular(evento.target.value)}
                    aria-invalid={intento && !valido}
                    aria-describedby={`${id}-celular-ayuda`}
                  />
                </div>
                <p
                  id={`${id}-celular-ayuda`}
                  className={`mt-3 text-sm ${intento && !valido ? 'font-medium text-amarillo' : 'text-gris-400'}`}
                  role={intento && !valido ? 'alert' : undefined}
                >
                  {intento && !valido
                    ? 'Revisá el número: código de área sin 0 y número sin 15, 10 dígitos en total.'
                    : 'Código de área sin 0 y número sin 15.'}
                </p>
              </>
            )}

            {paso === 2 && (
              <>
                <label htmlFor={`${id}-email`} className="campo-label text-gris-400">
                  Email
                </label>
                <input
                  ref={primerCampo}
                  id={`${id}-email`}
                  className="campo campo-oscuro h-14 text-lg"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="nombre@empresa.com"
                  value={email}
                  onChange={(evento) => setEmail(evento.target.value)}
                  aria-invalid={intento && !valido}
                  aria-describedby={intento && !valido ? `${id}-email-error` : undefined}
                />
                {intento && !valido && (
                  <p
                    id={`${id}-email-error`}
                    role="alert"
                    className="mt-3 text-sm font-medium text-amarillo"
                  >
                    Revisá el email: tiene que tener la forma nombre@dominio.com.
                  </p>
                )}
              </>
            )}

            {paso === 3 && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`${id}-nombre`} className="campo-label text-gris-400">
                      Nombre
                    </label>
                    <input
                      ref={primerCampo}
                      id={`${id}-nombre`}
                      className="campo campo-oscuro h-14 text-lg"
                      autoComplete="given-name"
                      value={nombre}
                      onChange={(evento) => setNombre(evento.target.value)}
                      aria-invalid={intento && !nombre.trim()}
                    />
                  </div>
                  <div>
                    <label htmlFor={`${id}-apellido`} className="campo-label text-gris-400">
                      Apellido
                    </label>
                    <input
                      id={`${id}-apellido`}
                      className="campo campo-oscuro h-14 text-lg"
                      autoComplete="family-name"
                      value={apellido}
                      onChange={(evento) => setApellido(evento.target.value)}
                      aria-invalid={intento && !apellido.trim()}
                    />
                  </div>
                </div>
                {intento && !valido && (
                  <p role="alert" className="mt-3 text-sm font-medium text-amarillo">
                    Completá nombre y apellido.
                  </p>
                )}

                {/* Destildada por defecto: el permiso para escribirle por
                    WhatsApp tiene que darlo la persona. Es lo que Meta pide
                    para los mensajes automáticos el día que se conecten. */}
                <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm text-gris-300">
                  <input
                    type="checkbox"
                    checked={aceptaWhatsapp}
                    onChange={(evento) => setAceptaWhatsapp(evento.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-amarillo"
                  />
                  Acepto que Decker me contacte por WhatsApp con información sobre esta
                  consulta.
                </label>
              </>
            )}

            {/* Campo trampa. Fuera de pantalla y fuera del orden de tabulación:
                una persona no lo ve ni lo alcanza. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
              <label>
                Sitio web
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={trampa}
                  onChange={(evento) => setTrampa(evento.target.value)}
                />
              </label>
            </div>

            <button
              type="submit"
              // No se deshabilita: un botón gris no explica qué falta. Al
              // tocarlo con el dato mal, aparece el porqué.
              className={`centrado-optico mt-8 inline-flex h-14 w-full items-center justify-center rounded text-md font-medium transition-colors duration-rapido ${
                valido
                  ? 'bg-rojo text-white hover:bg-rojo-700'
                  : 'bg-negro-800 text-gris-300 hover:bg-negro-700'
              }`}
            >
              {paso === 3 ? 'Ver mi financiación' : 'Continuar'}
            </button>

            {paso > 1 && (
              <button
                type="button"
                onClick={volver}
                className="mt-3 inline-flex h-11 w-full items-center justify-center text-sm font-medium text-gris-400 transition-colors duration-rapido hover:text-white"
              >
                Volver
              </button>
            )}

            <p className="mt-6 text-xs leading-relaxed text-gris-400">
              Tus datos se usan sólo para que un asesor de Decker te contacte por esta
              consulta.
            </p>
          </div>
        </form>

        {/* Lo que se destraba, tapado. Mismo panel que el resultado de la
            calculadora: al terminar, este hueco es donde aparece la cuota. */}
        <div className="flex flex-col border-t border-negro-800 bg-negro-900 p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
          <p className="etiqueta text-amarillo">Resultado estimado</p>
          {unidad && <p className="mt-3 text-sm text-gris-300">{unidad.nombre}</p>}

          <div className="mt-6" aria-hidden="true">
            <p className="rotulo-dato text-gris-400">Cuota aproximada</p>
            <p className="dato mt-2 select-none text-4xl font-medium text-amarillo blur-md sm:text-5xl">
              $ 1.234.567
            </p>
          </div>

          <dl className="mt-8 space-y-3 border-t border-negro-800 pt-6" aria-hidden="true">
            {['Monto a financiar', 'Total a pagar', 'Costo financiero'].map((rotulo) => (
              <div key={rotulo} className="flex items-baseline justify-between gap-4">
                <dt className="text-sm text-gris-400">{rotulo}</dt>
                <dd className="h-4 w-28 rounded-sm bg-negro-800" />
              </div>
            ))}
          </dl>

          <p className="mt-auto pt-8 text-sm leading-relaxed text-gris-300">
            Completá tus datos y simulá financiación estándar o leasing, con la cuota al
            instante y el plan listo para mandarle a un asesor.
          </p>
        </div>
      </div>
    </div>
  );
}
