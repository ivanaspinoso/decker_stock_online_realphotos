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

/**
 * Los datos técnicos de una unidad, tal como los publica Decker.
 *
 * Cada campo es opcional porque la carga del backend es despareja: el
 * equipamiento aparece en 3 unidades de 240 y la tracción en 204. La ficha
 * dibuja sólo las filas que tienen dato —una tabla llena de "Consultar" no
 * informa, ocupa—.
 */
export interface FichaTecnica {
  traccion?: string;
  combustible?: string;
  frenos?: string;
  direccion?: string;
  color?: string;
  /** Largo o configuración: "12 METROS", "TRACTOR", "CHASIS". */
  largo?: string;
  motor?: string;
  equipamiento?: string;
}

export interface Unidad {
  /** Identificador estable y legible. Se usa en la URL de la ficha. */
  slug: string;
  nombre: string;
  marca: string;
  modelo: string;
  tipo: TipoUnidad;
  /**
   * La categoría tal como la nombra el backend: "Camiones", "Tanques", "Sider",
   * "Barandas Volcables".
   *
   * `tipo` la resume en las cinco familias con las que el sitio filtra —todos
   * los remolques caen en "Semi"— y eso está bien para un filtro, pero pierde
   * precisión en la ficha, donde un tanque no es lo mismo que un sider. Acá
   * queda el dato fino, para mostrar.
   *
   * Opcional porque los datos de prueba no la tienen.
   */
  categoria?: string;
  estado: EstadoUnidad;
  /**
   * Los tres campos siguientes admiten `null` porque las unidades que vienen
   * del sitio original no los tenían cargados: ahí se muestra "Consultar" y no
   * un número inventado.
   */
  anio: number | null;
  km: number | null;
  /** Precio en pesos argentinos. Es el que se muestra en catálogo y ficha. */
  precio: number | null;
  /**
   * Precio en dólares, si el backend lo manda.
   *
   * Decker cotiza las unidades en USD y la calculadora de financiación trabaja
   * sobre ese número: convierte a pesos con el dólar oficial más margen (ver
   * `lib/financiacion.ts`). No reemplaza a `precio` —la pantalla sigue
   * mostrando pesos— sino que es el insumo de la simulación.
   *
   * `null` cuando la unidad no lo tiene cargado: ahí la calculadora arranca con
   * el campo vacío en vez de convertir el precio en pesos hacia atrás, que
   * sería inventar una cotización que nadie pactó.
   */
  precioUsd: number | null;
  /**
   * La agencia donde está la unidad, o `null`.
   *
   * `null` NO es un dato faltante: el backend tiene once concesionarias y el
   * sitio describe cinco. Las 32 unidades que el backend carga en "Todos los
   * Concesionarios" —un cajón común, no un lugar— y las de las agencias que el
   * sitio no publica quedan así. Se muestran igual en el catálogo, y su consulta
   * va al WhatsApp general en vez de al asesor de una sucursal.
   */
  sucursalId: IdSucursal | null;
  /** Marca la unidad para la home. El resto sólo aparece en el catálogo. */
  destacada: boolean;
  /** Campo "Potencia / Uso" del sitio original. */
  potencia?: string;
  /**
   * La ficha técnica que manda el backend, campo por campo.
   *
   * ANTES ESTO SE APLASTABA EN LA DESCRIPCIÓN. La API trae tracción,
   * combustible, frenos, dirección, color y largo como campos separados —con
   * buena cobertura: tracción en el 85% de las unidades, color en el 74%— y el
   * mapeo los concatenaba en un párrafo cuando el aviso no traía texto propio.
   * El resultado era un bloque de prosa con datos adentro, imposible de
   * comparar entre unidades y que además repetía el nombre del camión.
   *
   * Como campos, la ficha los muestra en su tabla, cada uno en su fila, y quien
   * compara dos unidades encuentra el mismo dato en el mismo lugar.
   *
   * Todos opcionales: ninguno llega en el 100% de las unidades.
   */
  ficha: FichaTecnica;
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
  sucursalId: IdSucursal | null;
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
  /**
   * Cotización del dólar oficial VENTA, en pesos.
   *
   * No sale de ninguna API todavía: se edita a mano en
   * `lib/data/financiacion.ts` cuando el dólar se mueve.
   */
  dolarOficialVenta: number;
  /**
   * Margen que Decker le suma al dólar oficial para armar la cotización de la
   * simulación, en porcentaje. Decisión comercial, no constante financiera.
   */
  margenDolarPorcentaje: number;

