'use client';

import type {
  EstadoUnidad,
  FiltrosCatalogo,
  IdSucursal,
  OpcionesCatalogo,
  Sucursal,
  TipoUnidad,
} from '@/lib/types';

/**
 * Filtros del catálogo. Siempre visibles: nunca detrás de un acordeón ni de un
 * ícono de embudo. En desktop es una columna fija; en mobile es una grilla de
 * dos columnas arriba del listado, desplegada.
 */
export default function PanelFiltros({
  filtros,
  opciones,
  sucursales,
  onCambio,
  onLimpiar,
  resultados,
}: {
  filtros: FiltrosCatalogo;
  opciones: OpcionesCatalogo;
  sucursales: Sucursal[];
  onCambio: (parcial: Partial<FiltrosCatalogo>) => void;
  onLimpiar: () => void;
  resultados: number;
}) {
  // Un input numérico vacío tiene que borrar el filtro, no valer 0.
  const aNumero = (valor: string): number | undefined =>
    valor.trim() === '' ? undefined : Number(valor);

  const hayFiltros =
    Boolean(filtros.busqueda?.trim()) ||
    Boolean(filtros.tipo) ||
    Boolean(filtros.marca) ||
    Boolean(filtros.sucursalId) ||
    Boolean(filtros.estado) ||
    Boolean(filtros.financiacion) ||
    filtros.anioDesde !== undefined ||
    filtros.anioHasta !== undefined ||
    filtros.precioDesde !== undefined ||
    filtros.precioHasta !== undefined;

  return (
    <aside aria-label="Filtros del catálogo" className="lg:sticky lg:top-24">
      <div className="rounded-lg bg-white p-5 shadow-tarjeta">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[17px] font-semibold leading-none">Filtros</h2>
          <button
            type="button"
            onClick={onLimpiar}
            disabled={!hayFiltros}
            className="text-[13px] font-semibold text-rojo transition-opacity hover:opacity-70 disabled:pointer-events-none disabled:text-gris-300"
          >
            Limpiar
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-1">
          <div className="col-span-2 lg:col-span-1">
            <label htmlFor="filtro-busqueda" className="campo-label">
              Buscar
            </label>
            <input
              id="filtro-busqueda"
              type="search"
              className="campo"
              placeholder="Volvo FH, Randon, Ranger…"
              value={filtros.busqueda ?? ''}
              onChange={(evento) => onCambio({ busqueda: evento.target.value })}
            />
          </div>

          <div>
            <label htmlFor="filtro-tipo" className="campo-label">
              Tipo
            </label>
            <select
              id="filtro-tipo"
              className="campo"
              value={filtros.tipo ?? ''}
              onChange={(evento) => onCambio({ tipo: evento.target.value as TipoUnidad | '' })}
            >
              <option value="">Todos</option>
              {opciones.tipos.map((valor) => (
                <option key={valor} value={valor}>
                  {valor}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filtro-marca" className="campo-label">
              Marca
            </label>
            <select
              id="filtro-marca"
              className="campo"
              value={filtros.marca ?? ''}
              onChange={(evento) => onCambio({ marca: evento.target.value })}
            >
              <option value="">Todas</option>
              {opciones.marcas.map((valor) => (
                <option key={valor} value={valor}>
                  {valor}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filtro-sucursal" className="campo-label">
              Sucursal
            </label>
            <select
              id="filtro-sucursal"
              className="campo"
              value={filtros.sucursalId ?? ''}
              onChange={(evento) =>
                onCambio({ sucursalId: evento.target.value as IdSucursal | '' })
              }
            >
              <option value="">Todas</option>
              {sucursales.map((sucursal) => (
                <option key={sucursal.id} value={sucursal.id}>
                  {sucursal.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filtro-estado" className="campo-label">
              Estado
            </label>
            <select
              id="filtro-estado"
              className="campo"
              value={filtros.estado ?? ''}
              onChange={(evento) => onCambio({ estado: evento.target.value as EstadoUnidad | '' })}
            >
              <option value="">Todos</option>
              {opciones.estados.map((valor) => (
                <option key={valor} value={valor}>
                  {valor}
                </option>
              ))}
            </select>
          </div>

          {/* El buscador de la home puede llegar con este filtro puesto: tiene
              que verse acá para poder sacarlo. */}
          <label className="col-span-2 flex items-center gap-2.5 lg:col-span-1">
            <input
              type="checkbox"
              className="h-4 w-4 rounded-sm accent-rojo"
              checked={filtros.financiacion === 'Disponible'}
              onChange={(evento) =>
                onCambio({ financiacion: evento.target.checked ? 'Disponible' : '' })
              }
            />
            <span className="text-[13px] text-gris-600">Sólo con financiación disponible</span>
          </label>

          <fieldset className="col-span-2 lg:col-span-1">
            <legend className="campo-label">Año</legend>
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="campo dato"
                inputMode="numeric"
                min={opciones.anioMin}
                max={opciones.anioMax}
                placeholder={String(opciones.anioMin)}
                aria-label="Año desde"
                value={filtros.anioDesde ?? ''}
                onChange={(evento) => onCambio({ anioDesde: aNumero(evento.target.value) })}
              />
              <span aria-hidden="true" className="text-gris-300">
                –
              </span>
              <input
                type="number"
                className="campo dato"
                inputMode="numeric"
                min={opciones.anioMin}
                max={opciones.anioMax}
                placeholder={String(opciones.anioMax)}
                aria-label="Año hasta"
                value={filtros.anioHasta ?? ''}
                onChange={(evento) => onCambio({ anioHasta: aNumero(evento.target.value) })}
              />
            </div>
          </fieldset>

          
        </div>

        <p className="mt-5 border-t border-gris-200 pt-4 text-[13px] text-gris-500">
          <span className="dato font-semibold text-negro">{resultados}</span>{' '}
          {resultados === 1 ? 'unidad coincide' : 'unidades coinciden'}
        </p>
      </div>
    </aside>
  );
}
