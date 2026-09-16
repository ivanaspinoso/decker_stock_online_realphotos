import { ErrorDeApi } from '@/lib/rutasur/errores';
import type { AgenciaApi, ImagenApi, VehiculoApi } from '@/lib/rutasur/tipos';
import type {
  EstadoUnidad,
  FichaTecnica,
  IdSucursal,
  TipoUnidad,
  Unidad,
} from '@/lib/types';

/**
 * Traducción del JSON crudo de Ruta Sur al tipo `Unidad` del frontend.
 *
 * Es el ÚNICO lugar del proyecto que sabe cómo se llaman los campos del
 * backend. Si mañana `vehicle_km` pasa a llamarse `vehicle_kms`, se cambia acá
 * y no cambia ni un componente. Por eso el resto del código no puede leer nunca
 * el JSON crudo: lo que sale de acá ya es `Unidad`, o es un error.
 *
 * Las tres decisiones grandes de este archivo, con su porqué:
 *
 * 1. QUÉ ES UNA UNIDAD. La API mezcla en el mismo `/vehiculos` camiones,
 *    neumáticos, cajas, cuatriciclos y dos departamentos en alquiler. El
 *    catálogo publica sólo vehículos de transporte: ver `CATEGORIAS_PUBLICADAS`.
 *
 * 2. NO HAY PRECIO. No existe el campo, ni en el listado ni en el detalle.
 *    Todas las unidades salen con `precio: null`, que la interfaz ya sabe
 *    mostrar como "Consultar". Ver la nota en `precio`.
 *
 * 3. LA SUCURSAL PUEDE SER NULA. La API tiene 11 concesionarias y el sitio
 *    describe 5. Las que no mapean no se descartan: quedan sin sucursal y sus
 *    consultas van al WhatsApp general. Ver `sucursalDe`.
 */

// ===========================================================================
// VOCABULARIOS
// ===========================================================================

/**
 * Qué categorías de la API entran al catálogo, y con qué tipo del sitio.
 *
 * LO QUE QUEDA AFUERA, y por qué: la API publica en el mismo endpoint
 * NEUMÁTICOS (16 avisos), ACCESORIOS (11 — cajas volcadoras, y una pileta),
 * MOTOS, LANCHAS (6 — cuatriciclos y una moto de agua), VIALES (5 — una bomba
 * de hormigón, una terminadora asfáltica, un elevador), BUSES, MOTORHOME (2) e
 * INMUEBLES Y LOTES (2 departamentos en alquiler temporario). Son 42 avisos de
 * 281: el catálogo publica los otros 239.
 *
 * No es un capricho de limpieza. El sitio filtra por año, kilómetros y tipo de
 * unidad: un juego de cubiertas dentro de "Camión" rompe los rangos, los
 * contadores de la home y la comparación lado a lado. Y un departamento en un
 * catálogo de camiones es, sencillamente, otro negocio.
 *
 * BUSES y VIALES son los dos casos discutibles —son vehículos de verdad, que
 * Decker vende—, pero no tienen tipo donde entrar sin mentir: un micro de doble
 * piso listado como "Camión" aparece en el filtro equivocado. Si se decide
 * publicarlos, es agregar el tipo nuevo en `lib/types.ts` y una línea en esta
 * tabla; no hay nada más que tocar.
 *
 * Las categorías de remolque se agrupan en "Semi" porque así se llaman en el
 * rubro: un tanque, un sider, un playo y un térmico SON semirremolques. Las
 * volcables van con las bateas, que es el corte que ya hacía el sitio.
 */
const CATEGORIAS_PUBLICADAS: Record<number, TipoUnidad> = {
  1: 'Camión',
  2: 'Semi', // ACOPLADOS
  3: 'Semi', // SEMIRREMOLQUES
  5: 'Semi', // TERMICOS, PAQUETEROS
  6: 'Batea', // BATEAS, TOLVAS
  7: 'Semi', // TANQUES
  9: 'Semi', // CARRETONES Y DEPRIMIDOS
  10: 'Semi', // SIDER
  11: 'Utilitario', // PICK UP, UTILITARIOS
  12: 'Auto/Camioneta', // AUTOS
  17: 'Batea', // BARANDAS VOLCABLES
  18: 'Semi', // PLAYOS
};

