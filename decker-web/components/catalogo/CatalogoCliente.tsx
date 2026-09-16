'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HojaFiltros from '@/components/catalogo/HojaFiltros';
import Paginacion from '@/components/catalogo/Paginacion';
import PanelFiltros from '@/components/catalogo/PanelFiltros';
import UnidadGrilla from '@/components/unidades/UnidadGrilla';
import UnidadTabla from '@/components/unidades/UnidadTabla';
import { IconoCerrar, IconoGrilla, IconoLista } from '@/components/ui/Iconos';
import { cumpleFiltros, ordenarUnidades, UNIDADES_POR_PAGINA } from '@/lib/filtros';
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
 * Los órdenes disponibles, según lo que el stock tenga cargado.
 *
 * ORDENAR POR PRECIO SÓLO APARECE SI HAY PRECIOS. Hoy no los hay: la API no
 * devuelve precio en ningún endpoint público. Un "Precio: menor a mayor" sobre
 * un catálogo entero de "Consultar" no reordena nada, y eso se lee como que el
 * sitio está roto, no como que falta el dato.
 *
 * Cuando haya precios, las unidades que igual no lo tengan caen al final en los
 * dos sentidos: no son ni las más baratas ni las más caras.
 */
function ordenesDisponibles(hayPrecios: boolean): { valor: OrdenCatalogo; texto: string }[] {
  return [
    { valor: 'relevancia' as const, texto: 'Destacadas primero' },
    ...(hayPrecios
      ? [
          { valor: 'precio-asc' as const, texto: 'Precio: menor a mayor' },
          { valor: 'precio-desc' as const, texto: 'Precio: mayor a menor' },
        ]
      : []),
    { valor: 'anio-desc' as const, texto: 'Año: más nuevas' },
    { valor: 'km-asc' as const, texto: 'Kilómetros: menor a mayor' },
  ];
}

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
/**
 * Cuántas unidades se muestran por página.
 *
 * POR QUÉ HAY QUE PAGINAR: con la API real el catálogo son 239 unidades y antes
 * se dibujaban TODAS de una. Eso son 239 tarjetas con 239 fotos en el DOM: una
 * página de scroll interminable, y el navegador del teléfono pidiendo doscientas
 * imágenes al server de fotos de Decker —que corta las conexiones cuando se le
 * piden muchas— así que la mitad ni llegaba.
 *
 * 24 es múltiplo de 2, 3 y 4: la última fila queda completa en las tres
 * anchuras de la grilla, sin un hueco al final.
 */
const POR_PAGINA = UNIDADES_POR_PAGINA;

