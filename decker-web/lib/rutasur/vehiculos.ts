import { exigirColeccion, pedir } from '@/lib/rutasur/cliente';
import {
  SEGUNDOS_DE_REVALIDACION_FOTOS,
  TAMANIO_DE_PAGINA,
  TOPE_DE_LISTADO,
} from '@/lib/rutasur/config';
import { mapearGaleria, mapearListado } from '@/lib/rutasur/mapeo';
import type { ImagenApi, VehiculoApi } from '@/lib/rutasur/tipos';
import type { Unidad } from '@/lib/types';

/**
 * El stock, desde la API de Ruta Sur.
 *
 * TODAS las llamadas pasan por `pedir()` de `cliente.ts`: acá no hay un solo
 * `fetch`. Lo que sale de este módulo ya es `Unidad`.
 */

/** Las rutas, todas juntas y arriba, para no salir a buscarlas por el archivo. */
const RUTAS = {
  listado: '/vehiculos',
  busqueda: '/vehiculos/search',
  imagenes: (id: number) => `/vehiculos/${id}/imagenes`,
} as const;

/**
 * `GET /vehiculos/{id}` tampoco está acá, y es a propósito.
 *
 * La ficha se resuelve buscando en el catálogo cacheado, que ya tiene todos los
 * campos de la unidad: el detalle devuelve exactamente la misma forma y no
 * agrega nada. Peor: un id que no existe se cuelga 21 segundos en vez de
 * contestar 404, así que usarlo convertía cada link de un camión vendido en 21
 * segundos de espera. Quien resuelve la ficha es `getUnidadPorSlug` en
 * `lib/api.ts`, buscando en el catálogo.
 */

/**
 * `GET /agencias/{id}/vehiculos` no está acá a propósito. Devuelve el stock de
 * una sucursal, y el filtro por sucursal del catálogo ya lo resuelve en memoria
 * sobre el listado que está cacheado: pedirlo de nuevo sería una llamada más
 * para obtener un subconjunto de lo que ya tenemos.
 */

/**
 * Filtros que la API sabe aplicar del lado del servidor.
 *
 * CUÁNDO CONVIENE USARLOS, que es casi nunca: el catálogo se pide ENTERO y se
 * filtra en memoria, igual que cuando los datos eran locales. Con 239 unidades
 * publicadas, una sola respuesta cacheada cinco minutos alcanza para el
 * catálogo, el comparador, el buscador y los contadores de la home; filtrar del
 * lado del servidor significaría una llamada nueva por cada clic en un filtro,
 * contra una API que corta las conexiones cuando se le piden muchas cosas
 * seguidas.
 *
 * Existen igual porque el día que el stock crezca a miles, este es el lugar
 * donde se empieza a filtrar y paginar de verdad, y ningún componente se entera.
 */
export interface FiltrosDeApi {
  /** Deja pasar los parámetros sueltos que arma `traerCrudos` (`query`, por ejemplo). */
  [parametro: string]: string | number | undefined;
  /** `type_id` de la categoría. Ojo: es la categoría de la API, no `TipoUnidad`. */
  type?: number;
  /** `brand_id`. */
  brand?: number;
  /** `"Nuevo"` o `"Usado"`, el vocabulario del backend. */
  state?: string;
  model?: string;
  year?: number;
  /** `type_group`: `"camiones"`, `"remolques"`, `"plus"`. */
  group?: string;
}

/**
 * El stock completo, ya traducido y con las destacadas marcadas.
 *
 * Trae 239 unidades de las 281 que devuelve la API: las otras 42 son
 * neumáticos, accesorios, cuatriciclos y dos departamentos, que no van al
 * catálogo de camiones (ver `CATEGORIAS_PUBLICADAS` en `mapeo.ts`).
 */
export async function traerCatalogo(filtros: FiltrosDeApi = {}): Promise<Unidad[]> {
  return mapearListado(await traerCrudos(RUTAS.listado, filtros));
}

/**
 * Búsqueda por texto contra `GET /vehiculos/search`.
 *
 * Hoy el buscador del hero filtra en memoria sobre el índice que ya tiene en la
 * página, que es instantáneo y no pega a la API con cada tecla. Esto queda para
 * cuando el índice no entre entero en el cliente.
 *
 * Una búsqueda sin coincidencias devuelve `[]`, no un error: esta API contesta
 * con el CUERPO VACÍO en ese caso, y `cliente.ts` ya lo traduce a colección
 * vacía. "No encontramos nada" es un resultado, no una falla.
 */
