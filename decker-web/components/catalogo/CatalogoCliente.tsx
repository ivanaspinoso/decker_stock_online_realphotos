'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import PanelFiltros from '@/components/catalogo/PanelFiltros';
import UnidadGrilla from '@/components/unidades/UnidadGrilla';
import UnidadTabla from '@/components/unidades/UnidadTabla';
import { IconoGrilla, IconoLista } from '@/components/ui/Iconos';
import { cumpleFiltros, ordenarUnidades } from '@/lib/filtros';
import type {
  FiltrosCatalogo,
  OpcionesCatalogo,
  OrdenCatalogo,
  Sucursal,
  Unidad,
} from '@/lib/types';

type Vista = 'grilla' | 'lista';

const ORDENES: { valor: OrdenCatalogo; texto: string }[] = [
  { valor: 'relevancia', texto: 'Destacadas primero' },
 
  { valor: 'anio-desc', texto: 'Año: más nuevas' },
  { valor: 'km-asc', texto: 'Kilómetros: menor a mayor' },
];

/**
 * Catálogo interactivo.
 *
 * Recibe el stock completo del servidor y filtra en memoria: con este volumen
 * es instantáneo y evita un ida y vuelta por cada tecla. Cuando el stock venga
 * de una API remota, este componente pasa a pedirle a `getCatalogoCompleto` con
 * los filtros y el resto queda igual.
 *
 * Los filtros se reflejan en la URL con `replaceState` para poder compartir una
 * búsqueda, sin re-renderizar la página en cada tecleo.
 */
export default function CatalogoCliente({
  unidades,
  opciones,
  sucursales,
  filtrosIniciales,
}: {
  unidades: Unidad[];
  opciones: OpcionesCatalogo;
  sucursales: Sucursal[];
  filtrosIniciales: FiltrosCatalogo;
}) {
  const [filtros, setFiltros] = useState<FiltrosCatalogo>(filtrosIniciales);
  const [vista, setVista] = useState<Vista>('grilla');

  const resultados = useMemo(
    () =>
      ordenarUnidades(
        unidades.filter((unidad) => cumpleFiltros(unidad, filtros)),
        filtros.orden,
      ),
    [unidades, filtros],
  );

  useEffect(() => {
    const params = new URLSearchParams();
    if (filtros.busqueda?.trim()) params.set('q', filtros.busqueda.trim());
    if (filtros.tipo) params.set('tipo', filtros.tipo);
    if (filtros.marca) params.set('marca', filtros.marca);
    if (filtros.sucursalId) params.set('sucursal', filtros.sucursalId);
    if (filtros.estado) params.set('estado', filtros.estado);
    if (filtros.financiacion) params.set('financiacion', filtros.financiacion);
    if (filtros.anioDesde !== undefined) params.set('anioDesde', String(filtros.anioDesde));
    if (filtros.anioHasta !== undefined) params.set('anioHasta', String(filtros.anioHasta));
    if (filtros.precioDesde !== undefined)
      params.set('precioDesde', String(filtros.precioDesde));
    if (filtros.precioHasta !== undefined)
      params.set('precioHasta', String(filtros.precioHasta));
    if (filtros.orden && filtros.orden !== 'relevancia') params.set('orden', filtros.orden);

    const query = params.toString();
    window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
  }, [filtros]);

  const cambiar = useCallback((parcial: Partial<FiltrosCatalogo>) => {
    setFiltros((previo) => ({ ...previo, ...parcial }));
  }, []);

  const limpiar = useCallback(() => setFiltros({ orden: filtros.orden }), [filtros.orden]);

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:gap-8">
      <PanelFiltros
        filtros={filtros}
        opciones={opciones}
        sucursales={sucursales}
        onCambio={cambiar}
        onLimpiar={limpiar}
        resultados={resultados.length}
      />

      {/* min-w-0: sin esto la tabla de la vista lista estira la celda del grid
          y hace scrollear la página entera en horizontal. */}
      <div className="min-w-0">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gris-500">
            <span className="dato font-semibold text-negro">{resultados.length}</span>{' '}
            {resultados.length === 1 ? 'unidad' : 'unidades'}
            {resultados.length !== unidades.length && (
              <span> de {unidades.length} publicadas</span>
            )}
          </p>

          <div className="flex items-center gap-2.5">
            <label htmlFor="catalogo-orden" className="sr-only">
              Ordenar por
            </label>
            <select
              id="catalogo-orden"
              className="campo h-10 w-auto py-0 text-[13px]"
              value={filtros.orden ?? 'relevancia'}
              onChange={(evento) => cambiar({ orden: evento.target.value as OrdenCatalogo })}
            >
              {ORDENES.map((orden) => (
                <option key={orden.valor} value={orden.valor}>
                  {orden.texto}
                </option>
              ))}
            </select>

            <div
              className="flex gap-1 rounded-sm bg-gris-100 p-1"
              role="group"
              aria-label="Vista del catálogo"
            >
              {(
                [
                  { modo: 'grilla' as const, Icono: IconoGrilla, texto: 'Grilla' },
                  { modo: 'lista' as const, Icono: IconoLista, texto: 'Lista' },
                ]
              ).map(({ modo, Icono, texto }) => (
                <button
                  key={modo}
                  type="button"
                  onClick={() => setVista(modo)}
                  aria-pressed={vista === modo}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-sm px-3 text-[13px] font-semibold transition-colors ${
                    vista === modo
                      ? 'bg-white text-negro shadow-tarjeta'
                      : 'text-gris-500 hover:text-negro'
                  }`}
                >
                  <Icono className="h-4 w-4" />
                  <span className="hidden sm:inline">{texto}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* El conteo se anuncia solo: el listado cambia sin recargar la página. */}
        <p className="sr-only" role="status" aria-live="polite">
          {resultados.length} unidades coinciden con los filtros.
        </p>

        {resultados.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow-tarjeta">
            <p className="text-[19px] font-semibold text-negro">Sin resultados</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gris-500">
              Ninguna unidad coincide con esa combinación de filtros. Probá quitar la sucursal.
            </p>
            <button
              type="button"
              onClick={limpiar}
              className="mt-6 inline-flex h-11 items-center rounded bg-rojo px-6 text-sm font-semibold text-white transition-colors hover:bg-rojo-700"
            >
              Limpiar filtros
            </button>
          </div>
        ) : vista === 'grilla' ? (
          <UnidadGrilla unidades={resultados} columnas={3} />
        ) : (
          <UnidadTabla unidades={resultados} />
        )}
      </div>
    </div>
  );
}
