'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CamposFiltros, hayFiltrosPuestos } from '@/components/catalogo/PanelFiltros';
import { IconoCerrar, IconoFiltros } from '@/components/ui/Iconos';
import type { FiltrosCatalogo, OpcionesCatalogo, Sucursal } from '@/lib/types';

/**
 * Los filtros en mobile: un botón y una hoja que sube desde abajo.
 *
 * Es el mismo formulario que la columna de desktop (`CamposFiltros`) en otro
 * envase; no hay lógica de filtrado duplicada acá adentro. Lo único propio es
 * el envase y sus dos reglas:
 *
 * 1. El botón dice CUÁNTOS filtros hay puestos. Un embudo solo es un ícono
 *    mudo: no se sabe si el listado que se está mirando es el stock entero o el
 *    recorte de otra pantalla. El número es lo que hace que esconderlos no sea
 *    esconder información.
 * 2. Se filtra en vivo, con la hoja abierta. El pie lleva la cuenta viva y el
 *    botón de cerrar dice "Ver N unidades": la decisión de sumar otro filtro se
 *    toma viendo a cuántas unidades lleva, no después de cerrar y contar.
 *
 * No hay "Aplicar": el estado ya está aplicado mientras se toca. Cerrar es
 * volver al listado, y por eso también cierra el velo y la tecla Escape.
 */
export default function HojaFiltros({
  filtros,
  opciones,
  sucursales,
  onCambio,
  onLimpiar,
  resultados,
  activos,
}: {
  filtros: FiltrosCatalogo;
  opciones: OpcionesCatalogo;
  sucursales: Sucursal[];
  onCambio: (parcial: Partial<FiltrosCatalogo>) => void;
  onLimpiar: () => void;
  resultados: number;
  /** Cuántos filtros hay puestos, para el rótulo del botón. */
  activos: number;
}) {
  const [abierta, setAbierta] = useState(false);
  const hoja = useRef<HTMLDivElement>(null);
  const disparador = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierta) return;

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    /* El foco entra a la hoja: sin esto el teclado y el lector de pantalla
       siguen parados en el listado de atrás, que está tapado. */
    hoja.current?.focus();

    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAbierta(false);
    };
    document.addEventListener('keydown', alTeclear);

    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = overflowPrevio;
      // Al cerrar, el foco vuelve al botón que abrió: no queda suelto al inicio.
      disparador.current?.focus();
    };
  }, [abierta]);

  return (
    <>
      <button
        ref={disparador}
        type="button"
        onClick={() => setAbierta(true)}
        aria-expanded={abierta}
        aria-haspopup="dialog"
        className="centrado-optico inline-flex h-11 shrink-0 items-center gap-2 rounded-sm border border-gris-200 bg-white px-4 text-sm font-medium text-negro shadow-nivel-1 transition-colors duration-rapido hover:border-gris-300 lg:hidden"
      >
        <IconoFiltros className="h-4 w-4 text-gris-500" />
        Filtros
        {/* El contador va como pastilla y no entre paréntesis en el texto: es
            un estado del listado, no parte del nombre del botón. En rojo,
            porque es lo mismo que dicen los chips de arriba. */}
        {activos > 0 && (
          <span className="dato inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rojo px-1.5 text-xs font-medium text-white">
            {activos}
          </span>
        )}
        <span className="sr-only">
          {activos === 0
            ? 'sin filtros puestos'
            : `${activos} ${activos === 1 ? 'filtro puesto' : 'filtros puestos'}`}
        </span>
      </button>

      {abierta &&
        createPortal(
          /* z por encima de la barra del comparador (z-40): con las dos
             visibles, la hoja es la que está adelante. */
          <div className="fixed inset-0 z-[70] flex items-end justify-center">
            <div
              className="animate-velo absolute inset-0 bg-negro-950/70 backdrop-blur-sm"
              onClick={() => setAbierta(false)}
              aria-hidden="true"
            />

            <div
              ref={hoja}
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-hoja-filtros"
              tabIndex={-1}
              className="animate-entrar-panel relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-lg bg-white shadow-nivel-3 outline-none"
            >
              <div className="flex items-center justify-between gap-4 border-b border-gris-200 px-5 py-4">
                <h2 id="titulo-hoja-filtros" className="titulo-tarjeta">
                  Filtros
                </h2>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={onLimpiar}
                    disabled={!hayFiltrosPuestos(filtros)}
                    className="px-2 py-1 text-sm font-medium text-rojo transition-opacity hover:opacity-70 disabled:pointer-events-none disabled:text-gris-300"
                  >
                    Limpiar
                  </button>
                  <button
                    type="button"
                    onClick={() => setAbierta(false)}
                    aria-label="Cerrar filtros"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-gris-500 transition-colors duration-rapido hover:bg-gris-100 hover:text-negro"
                  >
                    <IconoCerrar className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Scrollea la hoja, no la página de atrás. */}
              <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-5">
                <CamposFiltros
                  filtros={filtros}
                  opciones={opciones}
                  sucursales={sucursales}
                  onCambio={onCambio}
                  idPrefijo="hoja-filtro"
                />
              </div>

              {/* El pie queda fijo abajo mientras el formulario scrollea: la
                  cuenta viva tiene que verse tocando el último campo, que es
                  cuando se decide si el filtro sirvió. */}
              <div className="border-t border-gris-200 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
                <button
                  type="button"
                  onClick={() => setAbierta(false)}
                  className="centrado-optico inline-flex h-12 w-full items-center justify-center rounded bg-rojo px-6 text-sm font-medium text-white transition-colors duration-rapido hover:bg-rojo-700"
                >
                  {resultados === 0
                    ? 'Sin resultados: probá quitar un filtro'
                    : `Ver ${resultados} ${resultados === 1 ? 'unidad' : 'unidades'}`}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
