import { cache } from 'react';
import { UNIDADES } from '@/lib/data/unidades';
import { SUCURSALES, WHATSAPP_GENERAL } from '@/lib/data/sucursales';
import { PARAMETROS_FINANCIACION } from '@/lib/data/financiacion';
import { usaDatosMock } from '@/lib/rutasur/config';
import { idDeSlug } from '@/lib/rutasur/mapeo';
import { traerCatalogo, traerGaleria } from '@/lib/rutasur/vehiculos';
import { traerWhatsappPorSucursal } from '@/lib/rutasur/agencias';
import { cumpleFiltros, ordenarUnidades } from '@/lib/filtros';
import type { ResumenComparacion } from '@/lib/comparador';
import type {
  FiltrosCatalogo,
  IdSucursal,
  OpcionesCatalogo,
  ParametrosFinanciacion,
  AccesosCatalogo,
  Sucursal,
  SugerenciaUnidad,
  TipoUnidad,
  Unidad,
} from '@/lib/types';

/**
 * Capa de acceso a datos.
 *
 * Es la ÚNICA puerta entre los componentes y el origen de datos. Ningún
 * componente importa `lib/data/*` ni le pega a la API: piden por acá. Por eso
 * estas funciones son `async` desde el primer día, cuando todavía no lo
 * necesitaban.
 *
 * DE DÓNDE SALEN LAS UNIDADES
 *
 * De `cargarUnidades()`, y de ningún otro lado. Es el único punto del proyecto
 * que decide entre el array local y la API de Ruta Sur, y lo decide con el
 * interruptor `NEXT_PUBLIC_USE_MOCK_DATA` (ver `lib/rutasur/config.ts`). El
 * resto de las funciones de este archivo trabajan sobre lo que esa devuelve y
 * no saben —ni tienen que saber— de dónde vino.
 *
 * Sucursales y parámetros de financiación NO salen del catálogo: son datos del
 * proyecto y siguen viviendo en `lib/data/`. Lo único que se le pide a la API
 * sobre las agencias es el número de WhatsApp, que es el dato que cambia.
 *
 * Reglas al modificar:
 * - No exportar los arrays crudos fuera de este módulo.
 * - Este módulo es sólo de servidor: importa todo el dataset y, con la API
 *   conectada, el cliente HTTP. Los componentes cliente reciben las unidades
 *   por props y filtran con `lib/filtros.ts`.
 */

/**
 * El stock, del origen que corresponda. El interruptor vive acá y nada más.
 *
 * ENVUELTO EN `cache()` DE REACT, y no es una optimización opcional.
 *
 * Una sola pantalla llama a esto varias veces: el layout arma la barra del
 * comparador, la página pide el catálogo y `generateMetadata` pide la unidad.
 * Normalmente el `fetch` de Next memoiza esas repeticiones solo, pero nuestro
 * cliente pasa un `AbortSignal` para el timeout y la documentación de Next 16
 * dice que un `signal` DESACTIVA esa memoización. Sin este `cache()`, una sola
 * vista de la ficha dispara tres pedidos al mismo endpoint, contra una API que
 * corta las conexiones cuando se le piden muchas cosas seguidas.
 *
 * `cache()` dura un render; el cacheo entre visitas lo sigue haciendo el
 * `revalidate` del fetch (ver `SEGUNDOS_DE_REVALIDACION`).
 *
 * Puede tirar `ErrorDeApi` cuando los datos vienen de la API: la red falla, el
 * server tarda, el formato cambia. No se atrapa acá a propósito —ver la nota de
 * errores al pie de este archivo—.
 */
const cargarUnidades = cache(async (): Promise<Unidad[]> => {
  if (usaDatosMock()) return UNIDADES;

  try {
    const unidades = await traerCatalogo();
    // Sólo se guarda un stock con contenido: una lista vacía puede ser una
    // respuesta rara de la API y pisaría un respaldo bueno con nada.
    if (unidades.length > 0) ultimoStockBueno = { unidades, cuando: Date.now() };
    return unidades;
  } catch (error) {
    if (!ultimoStockBueno) throw error;

    const minutos = Math.round((Date.now() - ultimoStockBueno.cuando) / 60_000);
    console.warn(
      `[stock] La API no contestó. Se sirve el último stock bueno, de hace ${minutos} ` +
        `minutos (${ultimoStockBueno.unidades.length} unidades). Causa:`,
      error,
    );
    return ultimoStockBueno.unidades;
  }
});