/**
 * `vehicle_state` → estado del sitio. La API sólo usa dos valores.
 *
 * "Usado" se publica como "Usado seleccionado" porque es la etiqueta que usa
 * Decker en su sitio para su stock de usados, no una afirmación nueva sobre la
 * unidad. Los otros dos estados del tipo ("Disponible", "Línea actual") quedan
 * sin uso mientras el backend mande sólo estos dos.
 */
const ESTADOS: Record<string, EstadoUnidad> = {
  Nuevo: '0 km',
  Usado: 'Usado seleccionado',
};

/**
 * `company_id` → sucursal del sitio. Verificado contra `GET /agencias`.
 *
 * Las que NO están acá son reales pero el sitio no las describe: el id 9,
 * "Todos los Concesionarios y Sucursales DECKER CAMIONES" (32 unidades, que es
 * un cajón común y no un lugar), y TANDIL, PEHUAJO, COLONIA CAROYA, BUENOS
 * AIRES y SANTA ROSA (9 unidades entre las cinco). Esas unidades se publican
 * igual, sin sucursal: ver `sucursalDe`.
 */
const SUCURSALES_POR_COMPANY: Record<number, IdSucursal> = {
  1: 'bahia-blanca',
  2: 'quequen',
  3: 'allen',
  4: 'comodoro-rivadavia',
  5: 'mar-del-plata',
};

// ===========================================================================
// UNIDADES
// ===========================================================================

/** `true` si esta categoría se publica en el catálogo. */
function esPublicable(crudo: VehiculoApi): boolean {
  // `vehicle_view` es "ONLINE" en todo el stock actual. Se chequea igual: el
  // día que el backend empiece a usar otro valor para las unidades dadas de
  // baja, no queremos publicarlas por no haber mirado.
  if (crudo.vehicle_view && crudo.vehicle_view !== 'ONLINE') return false;
  return crudo.vehicle_type_id in CATEGORIAS_PUBLICADAS;
}

/**
 * Traduce una unidad de la API al tipo interno.
 *
 * Falla fuerte y con nombre y apellido cuando falta algo que no se puede
 * inventar —el id, el modelo, la foto—: un mapeo tolerante que rellena con `''`
 * produce un catálogo lleno de tarjetas vacías que nadie sabe de dónde salieron,
 * y el error aparece semanas después.
 *
 * La excepción son año, kilómetros y precio, que YA admiten `null` en el tipo:
 * la interfaz muestra "Consultar". Ahí un `null` es información, no un dato que
 * falta.
 */