  /** Financiación estándar: tasa NOMINAL anual orientativa, en porcentaje. */
  tasaAnualPorDefecto: number;
  /**
   * Financiación estándar: puntos de interés que se suman por mes por encima
   * de la tasa anual, en porcentaje. Ver `tasaMensualEfectiva`.
   */
  interesMensualAdicionalPorDefecto: number;

  /** Plazos ofrecidos, en cantidad de cuotas mensuales. Los usan las dos modalidades. */
  plazosDisponibles: number[];
  plazoPorDefecto: number;

  /** Financiación estándar: porcentaje mínimo de anticipo sobre el valor. */
  anticipoMinimoPorcentaje: number;
  /** Financiación estándar: anticipo sugerido al abrir la calculadora, en porcentaje. */
  anticipoSugeridoPorcentaje: number;

  /** Leasing: tasa NOMINAL anual, en porcentaje. Editable en la calculadora. */
  tasaAnualLeasingPorDefecto: number;
  /** Leasing: cuánto sube la cuota cada mes, en porcentaje. Editable. */
  aumentoMensualLeasingPorDefecto: number;
  /**
   * Leasing: IVA del BIEN, en porcentaje. Se le SACA al valor de lista para
   * llegar al neto —dividiendo, no restando—. No confundir con el de abajo:
   * son alícuotas distintas en momentos distintos. Ver `calcularLeasing`.
   */
  ivaBienPorcentaje: number;
  /** Leasing: IVA del ALQUILER, en porcentaje. Se suma al final, sobre la cuota. */
  ivaAlquilerPorcentaje: number;
  /**
   * Leasing: pago final con el que se ejerce la compra, en porcentaje del valor
   * del valor en dólares. FIJO por definición de la modalidad: vive acá
   * para que no quede suelto en medio de una fórmula, no para que se toque.
   */
  pagoFinalLeasingPorcentaje: number;

  /**
   * Importe EN DÓLARES que la calculadora muestra como PLACEHOLDER cuando no se
   * abre desde una unidad. Es un ejemplo en gris, no un valor cargado: enseña
   * el formato y el orden de magnitud sin afirmar un precio que nadie eligió.
   *
   * Tiene que ser verosímil contra el stock publicado: un ejemplo fuera de
   * escala enseña mal el formato.
   */
  valorEjemploUsd: number;

  /** Texto legal que acompaña todo resultado de la simulación, en las dos modalidades. */
  leyenda: string;
}

/** Modalidad de pago elegida en la calculadora. */
export type ModalidadFinanciacion = 'estandar' | 'leasing';

export interface ResultadoFinanciacion {
  /** Valor de la unidad tal como se cargó, en dólares. */
  valorUsd: number;
  /** `valorUsd * cotizacionAplicada`. */
  valorPesos: number;
  /** Pesos por dólar usados: oficial venta más margen. */
  cotizacionAplicada: number;
  /** Entrega inicial convertida a pesos. */
  anticipoPesos: number;
  /** Valor en pesos menos la entrega. Nunca negativo. */
  montoAFinanciar: number;
  cuotaMensual: number;
  /** `cuotaMensual * plazo`. */
  totalAPagar: number;
  /** `totalAPagar - montoAFinanciar`. */
  costoFinanciero: number;
  plazo: number;
  /** Tasa nominal anual, en porcentaje. */
  tasaAnual: number;
  /** Puntos mensuales adicionales, en porcentaje. */
  interesMensualAdicional: number;
  /** Tasa efectiva mensual usada en el cálculo, en porcentaje. */
  tasaMensual: number;
}

