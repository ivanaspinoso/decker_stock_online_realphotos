'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import HojaFiltros from '@/components/catalogo/HojaFiltros';
import PanelFiltros from '@/components/catalogo/PanelFiltros';
import UnidadGrilla from '@/components/unidades/UnidadGrilla';
import UnidadTabla from '@/components/unidades/UnidadTabla';
import { IconoCerrar, IconoGrilla, IconoLista } from '@/components/ui/Iconos';
import { cumpleFiltros, ordenarUnidades } from '@/lib/filtros';
import { formatearPrecio } from '@/lib/format';
import type {
  FiltrosCatalogo,
  OpcionesCatalogo,
  OrdenCatalogo,
  Sucursal,
  Unidad,
} from '@/lib/types';

type Vista = 'grilla' | 'lista';

/**
 * Los órdenes vuelven a incluir precio.
 *
 * `ordenarUnidades` nunca dejó de soportarlos —`precio-asc` y `precio-desc`
 * están en el tipo y en la función— pero el `<select>` no los ofrecía, así que
 * la única forma de llegar a ellos era escribir `?orden=precio-asc` a mano.
 *
 * Las unidades sin precio publicado caen al final en los dos sentidos: no son
 * ni las más baratas ni las más caras.
 */
const ORDENES: { valor: OrdenCatalogo; texto: string }[] = [
  { valor: 'relevancia', texto: 'Destacadas primero' },
  { valor: 'precio-asc', texto: 'Precio: menor a mayor' },
  { valor: 'precio-desc', texto: 'Precio: mayor a menor' },
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

  /**
   * Firma de la combinación de filtros aplicada.
   *
   * Se usa como `key` de la grilla: al cambiar, React desmonta el listado y
   * monta uno nuevo, y las tarjetas vuelven a correr su animación de entrada.
   * Es el acuse de recibo del filtro —sin él, en un listado de treinta unidades
   * que baja a veintiocho no se ve que el sitio haya hecho nada—.
   *
   * Incluye el orden: cambiar de "más nuevas" a "menos kilómetros" reacomoda
   * las mismas unidades en otra secuencia, y sin la re-entrada el listado se ve
   * idéntico salvo por el primer renglón. La entrada escalonada es lo que dice
   * "se reordenó".
   */
  /**
   * Los filtros activos, en palabras.
   *
   * El catálogo se abre filtrado desde el subcatálogo de la home: se entra por
   * "0 km" o por "Volvo" y se cae en una lista que ya viene acotada. Hasta acá
   * lo único que lo decía era el `<select>` del panel —que en mobile queda
   * arriba de todo y se pasa de largo— y el conteo chico al costado. La página
   * se leía como el stock completo, y el filtro parecía no haberse aplicado.
   *
   * Sale del estado y no de la URL: cuando se toca un filtro a mano, la barra
   * lo acompaña en el mismo render. Cada uno se quita solo, sin tener que ir a
   * buscar su control en el panel.
   */
  const filtrosActivos = useMemo(() => {
    const lista: { clave: string; texto: string; quitar: Partial<FiltrosCatalogo> }[] = [];
    const busqueda = filtros.busqueda?.trim();

    if (busqueda) lista.push({ clave: 'busqueda', texto: `"${busqueda}"`, quitar: { busqueda: '' } });
    if (filtros.estado) lista.push({ clave: 'estado', texto: filtros.estado, quitar: { estado: '' } });
    if (filtros.tipo) lista.push({ clave: 'tipo', texto: filtros.tipo, quitar: { tipo: '' } });
    if (filtros.marca) lista.push({ clave: 'marca', texto: filtros.marca, quitar: { marca: '' } });
    if (filtros.sucursalId) {
      const sucursal = sucursales.find((s) => s.id === filtros.sucursalId);
      lista.push({
        clave: 'sucursal',
        texto: sucursal?.nombre ?? filtros.sucursalId,
        quitar: { sucursalId: '' },
      });
    }
    if (filtros.financiacion) {
      lista.push({ clave: 'financiacion', texto: 'Con financiación', quitar: { financiacion: '' } });
    }
    if (filtros.anioDesde !== undefined) {
      lista.push({ clave: 'anioDesde', texto: `Desde ${filtros.anioDesde}`, quitar: { anioDesde: undefined } });
    }
    if (filtros.anioHasta !== undefined) {
      lista.push({ clave: 'anioHasta', texto: `Hasta ${filtros.anioHasta}`, quitar: { anioHasta: undefined } });
    }
    if (filtros.precioDesde !== undefined) {
      lista.push({
        clave: 'precioDesde',
        texto: `Desde ${formatearPrecio(filtros.precioDesde)}`,
        quitar: { precioDesde: undefined },
      });
    }
    if (filtros.precioHasta !== undefined) {
      lista.push({
        clave: 'precioHasta',
        texto: `Hasta ${formatearPrecio(filtros.precioHasta)}`,
        quitar: { precioHasta: undefined },
      });
    }

    return lista;
  }, [filtros, sucursales]);

  const firmaFiltros = useMemo(
    () =>
      [
        filtros.busqueda?.trim() ?? '',
        filtros.tipo ?? '',
        filtros.marca ?? '',
        filtros.sucursalId ?? '',
        filtros.estado ?? '',
        filtros.financiacion ?? '',
        filtros.anioDesde ?? '',
        filtros.anioHasta ?? '',
        filtros.precioDesde ?? '',
        filtros.precioHasta ?? '',
        filtros.orden ?? '',
      ].join('|'),
    [filtros],
  );

  return (
    <div>
      {/* La barra va ARRIBA de la grilla y no adentro de la columna de
          resultados: es lo primero que tiene que leer el que llega desde el
          subcatálogo, antes que el panel y antes que las tarjetas. Sin filtros
          no existe: una barra vacía diciendo "sin filtros" es ruido. */}
      {filtrosActivos.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-white px-4 py-3 shadow-nivel-1">
          <p className="text-sm text-gris-500">
            Filtrando por
            <span className="sr-only">
              : {filtrosActivos.map((filtro) => filtro.texto).join(', ')}
            </span>
          </p>

          <ul className="flex flex-wrap items-center gap-2">
            {filtrosActivos.map(({ clave, texto, quitar }) => (
              <li key={clave}>
                {/* El chip ENTERO es el botón de quitar, no una etiqueta con una
                    crucecita de 8px al lado: en un teléfono esa cruz no se
                    acierta. La × es el ícono de la acción, no su blanco. */}
                <button
                  type="button"
                  onClick={() => cambiar(quitar)}
                  className="centrado-optico inline-flex h-9 items-center gap-2 rounded-sm bg-gris-100 px-3 text-sm font-medium text-negro transition-colors duration-rapido hover:bg-gris-200"
                >
                  {texto}
                  <IconoCerrar className="h-3.5 w-3.5 text-gris-500" />
                  <span className="sr-only">Quitar este filtro</span>
                </button>
              </li>
            ))}
          </ul>

          {/* Sólo con dos o más: con uno solo, quitarlo y limpiar todo son la
              misma acción y el segundo botón no agrega nada. */}
          {filtrosActivos.length > 1 && (
            <button
              type="button"
              onClick={limpiar}
              className="-my-1 py-1 text-sm font-medium text-rojo transition-opacity hover:opacity-70"
            >
              Limpiar todo
            </button>
          )}
        </div>
      )}

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
              <span className="dato text-md font-medium text-negro">{resultados.length}</span>{' '}
              {resultados.length === 1 ? 'unidad' : 'unidades'}
              {resultados.length !== unidades.length && (
                <span> de {unidades.length} publicadas</span>
              )}
            </p>

            {/* `flex-wrap` y no scroll horizontal: con el botón de filtros
                sumado, en un teléfono angosto los tres controles no entran en
                una línea, y una fila que se corta esconde el conmutador de
                vista sin avisar. */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Sólo en mobile: en desktop los mismos campos están a la
                  izquierda, desplegados, y un botón que abriera una ventana
                  para repetirlos sería un segundo camino al mismo lugar. */}
              <HojaFiltros
                filtros={filtros}
                opciones={opciones}
                sucursales={sucursales}
                onCambio={cambiar}
                onLimpiar={limpiar}
                resultados={resultados.length}
                activos={filtrosActivos.length}
              />

              <label htmlFor="catalogo-orden" className="sr-only">
                Ordenar por
              </label>
              <select
                id="catalogo-orden"
                className="campo h-11 w-auto min-w-0 flex-1 py-0 text-sm sm:flex-none"
                value={filtros.orden ?? 'relevancia'}
                onChange={(evento) => cambiar({ orden: evento.target.value as OrdenCatalogo })}
              >
                {ORDENES.map((orden) => (
                  <option key={orden.valor} value={orden.valor}>
                    {orden.texto}
                  </option>
                ))}
              </select>

              {/* p-0.5 y botones de 40px: el conmutador entero mide 44 de alto,
                  así que cada mitad es tocable sin apuntar. */}
              <div
                className="flex gap-1 rounded-sm bg-gris-100 p-0.5"
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
                    /* El rótulo se esconde abajo de `sm` para que el
                       conmutador no coma el ancho de la fila, y sin esto el
                       botón se quedaba sin nombre justo en mobile: un lector
                       de pantalla anunciaba dos botones vacíos. El
                       `aria-label` va siempre, se vea la palabra o no. */
                    aria-label={`Ver en ${texto.toLowerCase()}`}
                    className={`centrado-optico inline-flex h-10 items-center gap-2 rounded-sm px-3 text-sm font-medium transition-colors duration-rapido ${
                      vista === modo
                        ? 'bg-white text-negro shadow-nivel-1'
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
            <div className="animate-entrar rounded-lg bg-white p-12 text-center shadow-nivel-1">
              <p className="font-display text-lg font-extrabold text-negro">Sin resultados</p>
              <p className="mx-auto mt-2 max-w-sm text-base leading-relaxed text-gris-500">
                Ninguna unidad coincide con esa combinación de filtros. Probá quitar la sucursal.
              </p>
              <button
                type="button"
                onClick={limpiar}
                className="centrado-optico mt-6 inline-flex h-11 items-center rounded bg-rojo px-6 text-sm font-medium text-white transition-colors duration-rapido hover:bg-rojo-700"
              >
                Limpiar filtros
              </button>
            </div>
          ) : vista === 'grilla' ? (
            <UnidadGrilla key={firmaFiltros} unidades={resultados} columnas={3} animar />
          ) : (
            <UnidadTabla unidades={resultados} />
          )}
        </div>
      </div>
    </div>
  );
}