function mapearUnidad(crudo: VehiculoApi): Unidad {
  const id = Number(crudo.vehicle_id);
  if (!Number.isFinite(id) || id <= 0) {
    throw new ErrorDeApi(
      'formato',
      `Una unidad llegó sin \`vehicle_id\` usable (${JSON.stringify(crudo.vehicle_id)}). ` +
        'El id es la clave con la que se piden el detalle y las fotos.',
    );
  }

  const marca = nombrePropio(crudo.brand_name);
  // El modelo NO se pasa a mayúscula/minúscula: son códigos ("FH 460",
  // "AXOR 2035 S", "HILUX SR 2.8 TDI 6MT") y pasarlos a Capital Case produce
  // "Hilux Sr 2.8 Tdi 6mt", que se lee peor que el original.
  const modelo = crudo.vehicle_model.trim().replace(/\s+/g, ' ');
  if (!modelo) {
    throw new ErrorDeApi('formato', `La unidad ${id} llegó sin \`vehicle_model\`.`);
  }

  const tipo = CATEGORIAS_PUBLICADAS[crudo.vehicle_type_id];
  if (!tipo) {
    throw new ErrorDeApi(
      'formato',
      `La unidad ${id} es de la categoría ${crudo.vehicle_type_id} ` +
        `(${crudo.type_name}), que no se publica. Filtrar con esPublicable() antes de mapear.`,
    );
  }

  const estado = ESTADOS[crudo.vehicle_state.trim()];
  if (!estado) {
    throw new ErrorDeApi(
      'formato',
      `La unidad ${id} trae \`vehicle_state\` = ${JSON.stringify(crudo.vehicle_state)}, ` +
        `que no conocemos. Los valores del backend son: ${Object.keys(ESTADOS).join(', ')}. ` +
        'La equivalencia va en lib/rutasur/mapeo.ts.',
    );
  }

  const imagen = urlDeFoto(crudo.vehicle_thumbnail_url);
  if (!imagen) {
    throw new ErrorDeApi(
      'formato',
      `La unidad ${id} (${marca} ${modelo}) llegó sin foto. La tarjeta del ` +
        'catálogo y la ficha se construyen alrededor de la imagen.',
    );
  }

  return {
    slug: armarSlug(marca, modelo, id),
    nombre: armarNombre(marca, modelo),
    marca,
    modelo,
    tipo,
    categoria: nombrePropio(crudo.type_name),
    estado,

    // `vehicle_year: 0` es "sin año cargado", no el año cero. Son 18 unidades,
    // casi todas remolques, donde el año no es un dato que se publique.
    anio: crudo.vehicle_year > 0 ? crudo.vehicle_year : null,
    km: parsearKm(crudo.vehicle_km),

    /**
     * SIN PRECIO, a propósito y no por olvido.
     *
     * La API no tiene campo de precio en `/vehiculos` ni en `/vehiculos/{id}`.
     * El precio vive en `/precios`, que es protegido y contesta 403 sin API key,
     * y esa key todavía no la tenemos.
     *
     * `null` es exactamente lo que la interfaz necesita: `formatearPrecio(null)`
     * ya muestra "Consultar", y el catálogo esconde solo el filtro y el orden
     * por precio mientras ninguna unidad tenga uno (ver `getOpcionesCatalogo`).
     * El día que se enchufe `/precios`, se completa este campo y los controles
     * vuelven a aparecer sin tocar ningún componente.
     */
    precio: null,
    precioUsd: null,

    sucursalId: sucursalDe(crudo.company_id),

    // Lo decide `marcarDestacadas()` sobre el listado completo, no la unidad
    // suelta: es una posición relativa, no una propiedad de la unidad.
    destacada: false,

    potencia: potenciaDe(crudo.vehicle_power),
    ficha: fichaTecnicaDe(crudo),
    // La API no tiene campo de financiación. Todo sale como "Consultar", que es
    // lo honesto: afirmar "Disponible" sin que nadie lo haya dicho es prometer
    // un crédito. El filtro de financiación se esconde solo mientras no haya
    // ninguna unidad con financiación confirmada.
    financiacion: 'Consultar',
    descripcion: limpio(crudo.vehicle_description),

    imagen,
    // La galería real vive en `GET /vehiculos/{id}/imagenes`, que es OTRA
    // llamada. Traerla acá sería una llamada por unidad: 239 pedidos para armar
    // el catálogo, contra una API que corta las conexiones cuando se le piden
    // muchas cosas seguidas. Arranca con la miniatura y la ficha la completa
    // con `traerGaleria()`.
    galeria: [imagen],
  };
}

/**
 * Un listado crudo entero → las unidades publicables, con las destacadas ya
 * marcadas.
 *
 * Es la puerta que usan el catálogo, la búsqueda y el stock por sucursal. Hace
 * las tres cosas juntas porque la tercera lo exige: "destacada" es una posición
 * RELATIVA dentro del listado, no una propiedad de la unidad suelta, y no se
 * puede resolver mapeando de a una.
 */
