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
 * Adentro están los tres filtros del sitio original —tipo, marca y sucursal—
 * y COMBINAN entre sí: no son atajos que aplican uno y salen. Cada elección
 * recalcula en vivo cuántas unidades quedan, así el usuario ve el efecto antes
 * de navegar. El texto libre es un cuarto criterio que se suma a los otros
 * tres.
 *
 * Los valores de tipo y marca salen del stock real, no de una lista fija: si
 * mañana entra una marca nueva, aparece sola.
 *
 * Cierra con Escape, con click en el fondo o al elegir una unidad, y devuelve
 * el foco al disparador.
 */

/** Cuántas unidades se listan como acceso directo antes de mandar al catálogo. */
const MAX_SUGERENCIAS = 4;

interface Seleccion {
  tipo: TipoUnidad | '';
  marca: string;
  sucursalId: IdSucursal | '';
}

const SIN_FILTROS: Seleccion = { tipo: '', marca: '', sucursalId: '' };

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

  const consulta = texto.trim();

  const opciones = useMemo(
    () => ({
      tipos: [...new Set(sugerencias.map((u) => u.tipo))].sort(),
      marcas: [...new Set(sugerencias.map((u) => u.marca))].sort(),
    }),
    [sugerencias],
  );

  /** Las cuatro condiciones se aplican juntas. */
  const coincidentes = useMemo(() => {
    const terminos = consulta ? normalizar(consulta).split(/\s+/).filter(Boolean) : [];

    return sugerencias.filter((unidad) => {
      if (seleccion.tipo && unidad.tipo !== seleccion.tipo) return false;
      if (seleccion.marca && unidad.marca !== seleccion.marca) return false;
      if (seleccion.sucursalId && unidad.sucursalId !== seleccion.sucursalId) return false;
      if (terminos.length === 0) return true;

      const indexable = normalizar(
        `${unidad.nombre} ${unidad.marca} ${unidad.modelo} ${unidad.tipo}`,
      );
      return terminos.every((termino) => indexable.includes(termino));
    });
  }, [sugerencias, seleccion, consulta]);

  const hayFiltros = Boolean(
    consulta || seleccion.tipo || seleccion.marca || seleccion.sucursalId,
  );

  const href = useMemo(() => {
    const params = new URLSearchParams();
    if (consulta) params.set('q', consulta);
    if (seleccion.tipo) params.set('tipo', seleccion.tipo);
    if (seleccion.marca) params.set('marca', seleccion.marca);
    if (seleccion.sucursalId) params.set('sucursal', seleccion.sucursalId);
    const query = params.toString();
    return `/catalogo${query ? `?${query}` : ''}`;
  }, [consulta, seleccion]);

  useEffect(() => {
    if (!abierto) return;

    campo.current?.focus();

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

  /** Un grupo de chips de selección única: volver a tocar el activo lo apaga. */
  const grupo = <T extends string>(
    etiqueta: string,
    valores: readonly { valor: T; texto: string }[],
    actual: T | '',
    alElegir: (valor: T | '') => void,
  ) => (
    <fieldset className="mt-5 first:mt-0">
      <legend className="etiqueta px-1 text-gris-400">{etiqueta}</legend>
      {/* h-11 = 44px: área táctil cómoda en mobile. */}
      <div className="mt-3 flex flex-wrap gap-2">
        {valores.map(({ valor, texto: rotulo }) => {
          const activo = actual === valor;
          return (
            <button
              key={valor}
              type="button"
              aria-pressed={activo}
              onClick={() => alElegir(activo ? '' : valor)}
              className={`inline-flex h-11 items-center rounded-sm px-4 text-[14px] font-semibold transition-colors ${
                activo
                  ? 'bg-negro text-white'
                  : 'bg-gris-100 text-negro hover:bg-gris-200'
              }`}
            >
              {rotulo}
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
        className="group flex h-14 w-full items-center gap-3 rounded-lg bg-white pl-4 pr-2 text-left shadow-flotante transition-shadow hover:shadow-tarjeta-hover"
      >
        <IconoBuscar className="h-5 w-5 shrink-0 text-gris-400" aria-hidden="true" />
        <span className={`flex-1 truncate text-[16px] ${texto ? 'text-negro' : 'text-gris-400'}`}>
          {texto || 'Buscá por marca o modelo'}
        </span>
        <span className="inline-flex h-10 shrink-0 items-center rounded bg-rojo px-4 text-sm font-semibold text-white transition-colors group-hover:bg-rojo-700">
          Buscar
        </span>
      </button>

      {/* La ventana va en un portal al `body`. Renderizada dentro del hero
          heredaba su clase `oscuro` —que pinta el anillo de foco en amarillo
          sobre fondo negro, ilegible en una superficie blanca— y quedaba a
          merced del `overflow-hidden` y del contexto de apilado de la sección. */}
      {abierto &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[8vh] sm:pt-[12vh]">
            <div
              className="absolute inset-0 bg-negro-950/70 backdrop-blur-sm"
              onClick={cerrar}
              aria-hidden="true"
            />

            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${id}-titulo`}
              className="animate-aparecer relative flex max-h-[84vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-flotante"
            >
              <div className="flex items-center justify-between gap-4 border-b border-gris-200 px-5 pt-4">
                <p id={`${id}-titulo`} className="etiqueta pb-4 text-rojo">
                  Encontrá la unidad ideal
                </p>
                <button
                  type="button"
                  onClick={cerrar}
                  aria-label="Cerrar buscador"
                  className="mb-3 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-gris-400 transition-colors hover:bg-gris-100 hover:text-negro"
                >
                  <IconoCerrar className="h-4 w-4" />
                </button>
              </div>

              <form
                role="search"
                className="flex items-center gap-3 border-b border-gris-200 px-5 py-3"
                onSubmit={(evento) => {
                  evento.preventDefault();
                  irA(href);
                }}
              >
                <label htmlFor={`${id}-q`} className="sr-only">
                  Buscá por marca o modelo
                </label>
                <IconoBuscar className="h-5 w-5 shrink-0 text-gris-400" aria-hidden="true" />
                <input
                  ref={campo}
                  id={`${id}-q`}
                  type="text"
                  autoComplete="off"
                  className="h-10 flex-1 border-0 bg-transparent text-[17px] text-negro outline-none placeholder:text-gris-400"
                  placeholder="Buscá por marca o modelo"
                  value={texto}
                  onChange={(evento) => setTexto(evento.target.value)}
                />
                {texto && (
                  <button
                    type="button"
                    onClick={() => setTexto('')}
                    aria-label="Borrar búsqueda"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-gris-400 transition-colors hover:bg-gris-100 hover:text-negro"
                  >
                    <IconoCerrar className="h-4 w-4" />
                  </button>
                )}
              </form>

              <div className="overflow-y-auto px-5 py-5">
                {/* Accesos directos a unidades concretas. Sólo cuando hay texto:
                    sin texto la lista serían las primeras 4 del stock, que no
                    responden a ninguna intención. */}
                {consulta && coincidentes.length > 0 && (
                  <div className="mb-6">
                    <p className="etiqueta px-1 text-gris-400">Unidades</p>
                    <ul className="mt-2">
                      {coincidentes.slice(0, MAX_SUGERENCIAS).map((unidad) => (
                        <li key={unidad.slug}>
                          <button
                            type="button"
                            onClick={() => irA(`/unidad/${unidad.slug}`)}
                            className="flex w-full items-center justify-between gap-3 rounded-sm px-2 py-3 text-left transition-colors hover:bg-gris-100"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-[15px] font-semibold text-negro">
                                {unidad.nombre}
                              </span>
                              <span className="block truncate text-[13px] text-gris-500">
                                {unidad.tipo} · {unidad.estado}
                              </span>
                            </span>
                            <IconoFlecha className="h-4 w-4 shrink-0 text-gris-300" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {grupo(
                  'Tipo',
                  opciones.tipos.map((valor) => ({ valor, texto: valor })),
                  seleccion.tipo,
                  (valor) => setSeleccion((previa) => ({ ...previa, tipo: valor })),
                )}

                {grupo(
                  'Marca',
                  opciones.marcas.map((valor) => ({ valor, texto: valor })),
                  seleccion.marca,
                  (valor) => setSeleccion((previa) => ({ ...previa, marca: valor })),
                )}

                {grupo(
                  'Sucursal',
                  sucursales.map((s) => ({ valor: s.id, texto: s.nombre })),
                  seleccion.sucursalId,
                  (valor) => setSeleccion((previa) => ({ ...previa, sucursalId: valor })),
                )}
              </div>

              {/* Pie fijo: el conteo se actualiza con cada elección, así el
                  efecto de combinar filtros se ve antes de navegar. */}
              <div className="flex items-center justify-between gap-4 border-t border-gris-200 px-5 py-4">
                <div className="min-w-0 text-[13px] text-gris-500">
                  <span className="dato font-semibold text-negro">{coincidentes.length}</span>{' '}
                  {coincidentes.length === 1 ? 'unidad coincide' : 'unidades coinciden'}
                  {hayFiltros && (
                    <button
                      type="button"
                      onClick={() => {
                        setSeleccion(SIN_FILTROS);
                        setTexto('');
                        campo.current?.focus();
                      }}
                      className="ml-3 font-semibold text-rojo transition-opacity hover:opacity-70"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => irA(href)}
                  className="inline-flex h-11 shrink-0 items-center rounded bg-rojo px-6 text-sm font-semibold text-white transition-colors hover:bg-rojo-700"
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
