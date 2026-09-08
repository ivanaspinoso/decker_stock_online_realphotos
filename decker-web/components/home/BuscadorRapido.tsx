'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { IconoBuscar, IconoCerrar, IconoFlecha } from '@/components/ui/Iconos';
import { normalizar } from '@/lib/filtros';
import type { IdSucursal, Sucursal, SugerenciaUnidad, TipoUnidad } from '@/lib/types';

/**
 * Buscador del hero.
 *
 * En el hero hay un disparador con forma de campo. Al activarlo se abre una
 * VENTANA sobre la página, no un desplegable debajo: el hero ocupa la pantalla
 * completa y un panel que crece hacia abajo obliga a scrollear justo cuando el
 * usuario está eligiendo.
 *
 * Adentro están los tres filtros del sitio —tipo, marca y sucursal— y COMBINAN
 * entre sí: no son atajos que aplican uno y salen. El texto libre es un cuarto
 * criterio que se suma a los otros tres.
 *
 * Tres cosas lo vuelven un buscador y no una lista de opciones:
 *
 * - CADA OPCIÓN DICE CUÁNTO DEJA. Al lado de "Volvo" está el número de unidades
 *   que quedarían si se lo toca, contado contra lo que YA está elegido. Las
 *   combinaciones que dan cero se deshabilitan en vez de dejarse tocar para que
 *   la lista quede vacía: el buscador no ofrece caminos sin salida.
 * - SE MANEJA CON EL TECLADO. Flechas para recorrer las unidades sugeridas,
 *   Enter para entrar a la que esté marcada, y Enter sin nada marcado para ir
 *   al catálogo con todo lo elegido. Es lo que espera cualquiera que use un
 *   buscador seguido, y sin eso hay que soltar el teclado y buscar el mouse.
 * - LO ELEGIDO SE VE DESDE AFUERA. Al cerrar, los filtros quedan escritos
 *   debajo del campo, en el hero, y se sueltan de a uno. Antes se elegía tipo y
 *   marca, se cerraba la ventana y la página no mostraba rastro: la búsqueda
 *   existía, pero no había manera de saberlo sin volver a abrir.
 *
 * Los valores de tipo y marca salen del stock real, no de una lista fija: si
 * mañana entra una marca nueva, aparece sola.
 *
 * Cierra con Escape, con click en el fondo o al elegir una unidad, y devuelve
 * el foco al disparador.
 */

/** Cuántas unidades se listan como acceso directo antes de mandar al catálogo. */
const MAX_SUGERENCIAS = 5;

interface Seleccion {
  tipo: TipoUnidad | '';
  marca: string;
  sucursalId: IdSucursal | '';
}

const SIN_FILTROS: Seleccion = { tipo: '', marca: '', sucursalId: '' };

/** Las cuatro condiciones se aplican juntas. */
function coincide(
  unidad: SugerenciaUnidad,
  seleccion: Seleccion,
  terminos: string[],
): boolean {
  if (seleccion.tipo && unidad.tipo !== seleccion.tipo) return false;
  if (seleccion.marca && unidad.marca !== seleccion.marca) return false;
  if (seleccion.sucursalId && unidad.sucursalId !== seleccion.sucursalId) return false;
  if (terminos.length === 0) return true;

  const indexable = normalizar(
    `${unidad.nombre} ${unidad.marca} ${unidad.modelo} ${unidad.tipo}`,
  );
  return terminos.every((termino) => indexable.includes(termino));
}