/**
 * El último stock que la API devolvió bien, guardado en memoria del proceso.
 *
 * QUÉ PROBLEMA RESUELVE, Y POR QUÉ NO ALCANZABA CON EL `revalidate`
 *
 * El server de Ruta Sur bloquea por IP cuando se le pide de más, y el bloqueo
 * dura entre veinticinco y cincuenta minutos. El `revalidate` de 300 segundos
 * cubre los primeros cinco: pasados esos, la caché de Next vence, el `fetch`
 * sale, se cuelga veinte segundos contra un puerto que no acepta conexiones y
 * la página termina en la pantalla de error.
 *
 * Es decir: el sitio andaba perfecto y "después de un rato" se caía entero.
 * Medido, no supuesto — es exactamente lo que pasa cuando se prueban los
 * formularios, porque las fotos y la API son la misma máquina.
 *
 * Con esto, un bloqueo deja de ser una caída: el visitante ve el catálogo que
 * había hace un rato.
 *
 * POR QUÉ SIN VENCIMIENTO
 *
 * Porque no hay ningún momento en que un catálogo viejo sea peor que una
 * pantalla de error. Una unidad que ya se vendió sigue dando 404 en su ficha
 * —eso lo resuelve la API cuando vuelve— y el resto del stock cambia de a poco.
 * Un concesionario prefiere mostrar el stock de ayer antes que no mostrar nada.
 *
 * QUÉ NO ES
 *
 * No es la caché principal: esa la sigue haciendo el `revalidate` del `fetch`,
 * que es la que evita pedirle a la API en cada visita. Esto es el paracaídas, y
 * sólo se abre cuando el pedido falla. Si nunca falla, nunca se usa.
 *
 * LIMITACIÓN CONOCIDA: es memoria del proceso. En un hosting con varias
 * instancias cada una tiene la suya, y una instancia recién levantada durante
 * un bloqueo no tiene respaldo y sirve la pantalla de error. Para cubrir eso
 * haría falta un storage compartido (Redis, KV); con este volumen de tráfico no
 * se justifica todavía. El lugar donde cambiarlo es esta variable y el `catch`
 * de arriba: nada más del proyecto se entera.
 */
let ultimoStockBueno: { unidades: Unidad[]; cuando: number } | null = null;


/** Unidades curadas para la home. No es la totalidad del stock. */
export async function getUnidadesDestacadas(limite = 6): Promise<Unidad[]> {
  const unidades = await cargarUnidades();
  return unidades.filter((unidad) => unidad.destacada).slice(0, limite);
}

/** Catálogo completo, con filtros y orden aplicados. */
export async function getCatalogoCompleto(
  filtros: FiltrosCatalogo = {},
): Promise<Unidad[]> {
  const unidades = await cargarUnidades();
  const filtradas = unidades.filter((unidad) => cumpleFiltros(unidad, filtros));
  return ordenarUnidades(filtradas, filtros.orden);
}

export async function getUnidadPorSlug(slug: string): Promise<Unidad | null> {
  const unidades = await cargarUnidades();
  return unidades.find((unidad) => unidad.slug === slug) ?? null;
}

/**
 * Las fotos de la ficha. UNA llamada más, y sólo en la ficha.
 *
 * La galería completa vive en un endpoint aparte (`/vehiculos/{id}/imagenes`),
 * así que traerla en el listado sería un pedido por unidad: 239 para armar el
 * catálogo. La tarjeta se conforma con la miniatura y la ficha completa el
 * carrusel acá.
 *
 * Si la API no contesta, devuelve la galería que la unidad ya traía —la
 * miniatura sola—. Una ficha con una foto es una ficha usable; tirar la
 * pantalla de error por un carrusel incompleto no.
 */
export async function getGaleriaDeUnidad(unidad: Unidad): Promise<string[]> {
  if (usaDatosMock()) return unidad.galeria;

  const id = idDeSlug(unidad.slug);
  if (id === null) return unidad.galeria;

  return traerGaleria(id, unidad.imagen);
}

