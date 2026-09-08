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
 * Filtros del catálogo.
 *
 * Los controles viven acá una sola vez (`CamposFiltros`) y el envase cambia
 * según el ancho: en desktop es la columna fija de la izquierda, siempre
 * desplegada; en mobile es la hoja que sube desde abajo (ver `HojaFiltros`).
 * No hay dos versiones del formulario ni dos caminos para el estado —el
 * filtrado lo sigue haciendo `CatalogoCliente`—: es el mismo componente en otro
 * contenedor.
 *
 * En mobile el panel fijo ocupaba una pantalla entera de selects arriba del
 * listado: para llegar a la primera unidad había que pasarlos de largo. La hoja
 * devuelve esa pantalla a las tarjetas sin esconder el filtro detrás de un
 * ícono mudo —el botón lleva la cuenta de los filtros puestos—.
 */

/** ¿Hay algo filtrado? Habilita el "Limpiar" del encabezado. */
export function hayFiltrosPuestos(filtros: FiltrosCatalogo): boolean {
  return (
    Boolean(filtros.busqueda?.trim()) ||
    Boolean(filtros.tipo) ||
    Boolean(filtros.marca) ||
    Boolean(filtros.sucursalId) ||
    Boolean(filtros.estado) ||
    Boolean(filtros.financiacion) ||
    filtros.anioDesde !== undefined ||
    filtros.anioHasta !== undefined ||
    filtros.precioDesde !== undefined ||
    filtros.precioHasta !== undefined
  );
}

/**
 * Un grupo de filtros con su rótulo.
 *
 * Los ocho controles estaban en una lista plana, y el orden ponía sucursal y
 * estado —dónde está y en qué condición— entre la identidad del vehículo y los
 * números. Nadie busca un camión en ese orden: primero qué, después cuánto,
 * después dónde.
 *
 * Son los MISMOS campos. Lo único que se agrega es el corte: un rótulo chico y
 * una línea, que es lo que convierte ocho controles sueltos en tres decisiones.
 *
 * `<fieldset>` y `<legend>` y no un `<div>` con un `<p>`: para un lector de
 * pantalla la agrupación tiene que existir de verdad, si no el rótulo del grupo
 * es un texto suelto que no se asocia con nada.
 */
function GrupoFiltros({
  titulo,
  children,
  primero = false,
}: {
  titulo: string;
  children: React.ReactNode;
  /** El primer grupo no lleva línea arriba: no hay nada de qué separarlo. */
  primero?: boolean;
}) {
  return (
    <fieldset className={primero ? '' : 'mt-6 border-t border-gris-200 pt-6'}>
      <legend className="rotulo-dato mb-3 block">{titulo}</legend>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">{children}</div>
    </fieldset>
  );
}