export default function BuscadorRapido({
  sucursales,
  sugerencias,
  valorInicial = '',
}: {
  sucursales: Sucursal[];
  sugerencias: SugerenciaUnidad[];
  valorInicial?: string;
}) {
  const router = useRouter();
  const id = useId();
  const disparador = useRef<HTMLButtonElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState(valorInicial);
  const [seleccion, setSeleccion] = useState<Seleccion>(SIN_FILTROS);

  /** Índice de la unidad marcada con las flechas. -1 = ninguna. */
  const [resaltado, setResaltado] = useState(-1);

  const consulta = texto.trim();

  const terminos = useMemo(
    () => (consulta ? normalizar(consulta).split(/\s+/).filter(Boolean) : []),
    [consulta],
  );

  const opciones = useMemo(
    () => ({
      tipos: [...new Set(sugerencias.map((u) => u.tipo))].sort(),
      marcas: [...new Set(sugerencias.map((u) => u.marca))].sort(),
    }),
    [sugerencias],
  );

  const coincidentes = useMemo(
    () => sugerencias.filter((unidad) => coincide(unidad, seleccion, terminos)),
    [sugerencias, seleccion, terminos],
  );

  const visibles = coincidentes.slice(0, MAX_SUGERENCIAS);

  /**
   * Cuántas unidades quedarían si se tocara esta opción, contra TODO lo demás
   * que ya esté elegido. Es lo que convierte a los chips en una búsqueda por
   * facetas: se ve el efecto de cada opción antes de tocarla.
   */
  const contarCon = (parcial: Partial<Seleccion>) =>
    sugerencias.filter((unidad) => coincide(unidad, { ...seleccion, ...parcial }, terminos))
      .length;

  const hayFiltros = Boolean(
    consulta || seleccion.tipo || seleccion.marca || seleccion.sucursalId,
  );

  /** Lo elegido, en palabras, para mostrarlo afuera de la ventana. */
  const activos = [
    seleccion.tipo && { clave: 'tipo', texto: seleccion.tipo, quitar: { tipo: '' as const } },
    seleccion.marca && { clave: 'marca', texto: seleccion.marca, quitar: { marca: '' } },
    seleccion.sucursalId && {
      clave: 'sucursal',
      texto: sucursales.find((s) => s.id === seleccion.sucursalId)?.nombre ?? '',
      quitar: { sucursalId: '' as const },
    },
  ].filter(Boolean) as { clave: string; texto: string; quitar: Partial<Seleccion> }[];

  const href = useMemo(() => {
    const params = new URLSearchParams();
    if (consulta) params.set('q', consulta);
    if (seleccion.tipo) params.set('tipo', seleccion.tipo);
    if (seleccion.marca) params.set('marca', seleccion.marca);
    if (seleccion.sucursalId) params.set('sucursal', seleccion.sucursalId);
    const query = params.toString();
    return `/catalogo${query ? `?${query}` : ''}`;
  }, [consulta, seleccion]);

  /* Cambiar lo buscado desmarca: la unidad que estaba resaltada ya no es la
     misma fila. */
  useEffect(() => setResaltado(-1), [consulta, seleccion]);

  useEffect(() => {
    if (!abierto) return;

    /**
     * El campo se enfoca SÓLO donde hay teclado físico.
     *
     * En el teléfono, enfocarlo al abrir levantaba el teclado en el acto y se
     * comía dos tercios de la pantalla. La ventana es `fixed` y en iOS no se
     * achica con el teclado: la lista de unidades y el botón "Ver N" quedaban
     * abajo del teclado, y como el fondo está bloqueado, arrastrar no movía
     * nada. Recién al tocar en cualquier lado —lo que baja el teclado— la
     * ventana volvía a entrar y el scroll "empezaba a andar". Ese era el
     * síntoma: no fallaba el scroll, faltaba pantalla.
     *
     * Y no hace falta: en mobile lo primero que se usa acá son los chips de
     * tipo, marca y sucursal, no el tecleo. Quien quiera escribir toca el
     * campo, que es el gesto que espera de todas formas.
     */
    const conTecladoFisico =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (conTecladoFisico) campo.current?.focus();

    // La página de atrás no scrollea mientras la ventana está abierta.
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('keydown', alTeclear);

    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = overflowPrevio;
    };
  }, [abierto]);

  const cerrar = () => {
    setAbierto(false);
    disparador.current?.focus();
  };

  const irA = (destino: string) => {
    setAbierto(false);
    router.push(destino);
  };

  const limpiarTodo = () => {
    setSeleccion(SIN_FILTROS);
    setTexto('');
  };

  /** Flechas para recorrer, Enter para entrar. */
  const alTeclearEnCampo = (evento: React.KeyboardEvent<HTMLInputElement>) => {
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      if (visibles.length === 0) return;
      evento.preventDefault();
      const paso = evento.key === 'ArrowDown' ? 1 : -1;
      // Da la vuelta: desde la última, bajar vuelve al campo (-1).
      setResaltado((previo) => {
        const siguiente = previo + paso;
        if (siguiente < -1) return visibles.length - 1;
        if (siguiente >= visibles.length) return -1;
        return siguiente;
      });
      return;
    }

    if (evento.key === 'Enter') {
      evento.preventDefault();
      const marcada = visibles[resaltado];
      irA(marcada ? `/unidad/${marcada.slug}` : href);
    }
  };

  /**
   * Un grupo de opciones de selección única, cada una con lo que dejaría.
   * Volver a tocar la activa la apaga.
   */
  const grupo = <T extends string>(
    etiqueta: string,
    valores: readonly { valor: T; texto: string }[],
    actual: T | '',
    campoDeSeleccion: keyof Seleccion,
    alElegir: (valor: T | '') => void,
  ) => (
    <fieldset className="mt-5 first:mt-0">
      <legend className="etiqueta px-1 text-gris-500">{etiqueta}</legend>
      {/* h-11 = 44px: área táctil cómoda en mobile. */}
      <div className="mt-3 flex flex-wrap gap-2">
        {valores.map(({ valor, texto: rotulo }) => {
          const activo = actual === valor;
          // Siempre "cuánto deja ESTA opción", tanto si está puesta como si no.
          // Contar lo que pasaría al soltarla haría que la opción activa
          // mostrara el total del stock, que es lo contrario de lo que hace.
          const quedan = contarCon({ [campoDeSeleccion]: valor } as Partial<Seleccion>);
          // Sin resultados no se ofrece, salvo que sea la que está puesta: esa
          // tiene que poder soltarse.
          const inhabilitado = quedan === 0 && !activo;

          return (
            <button
              key={valor}
              type="button"
              aria-pressed={activo}
              disabled={inhabilitado}
              onClick={() => alElegir(activo ? '' : valor)}
              className={`centrado-optico inline-flex h-11 items-center gap-2 rounded-sm px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                activo ? 'bg-negro text-white' : 'bg-gris-100 text-negro hover:bg-gris-200'
              }`}
            >
              {rotulo}
              <span className={`dato text-xs ${activo ? 'text-gris-400' : 'text-gris-500'}`}>
                {quedan}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );

  return (
    <>
      {/* Disparador: tiene forma de campo pero es un botón. Abrir la ventana y
          después enfocar el campo real de adentro evita el doble foco y el
          teclado que aparece y desaparece en mobile. */}
      <button
        ref={disparador}
        type="button"
        onClick={() => setAbierto(true)}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        className="group flex h-14 w-full items-center gap-3 rounded-lg bg-white pl-4 pr-2 text-left shadow-nivel-2 transition-shadow duration-rapido ease-suave hover:shadow-nivel-3"
      >
        <IconoBuscar className="h-5 w-5 shrink-0 text-gris-500" aria-hidden="true" />
        <span
          className={`centrado-optico flex-1 truncate text-base ${texto ? 'text-negro' : 'text-gris-500'}`}
        >
          {texto || 'Buscá por marca o modelo'}
        </span>
        <span className="centrado-optico inline-flex h-10 shrink-0 items-center rounded bg-rojo px-4 text-sm font-medium text-white transition-colors group-hover:bg-rojo-700">
          Buscar
        </span>
      </button>

      {/* Lo elegido, escrito en el hero. Es lo único que dice, con la ventana
          cerrada, que la búsqueda tiene filtros puestos. Cada uno se suelta sin
          volver a abrir. */}
      {activos.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <p className="rotulo-dato text-gris-300">Filtrando por</p>
          {activos.map(({ clave, texto: rotulo, quitar }) => (
            <button
              key={clave}
              type="button"
              onClick={() => setSeleccion((previa) => ({ ...previa, ...quitar }))}
              className="centrado-optico inline-flex h-9 items-center gap-2 rounded-sm bg-white/10 px-3 text-sm font-medium text-white ring-1 ring-inset ring-white/25 transition-colors hover:bg-white/20"
            >
              {rotulo}
              <IconoCerrar className="h-3.5 w-3.5" />
              <span className="sr-only">Quitar este filtro</span>
            </button>
          ))}
          <button
            type="button"
            onClick={limpiarTodo}
            className="px-1 text-sm font-medium text-gris-300 underline underline-offset-4 transition-colors hover:text-white"
          >
            Limpiar
          </button>
        </div>
      )}

      {/* La ventana va en un portal al `body`. Renderizada dentro del hero
          heredaba su clase `oscuro` —que pinta el anillo de foco en amarillo
          sobre fondo negro, ilegible en una superficie blanca— y quedaba a
          merced del `overflow-hidden` y del contexto de apilado de la sección. */}
      {abierto &&
        createPortal(
          /**
           * `dvh` y no `vh`.
           *
           * `vh` mide el viewport GRANDE —la pantalla con la barra del
           * navegador escondida y sin teclado—, así que en un teléfono la
           * ventana se dimensionaba contra una altura que en ese momento no
           * existía y su mitad de abajo quedaba fuera de lo visible. `dvh`
           * sigue el alto que de verdad hay: se achica cuando sube el teclado o
           * baja la barra de direcciones, y la ventana siempre entra.
           */
          <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[6dvh] sm:pt-[12vh]">
            <div
              className="animate-velo absolute inset-0 bg-negro-950/70 backdrop-blur-sm"
              onClick={cerrar}
              aria-hidden="true"
            />

            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${id}-titulo`}
              className="animate-entrar-panel relative flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-nivel-3"
            >
              <div className="flex items-center justify-between gap-4 border-b border-gris-200 px-5 pt-4">
                <p id={`${id}-titulo`} className="etiqueta pb-4 text-rojo">
                  Encontrá la unidad ideal
                </p>
                <button
                  type="button"
                  onClick={cerrar}
                  aria-label="Cerrar buscador"
                  className="mb-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-gris-500 transition-colors duration-rapido hover:bg-gris-100 hover:text-negro"
                >
                  <IconoCerrar className="h-4 w-4" />
                </button>
              </div>

              {/**
               * El foco lo muestra LA FILA, no el input.
               *
               * El campo no tiene caja propia —es texto sobre el panel—, así que
               * el aro global le quedaba flotando alrededor: un rectángulo rojo
               * de 2px con hueco, que es exactamente la forma de un error de
               * validación. Y era el primer estado que veía cualquiera, porque
               * el campo se enfoca al abrir.
               *
               * En su lugar, la línea que ya separa esta fila del resto pasa de
               * gris a negro. Es el gesto de un campo subrayado: alcanza para
               * decir "estás escribiendo acá", no envuelve nada y no puede
               * confundirse con un aviso. El grosor es 2px SIEMPRE y sólo cambia
               * el color, así que al enfocar no se mueve un píxel.
               */}
              <form
                role="search"
                className="flex items-center gap-3 border-b-2 border-gris-200 px-5 py-3 transition-colors duration-rapido focus-within:border-negro"
                onSubmit={(evento) => {
                  evento.preventDefault();
                  irA(href);
                }}
              >
                <label htmlFor={`${id}-q`} className="sr-only">
                  Buscá por marca o modelo
                </label>
                <IconoBuscar className="h-5 w-5 shrink-0 text-gris-500" aria-hidden="true" />
                <input
                  ref={campo}
                  id={`${id}-q`}
                  type="text"
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={visibles.length > 0}
                  aria-controls={`${id}-unidades`}
                  aria-activedescendant={
                    resaltado >= 0 ? `${id}-unidad-${resaltado}` : undefined
                  }
                  /* `focus-visible:outline-none`: el estado lo cuenta la línea
                     de abajo (ver el comentario del `<form>`), no un aro. */
                  className="h-11 flex-1 border-0 bg-transparent text-md text-negro outline-none focus-visible:outline-none placeholder:text-gris-500"
                  placeholder="Buscá por marca o modelo"
                  value={texto}
                  onChange={(evento) => setTexto(evento.target.value)}
                  onKeyDown={alTeclearEnCampo}
                />
                {texto && (
                  <button
                    type="button"
                    onClick={() => setTexto('')}
                    aria-label="Borrar búsqueda"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-gris-500 transition-colors duration-rapido hover:bg-gris-100 hover:text-negro"
                  >
                    <IconoCerrar className="h-4 w-4" />
                  </button>
                )}
              </form>

              {/* `min-h-0`: un hijo de flex no se achica por debajo de su
                  contenido salvo que se le diga, y sin eso el bloque no
                  scrollea —se desborda y lo recorta el `overflow-hidden` del
                  panel—. `overscroll-contain`: al llegar al final, el arrastre
                  no se le pasa a la página de atrás. */}
              <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-5">
                {/* Accesos directos a unidades concretas. Sólo cuando hay texto:
                    sin texto la lista serían las primeras del stock, que no
                    responden a ninguna intención. */}
                {consulta && visibles.length > 0 && (
                  <div className="mb-6">
                    <p className="etiqueta px-1 text-gris-500">Unidades</p>
                    <ul id={`${id}-unidades`} role="listbox" className="mt-2">
                      {visibles.map((unidad, indice) => {
                        const marcada = indice === resaltado;
                        return (
                          <li
                            key={unidad.slug}
                            id={`${id}-unidad-${indice}`}
                            role="option"
                            aria-selected={marcada}
                          >
                            <button
                              type="button"
                              tabIndex={-1}
                              onMouseEnter={() => setResaltado(indice)}
                              onClick={() => irA(`/unidad/${unidad.slug}`)}
                              /* El resaltado del teclado y el del mouse son el
                                 MISMO: si fueran dos, con el cursor apoyado en
                                 una fila y las flechas en otra habría dos filas
                                 pintadas y ninguna sería la que abre Enter. */
                              className={`flex w-full items-center justify-between gap-3 rounded-sm px-2 py-3 text-left transition-colors ${
                                marcada ? 'bg-gris-100' : ''
                              }`}
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-base font-medium text-negro">
                                  {unidad.nombre}
                                </span>
                                <span className="block truncate text-sm text-gris-500">
                                  {unidad.tipo} · {unidad.estado}
                                </span>
                              </span>
                              <IconoFlecha
                                className={`h-4 w-4 shrink-0 ${marcada ? 'text-negro' : 'text-gris-300'}`}
                              />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {consulta && coincidentes.length === 0 && (
                  <p className="mb-6 rounded-sm bg-gris-100 px-4 py-3 text-sm text-gris-600">
                    Ninguna unidad coincide con «{consulta}». Probá con la marca sola, o soltá
                    algún filtro de abajo.
                  </p>
                )}

                {grupo(
                  'Tipo',
                  opciones.tipos.map((valor) => ({ valor, texto: valor })),
                  seleccion.tipo,
                  'tipo',
                  (valor) => setSeleccion((previa) => ({ ...previa, tipo: valor })),
                )}

                {grupo(
                  'Marca',
                  opciones.marcas.map((valor) => ({ valor, texto: valor })),
                  seleccion.marca,
                  'marca',
                  (valor) => setSeleccion((previa) => ({ ...previa, marca: valor })),
                )}

                {grupo(
                  'Sucursal',
                  sucursales.map((s) => ({ valor: s.id, texto: s.nombre })),
                  seleccion.sucursalId,
                  'sucursalId',
                  (valor) => setSeleccion((previa) => ({ ...previa, sucursalId: valor })),
                )}
              </div>

              {/* Pie fijo: el conteo se actualiza con cada elección, así el
                  efecto de combinar filtros se ve antes de navegar. */}
              <div className="flex items-center justify-between gap-4 border-t border-gris-200 px-5 py-4">
                <div className="min-w-0 text-sm text-gris-500">
                  <span className="dato font-medium text-negro">{coincidentes.length}</span>{' '}
                  {coincidentes.length === 1 ? 'unidad coincide' : 'unidades coinciden'}
                  {hayFiltros && (
                    <button
                      type="button"
                      onClick={() => {
                        limpiarTodo();
                        campo.current?.focus();
                      }}
                      className="ml-3 font-medium text-rojo transition-opacity hover:opacity-70"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => irA(href)}
                  className="centrado-optico inline-flex h-11 shrink-0 items-center rounded bg-rojo px-6 text-sm font-medium text-white transition-colors hover:bg-rojo-700 active:translate-y-px"
                >
                  {coincidentes.length > 0 ? `Ver ${coincidentes.length}` : 'Ver stock'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