export async function buscarEnCatalogo(texto: string): Promise<Unidad[]> {
  const consulta = texto.trim();
  if (!consulta) return [];

  // `pedir()` codifica el término con encodeURIComponent, tal como pide la
  // documentación: sin eso, un "volvo fh 6x4" rompe la URL.
  return mapearListado(await traerCrudos(RUTAS.busqueda, { query: consulta }));
}

/**
 * La galería de la ficha. Una llamada más, sólo en la ficha.
 *
 * NO se trae en el listado a propósito: sería una llamada por unidad, 239
 * pedidos para armar el catálogo, contra una API que corta las conexiones
 * cuando se le piden muchas cosas seguidas. La tarjeta muestra la miniatura y
 * la ficha completa el carrusel.
 *
 * Si la llamada falla, se devuelve la miniatura sola en vez de propagar el
 * error: la ficha con una foto es una ficha usable, y tirar la pantalla de
 * error por un carrusel incompleto es desproporcionado. Queda en el log.
 */
export async function traerGaleria(id: number, miniatura: string): Promise<string[]> {
  try {
    // Un día de caché, no cinco minutos: es una llamada por unidad y son 239.
    // Ver `SEGUNDOS_DE_REVALIDACION_FOTOS`.
    const cuerpo = await pedir(RUTAS.imagenes(id), {
      revalidar: SEGUNDOS_DE_REVALIDACION_FOTOS,
    });
    const crudas = exigirColeccion(cuerpo) as ImagenApi[];
    return mapearGaleria(crudas, miniatura);
  } catch (error) {
    console.error(`[rutasur] No se pudieron traer las fotos de la unidad ${id}:`, error);
    return [miniatura];
  }
}

// ===========================================================================

/**
 * Pide un listado ENTERO y devuelve los crudos, paginando.
 *
 * ACÁ ESTÁ LA TRAMPA MÁS CARA DE ESTA API, y costó 156 unidades antes de
 * encontrarla. Su paginación se comporta de tres maneras distintas según qué
 * parámetros le mandes, todas silenciosas:
 *
 *   `?limit=5000`              → 281. El `limit` solo se IGNORA.
 *   `?offset=0&limit=5000`     → 100. Con `offset`, el `limit` se aplica…
 *                                 y se TOPA en 100 sin avisar.
 *   sin parámetros             → 281.
 *
 * O sea que el "traeme todo" más obvio —un `limit` bien grande con su
 * `offset=0`— devuelve una respuesta 200, con forma correcta, y le faltan dos
 * tercios del stock. Nada falla: el catálogo simplemente muestra menos
 * camiones de los que Decker tiene, y nadie se entera.
 *
 * Por eso se pagina de verdad, de a `TAMANIO_DE_PAGINA`, hasta que una página
 * vuelve incompleta. Son tres pedidos para 239 unidades, una vez cada cinco
 * minutos: nada al lado del riesgo de publicar medio catálogo. Y sigue andando
 * si mañana el tope cambia, que es lo que no se puede decir de pedir todo de
 * una y confiar.
 *
 * Lo que NO se hace: pedir sin parámetros aprovechando que hoy devuelve las
 * 281. Es la misma apuesta que ya nos falló, sólo que con otro número.
 */
async function traerCrudos(ruta: string, filtros: FiltrosDeApi = {}): Promise<VehiculoApi[]> {
  const todas: VehiculoApi[] = [];

  for (let offset = 0; offset < TOPE_DE_LISTADO; offset += TAMANIO_DE_PAGINA) {
    const cuerpo = await pedir(ruta, {
      query: { ...filtros, offset, limit: TAMANIO_DE_PAGINA },
    });
    const pagina = exigirColeccion(cuerpo) as VehiculoApi[];
    todas.push(...pagina);

    // Una página incompleta es la última. Es el único final que la API da: no
    // manda `meta`, ni `total`, ni un `next`.
    if (pagina.length < TAMANIO_DE_PAGINA) return todas;
  }

  // Si se llegó acá, el stock superó el tope y estaríamos publicando de menos
  // otra vez. Es exactamente el error que este módulo existe para no repetir,
  // así que se grita en el log en vez de devolver una lista a medias callado.
  console.error(
    `[rutasur] El listado ${ruta} superó las ${TOPE_DE_LISTADO} unidades y se cortó. ` +
      'Subir TOPE_DE_LISTADO en lib/rutasur/config.ts.',
  );
  return todas;
}