export default function CatalogoCliente({
  unidades,
  opciones,
  sucursales,
  filtrosIniciales,
  paginaInicial,
}: {
  unidades: Unidad[];
  opciones: OpcionesCatalogo;
  sucursales: Sucursal[];
  filtrosIniciales: FiltrosCatalogo;
  /** La página del `?pagina=` de la URL, ya saneada por el servidor. */
  paginaInicial: number;
}) {
  const [filtros, setFiltros] = useState<FiltrosCatalogo>(filtrosIniciales);
  const [vista, setVista] = useState<Vista>('grilla');
  const [pagina, setPagina] = useState(paginaInicial);

  const resultados = useMemo(
    () =>
      ordenarUnidades(
        unidades.filter((unidad) => cumpleFiltros(unidad, filtros)),
        filtros.orden,
      ),
    [unidades, filtros],
  );

  const totalPaginas = Math.max(1, Math.ceil(resultados.length / POR_PAGINA));

  /**
   * Una página fuera de rango se corrige a la última que existe.
   *
   * Hace falta desde que la página entra por la URL: alguien puede llegar con
   * `?pagina=99`, o con el link de la página 8 guardado de cuando había más
   * stock. Sin esto vería una lista vacía con el contador diciendo que hay 240
   * unidades, que se lee como sitio roto y no como link viejo.
   */
  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas);
  }, [pagina, totalPaginas]);

  /**
   * Volver a la página 1 cuando cambian los filtros.
   *
   * Sin esto, alguien parado en la página 8 que filtra por "Batea" —23
   * unidades, una sola página— se queda mirando una lista vacía con el contador
   * diciendo 23. El bug clásico de toda paginación filtrable.
   */
  const montado = useRef(false);
  useEffect(() => {
    // En el primer render NO se toca: pisaría la página que venía en la URL.
    if (!montado.current) {
      montado.current = true;
      return;
    }
    setPagina(1);
  }, [filtros]);

  const visibles = useMemo(
    () => resultados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
    [resultados, pagina],
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
    // La página también, porque también forma parte de "dónde estoy mirando".
    // Sin esto, mandarle a alguien el link de la página 5 lo dejaba en la 1.
    // La 1 no se escribe: es el estado por defecto y ensuciaría la URL.
    if (pagina > 1) params.set('pagina', String(pagina));

    const query = params.toString();
    const destino = query ? `?${query}` : window.location.pathname;

    /**
     * EL FLAG SE LIMPIA ACÁ ARRIBA, PASE LO QUE PASE DESPUÉS.
     *
     * Marca que estos filtros los puso el botón "atrás" y no la persona, así
     * que no hay que empujar una entrada nueva —el navegador ya movió el
     * historial—. El error era limpiarlo sólo en esa rama: cuando el efecto
     * salía antes por cualquier otro motivo, el flag quedaba encendido y se
     * comía el SIGUIENTE cambio real. Ahí el historial se desincronizaba y
     * tocar atrás dos veces llevaba para adelante.
     */
    const vieneDeAtras = volviendo.current;
    volviendo.current = false;

    /**
     * La comparación va sobre los parámetros, no sobre el texto.
     *
     * `URLSearchParams.toString()` escribe los espacios como `+` y el navegador
     * los deja como `%20`: `?estado=0+km` y `?estado=0%20km` son la misma
     * consulta escrita distinto. Comparando el texto crudo nunca coincidían, y
     * al abrir un link con filtros se apilaba una entrada de historial idéntica
     * a la que ya estaba —el primer "atrás" no hacía nada, porque volvía a la
     * misma URL—.
     */
    const mismos = (a: string, b: string) =>
      new URLSearchParams(a).toString() === new URLSearchParams(b).toString();

    if (mismos(query, window.location.search)) return;
    if (vieneDeAtras) return;

    /**
     * `pushState` Y NO `replaceState`, para que "atrás" deshaga el filtro.
     *
     * Esto usaba `replaceState`, que actualiza la URL sin dejar rastro en el
     * historial. La URL quedaba compartible —que era el objetivo— pero el botón
     * de atrás no deshacía nada: alguien que probaba cuatro filtros seguidos y
     * tocaba atrás se iba del catálogo de una, a la página anterior, perdiendo
     * las cuatro elecciones juntas.
     *
     * Con `pushState`, cada cambio es un paso atrás. La guarda de arriba evita
     * apilar entradas repetidas cuando el efecto se vuelve a ejecutar sin que
     * la URL haya cambiado; sin ella, un solo clic podía dejar dos o tres pasos
     * idénticos y haría falta tocar atrás varias veces para ver un cambio.
     *
     * El estado inicial NO entra acá: lo pone el servidor leyendo la URL, y
     * empujarlo otra vez agregaría un paso al abrir la página.
     */
    window.history.pushState(null, '', destino);
  }, [filtros, pagina]);

  /**
   * Cuando la persona toca atrás o adelante, los filtros siguen a la URL.
   *
   * Sin esto, `pushState` haría lo peor de los dos mundos: la barra de
   * direcciones cambiaría al ir hacia atrás pero la lista seguiría mostrando
   * los filtros viejos, porque el estado de React no se entera de la
   * navegación. Se lee la URL y se reconstruyen.
   */
  /** Marca que el cambio de filtros lo produjo el botón atrás, no la persona. */
  const volviendo = useRef(false);

  useEffect(() => {
    const alNavegar = () => {
      volviendo.current = true;
      const p = new URLSearchParams(window.location.search);
      const numero = (clave: string) => {
        const valor = p.get(clave);
        return valor !== null && valor !== '' && Number.isFinite(Number(valor))
          ? Number(valor)
          : undefined;
      };

      setFiltros({
        busqueda: p.get('q') ?? '',
        tipo: (p.get('tipo') ?? '') as FiltrosCatalogo['tipo'],
        marca: p.get('marca') ?? '',
        sucursalId: (p.get('sucursal') ?? '') as FiltrosCatalogo['sucursalId'],
        estado: (p.get('estado') ?? '') as FiltrosCatalogo['estado'],
        financiacion: p.get('financiacion') === 'Disponible' ? 'Disponible' : '',
        anioDesde: numero('anioDesde'),
        anioHasta: numero('anioHasta'),
        precioDesde: numero('precioDesde'),
        precioHasta: numero('precioHasta'),
        orden: (p.get('orden') as FiltrosCatalogo['orden']) ?? 'relevancia',
      });
      setPagina(Math.max(1, Number(p.get('pagina')) || 1));
    };

    window.addEventListener('popstate', alNavegar);
    return () => window.removeEventListener('popstate', alNavegar);
  }, []);

  const cambiar = useCallback((parcial: Partial<FiltrosCatalogo>) => {
    setFiltros((previo) => ({ ...previo, ...parcial }));
  }, []);

  const limpiar = useCallback(() => setFiltros({ orden: filtros.orden }), [filtros.orden]);

  /**
   * Cambia de página y sube al principio del listado.
   *
   * El scroll no es un adorno: los controles de paginación están al FINAL de la
   * lista, así que sin esto el clic deja al visitante mirando el final de la
   * página nueva —o peor, los mismos botones— y parece que no pasó nada.
   *
   * Sube al encabezado del listado y no al tope de la página: los filtros y el
   * conteo quedan a la vista, que es el contexto de lo que se está mirando.
   */
  const irAPagina = useCallback((siguiente: number) => {
    setPagina(siguiente);
    document.getElementById('listado')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

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
              className="-my-2 -mr-3 inline-flex h-11 items-center px-3 text-sm font-medium text-rojo transition-opacity hover:opacity-70"
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
            y hace scrollear la página entera en horizontal.

            `id` y `scroll-mt-24`: es el ancla a la que sube el cambio de
            página. El margen deja el encabezado abajo de la nav fija, que si no
            lo tapa. */}
        <div id="listado" className="min-w-0 scroll-mt-24">
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
              {/**
               * En el teléfono el orden se lleva su propio renglón.
               *
               * Compartía fila con el botón de filtros y el conmutador de
               * vista: en 390px le quedaban 102px y "Destacadas primero"
               * —el valor por defecto, o sea el que ve todo el mundo al
               * entrar— se mostraba como "Destaca…". Un control que no puede
               * decir en qué estado está no informa nada.
               *
               * `order-last w-full` lo manda abajo y a todo el ancho; los dos
               * controles compactos se quedan arriba juntos. De `sm` para
               * arriba vuelven los tres a la misma línea, donde sí entran.
               */}
              <select
                id="catalogo-orden"
                className="campo order-last h-11 w-full min-w-0 py-0 text-sm sm:order-none sm:w-auto sm:flex-none"
                value={filtros.orden ?? 'relevancia'}
                onChange={(evento) => cambiar({ orden: evento.target.value as OrdenCatalogo })}
              >
                {ordenesDisponibles(opciones.precioMin !== null).map((orden) => (
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
                    className={`centrado-optico inline-flex h-11 items-center gap-2 rounded-sm px-3 text-sm font-medium transition-colors duration-rapido ${
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
          ) : (
            <>
              {vista === 'grilla' ? (
                <UnidadGrilla
                  key={`${firmaFiltros}-${pagina}`}
                  unidades={visibles}
                  columnas={3}
                  animar
                />
              ) : (
                <UnidadTabla unidades={visibles} />
              )}

              <Paginacion
                pagina={pagina}
                totalPaginas={totalPaginas}
                total={resultados.length}
                desde={(pagina - 1) * POR_PAGINA + 1}
                hasta={Math.min(pagina * POR_PAGINA, resultados.length)}
                onIr={irAPagina}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