export function mapearListado(crudos: VehiculoApi[]): Unidad[] {
  const publicables = crudos.filter(esPublicable);

  // La fecha de alta no sobrevive al mapeo —no es un campo de `Unidad`— así que
  // el orden se calcula acá, sobre el crudo, y se aplica después.
  const masNuevas = new Set(
    [...publicables]
      .sort((a, b) => String(b.vehicle_entry).localeCompare(String(a.vehicle_entry)))
      .slice(0, CANTIDAD_DESTACADAS)
      .map((crudo) => crudo.vehicle_id),
  );

  return publicables.map((crudo) => ({
    ...mapearUnidad(crudo),
    destacada: masNuevas.has(crudo.vehicle_id),
  }));
}

/**
 * Cuántas unidades se marcan como destacadas.
 *
 * POR QUÉ SE CALCULA Y NO SALE DE LA API: `vehicle_destacado` existe en la base
 * pero llega `null` en las 281 unidades —nadie lo carga desde el panel—. Sin un
 * criterio de acá, la home se queda sin nada que mostrar.
 *
 * El criterio es "lo último que entró": se mantiene solo, sin que nadie edite
 * una lista, y es lo que un visitante que ya conoce el stock quiere ver
 * primero. El día que Eduardo empiece a cargar `vehicle_destacado`, esto pasa a
 * leerlo y la home no se entera.
 *
 * Son 8 y la home muestra 6: el sobrante le da a la ordenación por relevancia
 * una banda de "recientes" un poco más ancha que la vidriera.
 */
export const CANTIDAD_DESTACADAS = 8;

// ===========================================================================
// FOTOS
// ===========================================================================

/**
 * La galería de la ficha, a partir de `GET /vehiculos/{id}/imagenes`.
 *
 * Se descartan las privadas y se pone primera la que el backend marcó como
 * portada. La miniatura del listado va adelante de todo si no está ya en la
 * galería: es la foto que el visitante venía mirando en la tarjeta, y que el
 * carrusel arranque en otra se siente como si hubiera entrado a otra unidad.
 *
 * Ojo con las rutas: la miniatura vive en `/uploads/thumb/` y las de la galería
 * en `/uploads/croped/`, así que la MISMA foto tiene dos URLs distintas y la
 * comparación por igualdad no las une. Por eso se comparan por nombre de
 * archivo, no por URL completa.
 */
export function mapearGaleria(crudas: ImagenApi[], miniatura: string): string[] {
  const publicas = crudas
    .filter((imagen) => Number(imagen.image_private) !== 1)
    .sort((a, b) => Number(b.image_primary) - Number(a.image_primary))
    .map((imagen) => urlDeFoto(imagen.image_url))
    .filter(Boolean);

  /**
   * SIN REPETIDAS, y no es una precaución teórica: el backend devuelve la misma
   * foto más de una vez —el mismo archivo cargado dos veces, o dos registros
   * apuntando al mismo `image_url`— y sin esto la ficha muestra un carrusel de
   * "1 / 3" donde las tres son idénticas. El visitante hace clic esperando otra
   * vista del camión y ve la misma foto.
   *
   * Se compara por NOMBRE DE ARCHIVO y no por URL completa, porque la misma
   * foto vive en dos rutas distintas: la miniatura en `/uploads/thumb/` y la de
   * la galería en `/uploads/croped/`. Comparando URLs, esa foto entraría dos
   * veces.
   */
  const vistas = new Set<string>();
  const unicas: string[] = [];
  for (const url of publicas) {
    const nombre = nombreDeArchivo(url);
    if (vistas.has(nombre)) continue;
    vistas.add(nombre);
    unicas.push(url);
  }

  if (unicas.length === 0) return [miniatura];

  // La miniatura sólo se agrega si no está ya en la galería: es la foto que el
  // visitante venía mirando en la tarjeta, y que el carrusel arranque en otra
  // se siente como si hubiera entrado a otra unidad.
  if (vistas.has(nombreDeArchivo(miniatura))) return unicas;
  return [miniatura, ...unicas];
}