/** Otras unidades del mismo tipo o de la misma sucursal, para la ficha. */
export async function getUnidadesRelacionadas(
  slug: string,
  limite = 3,
): Promise<Unidad[]> {
  const unidades = await cargarUnidades();
  const base = unidades.find((unidad) => unidad.slug === slug);
  if (!base) return [];

  const puntaje = (unidad: Unidad) =>
    (unidad.tipo === base.tipo ? 2 : 0) +
    // Sólo suma si las dos tienen sucursal: dos unidades "sin sucursal" no
    // están en el mismo lugar, están las dos sin ubicar.
    (base.sucursalId !== null && unidad.sucursalId === base.sucursalId ? 1 : 0);

  return unidades.filter((unidad) => unidad.slug !== slug && puntaje(unidad) > 0)
    .sort((a, b) => puntaje(b) - puntaje(a))
    .slice(0, limite);
}

/**
 * TODOS los slugs publicados. Es lo que va al `sitemap.xml`.
 *
 * Ninguna ficha se prerenderiza —ver el comentario de `dynamic` en
 * `app/unidad/[slug]/page.tsx`— pero las 239 tienen que estar acá igual: que una
 * página se arme a demanda no la hace menos indexable. Confundir "qué se
 * prerenderiza" con "qué existe" ya dejó 231 fichas fuera del sitemap una vez.
 */
export async function getSlugsDeUnidades(): Promise<string[]> {
  const unidades = await cargarSinRomperElBuild();
  return unidades.map((unidad) => unidad.slug);
}

/**
 * El stock para `getSlugsDeUnidades`, o una lista vacía si la API falla.
 *
 * ES EL ÚNICO LUGAR DE ESTE ARCHIVO QUE ATRAPA EL ERROR, y la excepción está
 * bien ganada: acá una falla no significa lo mismo que en el resto del módulo.
 *
 * En una página, "no pudimos consultar el stock" tiene que llegar a la pantalla
 * de error. Acá estamos en el BUILD, armando el `sitemap.xml`, donde tirar no
 * muestra ningún error: **cancela el deploy entero**. Y pasó de verdad, dos
 * veces: un build hecho mientras la API cortaba conexiones se cayó con
 * `Failed to collect page data for /unidad/[slug]`.
 *
 * La lista vacía es una respuesta correcta y no una degradación silenciosa:
 * significa "publicá el sitemap sin unidades". El sitio sale y funciona —las
 * fichas se arman cuando alguien las abre— y el sitemap se rehace completo en
 * el próximo deploy.
 *
 * Queda en el log del build para que nadie se entere tarde.
 */
async function cargarSinRomperElBuild(): Promise<Unidad[]> {
  try {
    return await cargarUnidades();
  } catch (error) {
    console.error(
      '[build] No se pudo traer el stock. El sitio se publica igual: las fichas se ' +
        'generan a demanda y el sitemap sale sin unidades. Causa:',
      error,
    );
    return [];
  }
}

/**
 * Índice mínimo para las sugerencias del buscador del hero.
 *
 * Va al bundle del cliente, así que lleva sólo lo que se muestra en la lista:
 * nada de galerías, descripciones ni precios. Con este volumen de stock entra
 * entero; si el catálogo crece a miles de unidades, esto pasa a ser un endpoint
 * de búsqueda (`buscarEnCatalogo` ya está escrito) y el componente no cambia.
 */
export async function getIndiceBuscador(): Promise<SugerenciaUnidad[]> {
  const unidades = await cargarUnidades();
  return unidades.map((unidad) => ({
    slug: unidad.slug,
    nombre: unidad.nombre,
    marca: unidad.marca,
    modelo: unidad.modelo,
    tipo: unidad.tipo,
    estado: unidad.estado,
    sucursalId: unidad.sucursalId,
  }));
}