export function CamposFiltros({
  filtros,
  opciones,
  sucursales,
  onCambio,
  /* La columna y la hoja pueden estar montadas a la vez —el breakpoint decide
     cuál se ve, no cuál existe—, así que los `id` de los campos se prefijan:
     dos `for="filtro-marca"` en la misma página dejarían la mitad de las
     etiquetas apuntando al control equivocado. */
  idPrefijo,
}: {
  filtros: FiltrosCatalogo;
  opciones: OpcionesCatalogo;
  sucursales: Sucursal[];
  onCambio: (parcial: Partial<FiltrosCatalogo>) => void;
  idPrefijo: string;
}) {
  // Un input numérico vacío tiene que borrar el filtro, no valer 0.
  const aNumero = (valor: string): number | undefined =>
    valor.trim() === '' ? undefined : Number(valor);

  /**
   * El precio se pide EN MILLONES y se guarda en pesos.
   *
   * Los camiones de este stock valen entre 172 y 289 millones. Un campo donde
   * hay que tipear "220000000" en un teléfono es un campo que se completa mal:
   * un cero de más o de menos no se ve, y el filtro devuelve cero resultados
   * sin que se entienda por qué. Tres dígitos sí se controlan de un vistazo.
   *
   * La conversión vive acá y no en el estado: `cumpleFiltros`, la URL y los
   * chips siguen hablando en pesos, que es la unidad del dato.
   */
  const MILLON = 1_000_000;
  const aPesos = (valor: string): number | undefined => {
    const numero = aNumero(valor);
    return numero === undefined ? undefined : Math.round(numero * MILLON);
  };
  const enMillones = (pesos: number | undefined): string =>
    pesos === undefined ? '' : String(Math.round(pesos / MILLON));

  const id = (nombre: string) => `${idPrefijo}-${nombre}`;

  return (
    <div>
      {/* 1. QUÉ BUSCÁS. Lo más general primero: de qué unidad estamos
          hablando. Es la decisión que acota más y la que se toma sin pensar. */}
      <GrupoFiltros titulo="Qué buscás" primero>
        <div className="col-span-2 lg:col-span-1">
          <label htmlFor={id('busqueda')} className="campo-label">
            Buscar
          </label>
          <input
            id={id('busqueda')}
            type="search"
            className="campo"
            placeholder="Volvo FH, Randon, Ranger…"
            value={filtros.busqueda ?? ''}
            onChange={(evento) => onCambio({ busqueda: evento.target.value })}
          />
        </div>

        <div>
          <label htmlFor={id('tipo')} className="campo-label">
            Tipo
          </label>
          <select
            id={id('tipo')}
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
          <label htmlFor={id('marca')} className="campo-label">
            Marca
          </label>
          <select
            id={id('marca')}
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
      </GrupoFiltros>

      {/* 2. CUÁNTO. Los dos rangos juntos, que es como se piensan: el
          presupuesto y la antigüedad son la misma decisión de plata. */}
      <GrupoFiltros titulo="Presupuesto y antigüedad">
        {/**
         * Precio. El sitio lo prometía —el título del catálogo dice "filtrá por
         * tipo, marca, año, precio, sucursal o estado"— y el control no estaba:
         * la maquinaria seguía entera en `cumpleFiltros`, en la URL y en los
         * chips, pero no había forma de tocarla desde la pantalla.
         *
         * Ojo con lo que hace: una unidad SIN precio cargado queda afuera apenas
         * se acota el rango, porque no se puede afirmar que entre. Por eso el pie
         * lo aclara en vez de dejar que la lista se acorte en silencio.
         */}
        <fieldset className="col-span-2 lg:col-span-1">
          <legend className="campo-label">Precio, en millones de $</legend>
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="campo dato"
              inputMode="numeric"
              min={0}
              placeholder={enMillones(opciones.precioMin)}
              aria-label="Precio desde, en millones de pesos"
              value={enMillones(filtros.precioDesde)}
              onChange={(evento) => onCambio({ precioDesde: aPesos(evento.target.value) })}
            />
            <span aria-hidden="true" className="text-gris-500">
              –
            </span>
            <input
              type="number"
              className="campo dato"
              inputMode="numeric"
              min={0}
              placeholder={enMillones(opciones.precioMax)}
              aria-label="Precio hasta, en millones de pesos"
              value={enMillones(filtros.precioHasta)}
              onChange={(evento) => onCambio({ precioHasta: aPesos(evento.target.value) })}
            />
          </div>
          {(filtros.precioDesde !== undefined || filtros.precioHasta !== undefined) && (
            <p className="mt-2 text-xs leading-relaxed text-gris-500">
              Con el precio acotado quedan afuera las unidades sin precio publicado.
            </p>
          )}
        </fieldset>

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
            {/* Es lo único que dice que los dos campos son un rango. En
                gris-300 daba 1.5:1 sobre blanco —invisible— y los campos se
                leían como dos filtros sueltos. */}
            <span aria-hidden="true" className="text-gris-500">
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
      </GrupoFiltros>

      {/* 3. DÓNDE Y CÓMO. Lo último: cuando ya se sabe qué se busca y por
          cuánto, se mira en qué agencia está y en qué condición. La casilla de
          financiación cae acá porque es la otra condición comercial, y en la
          lista plana quedaba huérfana entre dos selects sin relación. */}
      <GrupoFiltros titulo="Dónde y en qué condición">
        <div>
          <label htmlFor={id('sucursal')} className="campo-label">
            Sucursal
          </label>
          <select
            id={id('sucursal')}
            className="campo"
            value={filtros.sucursalId ?? ''}
            onChange={(evento) => onCambio({ sucursalId: evento.target.value as IdSucursal | '' })}
          >
            <option value="">Todas</option>
            {sucursales.map((sucursal) => (
              <option key={sucursal.id} value={sucursal.id}>
                {sucursal.nombre}
              </option>
            ))}
          </select>
        </div>

        {/**
         * "Condición de la unidad", no "Estado".
         *
         * El campo del dato se sigue llamando `estado` y los valores no se
         * tocan: lo que cambia es cómo se presenta. "Estado" a secas es
         * ambiguo en un sitio de stock —se lee como disponibilidad: "¿está o no
         * está?"— y los valores que ofrece son otra cosa: `0 km`, `Usado
         * seleccionado`, `Línea actual` describen la CONDICIÓN de la unidad.
         *
         * Queda un valor que no encaja en ninguna lectura: `Disponible`. Ese es
         * un problema del dato, no del rótulo, y no se arregla desde acá: hoy
         * una unidad "Disponible" no dice si es nueva o usada. Está anotado
         * para resolverlo en la fuente.
         */}
        <div>
          <label htmlFor={id('estado')} className="campo-label">
            Condición de la unidad
          </label>
          <select
            id={id('estado')}
            className="campo"
            value={filtros.estado ?? ''}
            onChange={(evento) => onCambio({ estado: evento.target.value as EstadoUnidad | '' })}
          >
            <option value="">Todas las condiciones</option>
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
            // h-5 y no h-4: 16px es un blanco chico para el pulgar. El
            // `<label>` que lo envuelve ya hace clickeable todo el texto, así
            // que el área real es grande; esto es para quien apunta a la caja.
            className="h-5 w-5 rounded-sm accent-rojo"
            checked={filtros.financiacion === 'Disponible'}
            onChange={(evento) =>
              onCambio({ financiacion: evento.target.checked ? 'Disponible' : '' })
            }
          />
          <span className="text-sm text-gris-600">Sólo con financiación disponible</span>
        </label>
      </GrupoFiltros>
    </div>
  );
}

