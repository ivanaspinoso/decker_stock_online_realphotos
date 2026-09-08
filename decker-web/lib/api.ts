import { UNIDADES } from '@/lib/data/unidades';
import { SUCURSALES, WHATSAPP_GENERAL } from '@/lib/data/sucursales';
import { PARAMETROS_FINANCIACION } from '@/lib/data/financiacion';
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
 * Es la ÚNICA puerta entre los componentes y el origen de datos. Hoy lee de los
 * arrays de `lib/data/`; mañana estas mismas funciones le pegan a Airtable o a
 * una API propia. Por eso son `async` aunque hoy no lo necesiten: el día del
 * reemplazo cambia el cuerpo de cada función y ningún componente se toca.
 *
 * Reglas al modificar:
 * - No exportar los arrays crudos fuera de este módulo.
 * - Este módulo es sólo de servidor: importa todo el dataset. Los componentes
 *   cliente reciben las unidades por props y filtran con `lib/filtros.ts`.
 */

/** Unidades curadas para la home. No es la totalidad del stock. */
export async function getUnidadesDestacadas(limite = 6): Promise<Unidad[]> {
  return UNIDADES.filter((unidad) => unidad.destacada).slice(0, limite);
}

/** Catálogo completo, con filtros y orden aplicados. */
export async function getCatalogoCompleto(
  filtros: FiltrosCatalogo = {},
): Promise<Unidad[]> {
  const filtradas = UNIDADES.filter((unidad) => cumpleFiltros(unidad, filtros));
  return ordenarUnidades(filtradas, filtros.orden);
}

export async function getUnidadPorSlug(slug: string): Promise<Unidad | null> {
  return UNIDADES.find((unidad) => unidad.slug === slug) ?? null;
}

/** Otras unidades del mismo tipo o de la misma sucursal, para la ficha. */
export async function getUnidadesRelacionadas(
  slug: string,
  limite = 3,
): Promise<Unidad[]> {
  const base = UNIDADES.find((unidad) => unidad.slug === slug);
  if (!base) return [];

  const puntaje = (unidad: Unidad) =>
    (unidad.tipo === base.tipo ? 2 : 0) + (unidad.sucursalId === base.sucursalId ? 1 : 0);

  return UNIDADES.filter((unidad) => unidad.slug !== slug && puntaje(unidad) > 0)
    .sort((a, b) => puntaje(b) - puntaje(a))
    .slice(0, limite);
}

/** Todos los slugs publicados. Lo usa `generateStaticParams` de la ficha. */
export async function getSlugsDeUnidades(): Promise<string[]> {
  return UNIDADES.map((unidad) => unidad.slug);
}

/**
 * Índice mínimo para las sugerencias del buscador del hero.
 *
 * Va al bundle del cliente, así que lleva sólo lo que se muestra en la lista:
 * nada de galerías, descripciones ni precios. Con este volumen de stock entra
 * entero; si el catálogo crece a miles de unidades, esto pasa a ser un endpoint
 * de búsqueda y el componente no cambia.
 */
export async function getIndiceBuscador(): Promise<SugerenciaUnidad[]> {
  return UNIDADES.map((unidad) => ({
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
 * cuando esa lista se lee. Con este volumen de stock entra entero y va en el
 * layout; si el catálogo creciera a miles, esto pasa a ser un endpoint que se
 * pide por los slugs guardados y ningún componente cambia.
 */
export async function getResumenDeUnidades(): Promise<ResumenComparacion[]> {
  return UNIDADES.map((unidad) => ({
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

export async function getSucursales(): Promise<Sucursal[]> {
  return SUCURSALES;
}

export async function getSucursalPorId(id: IdSucursal): Promise<Sucursal | null> {
  return SUCURSALES.find((sucursal) => sucursal.id === id) ?? null;
}

export async function getParametrosFinanciacion(): Promise<ParametrosFinanciacion> {
  return PARAMETROS_FINANCIACION;
}

/**
 * Valores presentes en el stock, para poblar selects y rangos del catálogo.
 * Se derivan del stock y no de una lista fija: si mañana entra una marca nueva,
 * aparece sola en los filtros.
 */
export async function getOpcionesCatalogo(): Promise<OpcionesCatalogo> {
  // Los rangos se calculan sólo sobre las unidades que tienen el dato cargado.
  const precios = UNIDADES.map((u) => u.precio).filter((p): p is number => p !== null);
  const anios = UNIDADES.map((u) => u.anio).filter((a): a is number => a !== null);

  return {
    tipos: [...new Set(UNIDADES.map((u) => u.tipo))].sort(),
    marcas: [...new Set(UNIDADES.map((u) => u.marca))].sort(),
    estados: [...new Set(UNIDADES.map((u) => u.estado))],
    anioMin: Math.min(...anios),
    anioMax: Math.max(...anios),
    precioMin: Math.min(...precios),
    precioMax: Math.max(...precios),
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
  const porTipo = (tipo: TipoUnidad) => UNIDADES.filter((u) => u.tipo === tipo).length;

  const porMarca = new Map<string, number>();
  for (const camion of UNIDADES.filter((u) => u.tipo === 'Camión')) {
    porMarca.set(camion.marca, (porMarca.get(camion.marca) ?? 0) + 1);
  }

  return {
    ceroKm: UNIDADES.filter((u) => u.estado === '0 km').length,
    usados: UNIDADES.filter((u) => u.estado === 'Usado seleccionado').length,
    semis: porTipo('Semi'),
    bateas: porTipo('Batea'),
    marcasDeCamiones: [...porMarca.entries()]
      .map(([marca, total]) => ({ marca, total }))
      // Por cantidad y no alfabético: la marca con más stock es la que más
      // chances tiene de resolver la búsqueda, y va primera.
      .sort((a, b) => b.total - a.total || a.marca.localeCompare(b.marca, 'es')),
  };
}

/** Cuántas unidades hay en cada agencia. Se muestra en el selector de agencias. */
export async function getConteoPorSucursal(): Promise<Record<IdSucursal, number>> {
  const conteo = {} as Record<IdSucursal, number>;
  for (const sucursal of SUCURSALES) conteo[sucursal.id] = 0;
  for (const unidad of UNIDADES) conteo[unidad.sucursalId] += 1;
  return conteo;
}

export { WHATSAPP_GENERAL };
export { cumpleFiltros, ordenarUnidades } from '@/lib/filtros';