/**
 * Resumen de TODAS las unidades: lo mínimo para ponerlas al lado o dibujarlas
 * chiquitas, sin galerías ni descripciones.
 *
 * Lo consumen el comparador y la franja de vistas recientes, que son dos
 * funciones del navegador: la lista de slugs vive en `localStorage` y no sabe
 * nada de las unidades, así que los datos tienen que estar ya en la página
 * cuando esa lista se lee.
 *
 * Es también lo que resuelve los favoritos de unidades que ya se vendieron: un
 * slug guardado que no aparece en este resumen es una unidad que ya no está, y
 * el componente la saca de la lista sin mostrar nada roto (ver
 * `VistosRecientemente` y `BarraComparador`).
 */
export async function getResumenDeUnidades(): Promise<ResumenComparacion[]> {
  const unidades = await cargarUnidades();
  return unidades.map((unidad) => ({
    slug: unidad.slug,
    nombre: unidad.nombre,
    marca: unidad.marca,
    modelo: unidad.modelo,
    tipo: unidad.tipo,
    estado: unidad.estado,
    anio: unidad.anio,
    km: unidad.km,
    precio: unidad.precio,
    sucursalId: unidad.sucursalId,
    imagen: unidad.imagen,
  }));
}

/**
 * Las cinco agencias, con el WhatsApp que tenga la API.
 *
 * Direcciones, localidades y coordenadas siguen saliendo de `lib/data/`: la API
 * manda `company_lat` y `company_long` VACÍOS en las once agencias, así que no
 * alcanza para el mapa, y los nombres vienen con numeración interna ("BAHIA
 * BLANCA II.") que no es para publicar.
 *
 * Lo que sí se toma de la API es el número de WhatsApp, que es el dato que
 * cambia y que, cuando cambia, cambia del lado de Decker y no en este repo. Si
 * la API no contesta, quedan los números del repo: `traerWhatsappPorSucursal()`
 * devuelve un mapa vacío en vez de tirar, justamente para eso.
 */
export const getSucursales = cache(async (): Promise<Sucursal[]> => {
  if (usaDatosMock()) return SUCURSALES;

  const whatsapps = await traerWhatsappPorSucursal();
  return SUCURSALES.map((sucursal) => {
    const numero = whatsapps.get(sucursal.id);
    return numero ? { ...sucursal, asesor: { ...sucursal.asesor, whatsapp: numero } } : sucursal;
  });
});

export async function getSucursalPorId(id: IdSucursal | null): Promise<Sucursal | null> {
  if (id === null) return null;
  const sucursales = await getSucursales();
  return sucursales.find((sucursal) => sucursal.id === id) ?? null;
}

export async function getParametrosFinanciacion(): Promise<ParametrosFinanciacion> {
  return PARAMETROS_FINANCIACION;
}

/**
 * Valores presentes en el stock, para poblar selects y rangos del catálogo.
 *
 * Se derivan del stock y no de una lista fija: si mañana entra una marca nueva,
 * aparece sola en los filtros, y si se vende la última unidad de una marca, el
 * filtro desaparece. Un select que ofrece una opción sin stock lleva a una
 * lista vacía, que es peor que no ofrecerla.
 *
 * Es también la razón por la que el catálogo NO usa los endpoints
 * `/categorias/{id}/marcas`, `/anios`, `/modelos` y compañía, que existen y
 * andan: esos enumeran todo lo que hay cargado en la base —incluidas las
 * categorías que no publicamos, así que un select armado con ellos ofrece
 * filtrar por una marca de neumáticos— y costarían cinco pedidos más contra una
 * API que se bloquea por volumen.
 *
 * Los rangos van en `null` cuando ninguna unidad tiene el dato. Hoy pasa con el
 * precio —la API no lo devuelve— y el catálogo esconde su filtro y su orden.
 */
export async function getOpcionesCatalogo(): Promise<OpcionesCatalogo> {
  const unidades = await cargarUnidades();

  // Sólo sobre las unidades que tienen el dato cargado. `Math.min()` sin
  // argumentos devuelve `Infinity`, que en un `min` de un input se ve como un
  // año imposible: por eso el rango se calcula sólo si hay de dónde.
  const precios = unidades.map((u) => u.precio).filter((p): p is number => p !== null);
  const anios = unidades.map((u) => u.anio).filter((a): a is number => a !== null);

  return {
    tipos: [...new Set(unidades.map((u) => u.tipo))].sort(),
    marcas: [...new Set(unidades.map((u) => u.marca))].sort((a, b) => a.localeCompare(b, 'es')),
    estados: [...new Set(unidades.map((u) => u.estado))],
    anioMin: anios.length > 0 ? Math.min(...anios) : null,
    anioMax: anios.length > 0 ? Math.max(...anios) : null,
    precioMin: precios.length > 0 ? Math.min(...precios) : null,
    precioMax: precios.length > 0 ? Math.max(...precios) : null,
    hayFinanciacion: unidades.some((u) => u.financiacion === 'Disponible'),
  };
}

