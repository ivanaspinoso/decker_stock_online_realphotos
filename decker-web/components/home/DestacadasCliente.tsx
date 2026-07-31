'use client';

import { useMemo, useState } from 'react';
import UnidadGrilla from '@/components/unidades/UnidadGrilla';
import Boton from '@/components/ui/Boton';
import EncabezadoSeccion from '@/components/ui/EncabezadoSeccion';
import { cumpleFiltros } from '@/lib/filtros';
import type { EstadoUnidad, FiltrosCatalogo, IdSucursal, Sucursal, TipoUnidad, Unidad } from '@/lib/types';

/**
 * Unidades seleccionadas de la home, con sus propios filtros.
 *
 * El buscador del hero deja los valores en la URL y llegan acá como
 * `filtrosIniciales`; a partir de ahí se filtra en memoria, sin recargar la
 * página. Las opciones de cada select salen de las unidades destacadas y no del
 * stock completo: si una marca no está en esta sección, no se ofrece un filtro
 * que sólo puede dar cero resultados.
 */
export default function DestacadasCliente({
  unidades,
  sucursales,
  filtrosIniciales,
}: {
  unidades: Unidad[];
  sucursales: Sucursal[];
  filtrosIniciales: FiltrosCatalogo;
}) {
  const [filtros, setFiltros] = useState<FiltrosCatalogo>(filtrosIniciales);

  const opciones = useMemo(
    () => ({
      tipos: [...new Set(unidades.map((u) => u.tipo))].sort(),
      marcas: [...new Set(unidades.map((u) => u.marca))].sort(),
      estados: [...new Set(unidades.map((u) => u.estado))],
      sucursales: sucursales.filter((s) => unidades.some((u) => u.sucursalId === s.id)),
    }),
    [unidades, sucursales],
  );

  const resultados = useMemo(
    () => unidades.filter((unidad) => cumpleFiltros(unidad, filtros)),
    [unidades, filtros],
  );

  const hayFiltros =
    Boolean(filtros.busqueda?.trim()) ||
    Boolean(filtros.tipo) ||
    Boolean(filtros.marca) ||
    Boolean(filtros.sucursalId) ||
    Boolean(filtros.estado);

  const cambiar = (parcial: Partial<FiltrosCatalogo>) =>
    setFiltros((previo) => ({ ...previo, ...parcial }));

  const limpiar = () => setFiltros({});

  // Los mismos filtros, listos para llevar al catálogo completo.
  const params = new URLSearchParams();
  if (filtros.busqueda?.trim()) params.set('q', filtros.busqueda.trim());
  if (filtros.tipo) params.set('tipo', filtros.tipo);
  if (filtros.marca) params.set('marca', filtros.marca);
  if (filtros.sucursalId) params.set('sucursal', filtros.sucursalId);
  if (filtros.estado) params.set('estado', filtros.estado);
  const hrefCatalogo = `/catalogo${params.toString() ? `?${params}` : ''}`;

  return (
    <>
      <EncabezadoSeccion
        etiqueta="Catálogo Decker"
        titulo={hayFiltros ? 'Resultados de tu búsqueda' : 'Unidades seleccionadas'}
        descripcion={
          hayFiltros
            ? 'Estas son las unidades seleccionadas que coinciden con tu búsqueda. En el stock completo hay más opciones.'
            : 'Catálogo visual con imágenes reales de camiones, ficha técnica, financiación y contacto directo con un asesor.'
        }
        accion={
          <Boton href={hrefCatalogo} variante="sutil">
            Ver stock completo
          </Boton>
        }
      />

      <div className="mb-8 rounded-lg bg-white p-5 shadow-tarjeta">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-[15px] font-semibold leading-none">Filtrar unidades seleccionadas</h3>
          <button
            type="button"
            onClick={limpiar}
            disabled={!hayFiltros}
            className="text-[13px] font-semibold text-rojo transition-opacity hover:opacity-70 disabled:pointer-events-none disabled:text-gris-300"
          >
            Limpiar
          </button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label htmlFor="destacadas-busqueda" className="campo-label">
              Buscar
            </label>
            <input
              id="destacadas-busqueda"
              type="search"
              className="campo"
              placeholder="Volvo FH, Randon…"
              value={filtros.busqueda ?? ''}
              onChange={(evento) => cambiar({ busqueda: evento.target.value })}
            />
          </div>

          <div>
            <label htmlFor="destacadas-tipo" className="campo-label">
              Tipo
            </label>
            <select
              id="destacadas-tipo"
              className="campo"
              value={filtros.tipo ?? ''}
              onChange={(evento) => cambiar({ tipo: evento.target.value as TipoUnidad | '' })}
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
            <label htmlFor="destacadas-marca" className="campo-label">
              Marca
            </label>
            <select
              id="destacadas-marca"
              className="campo"
              value={filtros.marca ?? ''}
              onChange={(evento) => cambiar({ marca: evento.target.value })}
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
            <label htmlFor="destacadas-sucursal" className="campo-label">
              Sucursal
            </label>
            <select
              id="destacadas-sucursal"
              className="campo"
              value={filtros.sucursalId ?? ''}
              onChange={(evento) =>
                cambiar({ sucursalId: evento.target.value as IdSucursal | '' })
              }
            >
              <option value="">Todas</option>
              {opciones.sucursales.map((sucursal) => (
                <option key={sucursal.id} value={sucursal.id}>
                  {sucursal.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="destacadas-estado" className="campo-label">
              Estado
            </label>
            <select
              id="destacadas-estado"
              className="campo"
              value={filtros.estado ?? ''}
              onChange={(evento) => cambiar({ estado: evento.target.value as EstadoUnidad | '' })}
            >
              <option value="">Todos</option>
              {opciones.estados.map((valor) => (
                <option key={valor} value={valor}>
                  {valor}
                </option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* El conteo se anuncia solo: el listado cambia sin recargar la página. */}
      <p className="sr-only" role="status" aria-live="polite">
        {resultados.length} unidades coinciden con los filtros.
      </p>

      {resultados.length > 0 ? (
        <UnidadGrilla unidades={resultados} />
      ) : (
        <div className="rounded-lg bg-white p-12 text-center shadow-tarjeta">
          <p className="text-[19px] font-semibold text-negro">
            No encontramos unidades con esos filtros
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gris-500">
            Las unidades seleccionadas son una muestra chica. Probá en el stock completo: ahí
            están todas, con filtros por año, precio, estado y sucursal.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Boton onClick={limpiar} variante="secundario">
              Limpiar filtros
            </Boton>
            <Boton href={hrefCatalogo} variante="primario">
              Buscar en el stock completo
            </Boton>
          </div>
        </div>
      )}
    </>
  );
}