export interface ResultadoLeasing {
  valorUsd: number;
  /** El valor de lista en pesos, con IVA. Sólo para mostrar de referencia. */
  valorPesos: number;
  cotizacionAplicada: number;
  plazo: number;
  /** Tasa nominal anual aplicada, en porcentaje. */
  tasaAnual: number;
  /** Cuánto sube la cuota cada mes, en porcentaje. */
  aumentoMensual: number;
  /** El 70% en dólares, ya sin el IVA del bien. Es lo que se financia. */
  capitalUsd: number;
  /** El mismo capital en pesos. */
  capitalPesos: number;
  /** La cuota antes del aumento acumulado y antes del IVA del alquiler. */
  cuotaBase: number;
  /** Cuota del mes 1, con IVA del alquiler. Sin ajuste: se paga al arrancar. */
  primeraCuota: number;
  /** Cuota del último mes, con el aumento acumulado y el IVA del alquiler. */
  ultimaCuota: number;
  /** Suma de las `plazo` cuotas. */
  totalCuotas: number;
  /** 3 si la unidad es 0 km, 1 si es usada. */
  cuotasDeCanon: number;
  /** El primer pago: `cuotasDeCanon` cuotas juntas. */
  canonInicial: number;
  /** El 30% en dólares, ya sin el IVA del bien. */
  pagoFinalUsd: number;
  /** El pago con el que se ejerce la compra, en pesos. Va aparte de las cuotas. */
  pagoFinal: number;
  pagoFinalPorcentaje: number;
  /** Cuotas + las que adelanta el canon + pago final. */
  totalOperacion: number;
}


/**
 * Rangos derivados del stock, para armar los controles del catálogo.
 *
 * Los rangos son NULOS cuando ninguna unidad publicada tiene ese dato cargado,
 * y eso no es un caso hipotético: hoy la API no devuelve precio en ningún
 * endpoint público, así que `precioMin` y `precioMax` llegan en `null` y el
 * catálogo esconde el filtro y el orden por precio.
 *
 * Esconderlo es lo correcto y no una degradación: un rango de precios sobre un
 * stock donde ninguna unidad tiene precio deja la lista vacía apenas se toca,
 * porque una unidad sin precio no puede afirmarse dentro del rango. El día que
 * se enchufe `/precios`, estos campos dejan de ser `null` y los controles
 * vuelven solos. Ningún componente cambia.
 */
export interface OpcionesCatalogo {
  tipos: TipoUnidad[];
  marcas: string[];
  estados: EstadoUnidad[];
  anioMin: number | null;
  anioMax: number | null;
  precioMin: number | null;
  precioMax: number | null;
  /** `true` si alguna unidad tiene financiación confirmada. Gobierna su filtro. */
  hayFinanciacion: boolean;
}

/**
 * Los accesos del catálogo de la home.
 *
 * NO es una taxonomía: es la lista de puertas de entrada al stock, y por eso
 * mezcla ejes a propósito. Se entra por estado (0 km, usados), por tipo (semis,
 * bateas) o por marca, porque así es como se pregunta por un camión: nadie
 * empieza eligiendo una dimensión y después la otra.
 *
 * Autos, camionetas y utilitarios no tienen acceso propio: siguen en el
 * catálogo y en su filtro por tipo, pero no en esta lista.
 */
export interface AccesosCatalogo {
  ceroKm: number;
  usados: number;
  semis: number;
  bateas: number;
  /** Sólo marcas con camiones en stock. Las de semis y bateas no entran acá. */
  marcasDeCamiones: { marca: string; total: number }[];
}