/**
 * Deja la URL de una foto lista para `next/image`.
 *
 * LAS URLs DE ESTA API TRAEN ESPACIOS SIN ESCAPAR: los archivos se subieron con
 * el nombre que les puso WhatsApp ("...WhatsApp Image 2025-06-05 at 15.10.09.jpeg")
 * y el backend los devuelve tal cual. Sin codificar, el optimizador de imágenes
 * de Next las rechaza como URL inválida y la tarjeta queda sin foto.
 *
 * `encodeURI` y no `encodeURIComponent`: hay que escapar los espacios dejando
 * en paz los `:` y las `/` de la URL. Si ya viene codificada —hoy ninguna lo
 * está, pero podría cambiar— se deja como está para no escapar los `%`.
 */
function urlDeFoto(url: unknown): string {
  if (typeof url !== 'string') return '';
  const limpia = url.trim();
  if (!limpia) return '';
  if (!/^https?:\/\//i.test(limpia)) return '';
  return limpia.includes('%') ? limpia : encodeURI(limpia);
}

function nombreDeArchivo(url: string): string {
  return url.slice(url.lastIndexOf('/') + 1);
}

// ===========================================================================
// AGENCIAS
// ===========================================================================

/**
 * Los WhatsApp reales de cada concesionaria, indexados por sucursal del sitio.
 *
 * `lib/data/sucursales.ts` tiene los números cargados a mano, y las direcciones
 * y coordenadas se quedan ahí: la API manda `company_lat` y `company_long`
 * VACÍOS en las 11 agencias, así que no sirve para el mapa. Lo que sí conviene
 * tomar de la API es el número de WhatsApp, que es el dato que cambia.
 *
 * Devuelve sólo lo que está cargado: un `"0"` —que es lo que la API manda en
 * los WhatsApp de taller y repuestos— no es un número, es un campo sin
 * completar, y mandar a alguien a `wa.me/0` es peor que no ofrecer el botón.
 */
export function mapearWhatsappDeAgencias(agencias: AgenciaApi[]): Map<IdSucursal, string> {
  const porSucursal = new Map<IdSucursal, string>();

  for (const agencia of agencias) {
    const id = SUCURSALES_POR_COMPANY[agencia.company_id];
    if (!id) continue;
    const numero = (agencia.company_whasapp ?? '').replace(/\D/g, '');
    if (numero.length >= 10) porSucursal.set(id, numero);
  }

  return porSucursal;
}

/** `company_id` → sucursal del sitio, o `null` si no es una de las cinco. */
function sucursalDe(companyId: number): IdSucursal | null {
  return SUCURSALES_POR_COMPANY[companyId] ?? null;
}

// ===========================================================================
// PIEZAS
// ===========================================================================

/**
 * `"VOLVO"` → `"Volvo"`, `"MERCEDES BENZ"` → `"Mercedes Benz"`.
 *
 * La API manda todo en mayúsculas y el sitio escribe los nombres propios como
 * nombres propios. Una palabra SIN VOCALES se deja en mayúscula: son siglas
 * ("XCMG", "JCB") y "Xcmg" no es el nombre de nadie.
 */
function nombrePropio(texto: string): string {
  return texto
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((palabra) =>
      /[AEIOUÁÉÍÓÚ]/i.test(palabra)
        ? palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase()
        : palabra,
    )
    .join(' ');
}

/**
 * El título de la unidad: marca y modelo, sin repetir la marca.
 *
 * Hay avisos cuyo modelo ya nombra la marca ("TODA LA LINEA VOLVO 0KM"), y
 * "Volvo TODA LA LINEA VOLVO 0KM" se lee como un error de carga.
 */
function armarNombre(marca: string, modelo: string): string {
  const yaLaNombra = modelo.toUpperCase().includes(marca.toUpperCase());
  return yaLaNombra ? modelo : `${marca} ${modelo}`;
}

/**
 * El slug de la ficha: `volvo-fh-460-3455`.
 *
 * EL ID VA AL FINAL Y NO ES DECORATIVO. Es lo que hace el slug único —hay
 * cuatro avisos distintos con el modelo "BARANDAS VOLCABLES"— y, sobre todo, es
 * de donde se saca el `vehicle_id` para pedir el detalle y las fotos
 * (`idDeSlug()`). Sin él habría que recorrer el catálogo entero para resolver
 * una ficha.
 */
function armarSlug(marca: string, modelo: string, id: number): string {
  const base = `${marca} ${modelo}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');

  return base ? `${base}-${id}` : `unidad-${id}`;
}

/**
 * Saca el `vehicle_id` de un slug. Es la inversa de `armarSlug`.
 *
 * Devuelve `null` si el slug no termina en un número: puede ser un link viejo,
 * uno escrito a mano o un favorito guardado cuando el catálogo salía de los
 * datos de prueba. Ahí la ficha muestra 404, que es lo correcto.
 */
export function idDeSlug(slug: string): number | null {
  const coincidencia = /-(\d+)$/.exec(slug.trim());
  if (!coincidencia) return null;
  const id = Number(coincidencia[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/**
 * `"1.145.960"` → `1145960`. `"0KM"` → `0`. `""`, `"-"` → `null`.
 *
 * El kilometraje llega como TEXTO con puntos de miles, y a veces con letras
 * pegadas o un guión que quiere decir "no corresponde". Un `Number("1.145.960")`
 * da `NaN` y termina en pantalla como "NaN km".
 */
function parsearKm(valor: unknown): number | null {
  if (typeof valor !== 'string') return null;
  const digitos = valor.replace(/\D/g, '');
  if (digitos === '') return null;
  const numero = Number(digitos);
  return Number.isFinite(numero) ? numero : null;
}

/**
 * `"380"` → `"380 CV"`. `"280 HASTA 540"` se deja como está.
 *
 * La API manda la potencia como un número pelado en la mayoría de las unidades,
 * y un "380" suelto en la ficha, al lado del año y los kilómetros, no dice de
 * qué es. Sólo se le agrega la unidad cuando es un número solo: los textos
 * ("280 HASTA 540") ya se explican.
 */
function potenciaDe(valor: string): string | undefined {
  const limpio = valor.trim().replace(/\s+/g, ' ');
  if (!limpio) return undefined;
  return /^\d+$/.test(limpio) ? `${limpio} CV` : limpio;
}

/**
 * Los datos técnicos, campo por campo.
 *
 * ANTES ESTO SE CONCATENABA EN LA DESCRIPCIÓN y salía como un párrafo:
 * "Volvo FM 380 4X2. Tracción: 4 X 2. Combustible: DIESEL. Frenos: DISCO...".
 * Tres problemas: empezaba repitiendo el nombre que ya encabeza la ficha, no se
 * podía comparar entre unidades —cada dato en un lugar distinto del párrafo— y
 * mezclaba la voz de Decker con datos de planilla.
 *
 * Como campos, cada uno cae en su fila de la tabla y la descripción vuelve a
 * ser lo que dice el aviso.
 *
 * `"NO"` y `"-"` se descartan: es lo que carga el backend cuando el campo no
 * aplica, y no es un dato —"Dirección: NO" no le dice nada a nadie—.
 */
function fichaTecnicaDe(crudo: VehiculoApi): FichaTecnica {
  const ficha: FichaTecnica = {};

  const poner = (clave: keyof FichaTecnica, valor: unknown) => {
    const texto = limpio(valor);
    if (texto && texto !== 'NO' && texto !== '-') ficha[clave] = texto;
  };

  poner('traccion', crudo.vehicle_traction);
  poner('combustible', crudo.vehicle_fuel);
  poner('frenos', crudo.vehicle_brake);
  poner('direccion', crudo.vehicle_direction);
  poner('color', crudo.vehicle_color);
  poner('largo', crudo.vehicle_long);
  poner('motor', crudo.vehicle_motor);
  poner('equipamiento', crudo.vehicle_equipment);

  return ficha;
}

/** Recorta y normaliza los espacios. `''` si no es texto. */
function limpio(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : '';
}