/**
 * La columna de la izquierda, sólo en desktop. Sigue el scroll pegada arriba:
 * cambiar un filtro después de bajar tres filas de tarjetas no obliga a subir.
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
  return (
    <aside aria-label="Filtros del catálogo" className="hidden lg:sticky lg:top-24 lg:block">
      <div className="rounded-lg bg-white p-5 shadow-nivel-1">
        <div className="flex items-baseline justify-between">
          <h2 className="titulo-tarjeta">Filtros</h2>
          <button
            type="button"
            onClick={onLimpiar}
            disabled={!hayFiltrosPuestos(filtros)}
            className="-my-1 py-1 text-sm font-medium text-rojo transition-opacity hover:opacity-70 disabled:pointer-events-none disabled:text-gris-300"
          >
            Limpiar
          </button>
        </div>

        <div className="mt-5">
          <CamposFiltros
            filtros={filtros}
            opciones={opciones}
            sucursales={sucursales}
            onCambio={onCambio}
            idPrefijo="filtro"
          />
        </div>

        <p className="mt-5 border-t border-gris-200 pt-4 text-sm text-gris-500">
          <span className="dato font-medium text-negro">{resultados}</span>{' '}
          {resultados === 1 ? 'unidad coincide' : 'unidades coinciden'}
        </p>
      </div>
    </aside>
  );
}