/**
 * Los accesos del catálogo de la home, contados sobre el stock real.
 *
 * Ninguno de estos números está escrito a mano: si mañana entra un semi o se
 * vende el último Iveco, el acceso aparece o desaparece solo. Una puerta que
 * promete stock y lleva a una lista vacía es peor que no tenerla.
 *
 * Las marcas salen SÓLO de los camiones. En el stock, Randon aparece en bateas
 * y semis: si la lista se armara con todo el catálogo, "Marcas de camiones"
 * ofrecería una marca de acoplados.
 */
export async function getAccesosCatalogo(): Promise<AccesosCatalogo> {
  const unidades = await cargarUnidades();
  const porTipo = (tipo: TipoUnidad) => unidades.filter((u) => u.tipo === tipo).length;

  const porMarca = new Map<string, number>();
  for (const camion of unidades.filter((u) => u.tipo === 'Camión')) {
    porMarca.set(camion.marca, (porMarca.get(camion.marca) ?? 0) + 1);
  }

  return {
    ceroKm: unidades.filter((u) => u.estado === '0 km').length,
    usados: unidades.filter((u) => u.estado === 'Usado seleccionado').length,
    semis: porTipo('Semi'),
    bateas: porTipo('Batea'),
    marcasDeCamiones: [...porMarca.entries()]
      .map(([marca, total]) => ({ marca, total }))
      // Por cantidad y no alfabético: la marca con más stock es la que más
      // chances tiene de resolver la búsqueda, y va primera.
      .sort((a, b) => b.total - a.total || a.marca.localeCompare(b.marca, 'es')),
  };
}

/**
 * Cuántas unidades hay en cada agencia. Se muestra en el selector de agencias.
 *
 * Las unidades sin sucursal no se cuentan en ninguna. No es una pérdida
 * silenciosa: son las que el backend carga en "Todos los Concesionarios" más
 * las de las agencias que el sitio no describe, y meterlas en una sucursal
 * cualquiera haría que el contador prometa stock que no está ahí.
 */
export async function getConteoPorSucursal(): Promise<Record<IdSucursal, number>> {
  const unidades = await cargarUnidades();
  const conteo = {} as Record<IdSucursal, number>;
  for (const sucursal of SUCURSALES) conteo[sucursal.id] = 0;
  for (const unidad of unidades) {
    if (unidad.sucursalId !== null) conteo[unidad.sucursalId] += 1;
  }
  return conteo;
}

/**
 * QUÉ PASA CUANDO LA API FALLA
 *
 * Ninguna función de este archivo atrapa el error: lo dejan subir. Es
 * deliberado y es lo contrario de lo que uno hace por reflejo.
 *
 * Devolver `[]` ante una falla de red convierte "no pudimos consultar el
 * stock" en "Decker no tiene camiones", que es una afirmación falsa, creíble y
 * silenciosa: nadie se entera de que hay que arreglar algo, y el visitante se
 * va. Dejar subir el error lleva a `app/error.tsx`, que dice lo que realmente
 * pasó y ofrece reintentar.
 *
 * Las excepciones están todas acotadas y explicadas donde viven:
 * - `app/layout.tsx`: los datos son del comparador, que es chrome accesorio, y
 *   está por encima de `app/error.tsx`, así que una falla tumbaría el sitio.
 * - `getGaleriaDeUnidad()` y `getSucursales()`: degradan a la miniatura sola y
 *   a los números del repo, que son respuestas correctas y completas.
 */

export { WHATSAPP_GENERAL };
export { cumpleFiltros, ordenarUnidades } from '@/lib/filtros';
