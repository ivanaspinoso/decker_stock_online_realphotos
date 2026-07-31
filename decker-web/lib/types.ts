/**
 * Contratos de dominio.
 *
 * Estas interfaces son el punto de corte entre los componentes y el origen de
 * datos. Hoy los datos viven en `lib/data/*`; cuando se conecte Airtable (u
 * otra fuente) sólo cambia la implementación de `lib/api.ts`, no estos tipos ni
 * los componentes que los consumen. Por eso los campos usan nombres de negocio
 * y no nombres de columna de ninguna base en particular.
 */

/**
 * Vocabulario de tipos del sitio original. Se conserva tal cual, salvo que ahí
 * "Camión 0 km" y "Camión usado" mezclaban tipo con estado: acá el estado es un
 * campo aparte (`EstadoUnidad`) y se puede filtrar por los dos por separado.
 */
export type TipoUnidad =
  | 'Camión'
  | 'Semi'
  | 'Batea'
  | 'Utilitario'
  | 'Auto/Camioneta';

/** Estados del sitio original. */
export type EstadoUnidad =
  | '0 km'
  | 'Usado seleccionado'
  | 'Disponible'
  | 'Línea actual';

export type IdSucursal =
  | 'bahia-blanca'
  | 'quequen'
  | 'mar-del-plata'
  | 'allen'
  | 'comodoro-rivadavia';

export interface Asesor {
  nombre: string;
  /** Número en formato internacional sin `+` ni separadores. Ej: `5492914...`. */
  whatsapp: string;
}

export interface Sucursal {
  id: IdSucursal;
  nombre: string;
  direccion: string;
  localidad: string;
  provincia: string;
  /**
   * Coordenadas para centrar el mapa embebido. Son APROXIMADAS: hay que
   * reemplazarlas por las exactas de cada predio (ver README).
   */
  coordenadas: { lat: number; lng: number };
  /** Asesor comercial al que derivan las consultas de esta sucursal. */
  asesor: Asesor;
}

export interface Unidad {
  /** Identificador estable y legible. Se usa en la URL de la ficha. */
  slug: string;
  nombre: string;
  marca: string;
  modelo: string;
  tipo: TipoUnidad;
  estado: EstadoUnidad;
  /**
   * Los tres campos siguientes admiten `null` porque las unidades que vienen
   * del sitio original no los tenían cargados: ahí se muestra "Consultar" y no
   * un número inventado.
   */
  anio: number | null;
  km: number | null;
  /** Precio en pesos argentinos. */
  precio: number | null;
  sucursalId: IdSucursal;
  /** Marca la unidad para la home. El resto sólo aparece en el catálogo. */
  destacada: boolean;
  /** Campo "Potencia / Uso" del sitio original. */
  potencia?: string;
  /** Campo "Financiación" del sitio original: "Disponible" o "Consultar". */
  financiacion: 'Disponible' | 'Consultar';
  descripcion: string;
  /** Ruta pública de la foto principal. Primera imagen de la galería. */
  imagen: string;
  /** Galería de la ficha. Incluye `imagen` como primer elemento. */
  galeria: string[];
}

/**
 * Versión mínima de `Unidad` para las sugerencias del buscador. Se manda al
 * cliente entera, así que sólo lleva los campos que se muestran o se buscan.
 */
export interface SugerenciaUnidad {
  slug: string;
  nombre: string;
  marca: string;
  modelo: string;
  tipo: TipoUnidad;
  estado: EstadoUnidad;
  sucursalId: IdSucursal;
}

export interface FiltrosCatalogo {
  /** Texto libre contra nombre, marca y modelo. */
  busqueda?: string;
  tipo?: TipoUnidad | '';
  marca?: string;
  sucursalId?: IdSucursal | '';
  estado?: EstadoUnidad | '';
  /** `'Disponible'` deja sólo las unidades con financiación confirmada. */
  financiacion?: 'Disponible' | '';
  anioDesde?: number;
  anioHasta?: number;
  precioDesde?: number;
  precioHasta?: number;
  orden?: OrdenCatalogo;
}

export type OrdenCatalogo =
  | 'relevancia'
  | 'precio-asc'
  | 'precio-desc'
  | 'anio-desc'
  | 'km-asc';

export interface ParametrosFinanciacion {
  /** Tasa nominal anual orientativa, en porcentaje. */
  tasaAnualPorDefecto: number;
  /** Plazos ofrecidos, en cantidad de cuotas mensuales. */
  plazosDisponibles: number[];
  plazoPorDefecto: number;
  /** Porcentaje mínimo de anticipo sobre el valor de la unidad. */
  anticipoMinimoPorcentaje: number;
  /** Anticipo sugerido al abrir la calculadora, en porcentaje. */
  anticipoSugeridoPorcentaje: number;
  /** Texto legal que acompaña todo resultado de la simulación. */
  leyenda: string;
}

export interface ResultadoFinanciacion {
  /** Valor de la unidad menos el anticipo. Nunca negativo. */
  montoAFinanciar: number;
  cuotaMensual: number;
  /** `cuotaMensual * plazo`. */
  totalAPagar: number;
  /** `totalAPagar - montoAFinanciar`. */
  costoFinanciero: number;
  plazo: number;
  tasaAnual: number;
  /** Tasa efectiva mensual usada en el cálculo, en porcentaje. */
  tasaMensual: number;
}

/** Rangos derivados del stock, para armar los controles del catálogo. */
export interface OpcionesCatalogo {
  tipos: TipoUnidad[];
  marcas: string[];
  estados: EstadoUnidad[];
  anioMin: number;
  anioMax: number;
  precioMin: number;
  precioMax: number;
}
