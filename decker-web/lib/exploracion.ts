/**
 * Atajos de búsqueda para el cierre de la home.
 *
 * Son entradas al catálogo agrupadas por dimensión: tipo, condición, marca,
 * precio, año y sucursal. Cada una arma la MISMA URL que arma el panel de
 * filtros —`/catalogo?marca=Volvo`—, así que no hay una segunda forma de
 * filtrar el stock: hay un solo catálogo y esto son links hacia él.
 *
 * Todo se calcula desde el stock real. Un atajo que no deja ninguna unidad no
 * se dibuja: un enlace que promete siete camiones y lleva a "sin resultados" es
 * peor que no ofrecerlo.
 *
 * Va en el servidor. Lo único que llega al navegador es la lista ya armada.
 */

import type { IdSucursal, Sucursal, Unidad } from '@/lib/types';

export interface AtajoBusqueda {
  texto: string;
  /** Ruta al catálogo con el filtro ya puesto. Es un `href` de verdad. */
  href: string;
  /** Cuántas unidades hay detrás. Se muestra al lado del rótulo. */
  cantidad: number;
}

export interface CategoriaBusqueda {
  id: string;
  titulo: string;
  atajos: AtajoBusqueda[];
}

/** Arma `/catalogo?...` con los parámetros que la página del catálogo ya lee. */
function alCatalogo(params: Record<string, string>): string {
  const query = new URLSearchParams(params).toString();
  return `/catalogo?${query}`;
}

/**
 * Cortes de precio.
 *
 * ACLARACIÓN: el filtro del catálogo NO tiene rangos predefinidos —es un desde
 * y un hasta libres, en millones—, así que no había cortes que reusar. Estos
 * salen del stock publicado, que hoy va de $28,9M a $289M: cuatro tramos que
 * dejan unidades en todos. Si el stock se mueve mucho, se revisan acá y en
 * ningún otro lado.
 *
 * El tope del último tramo se deja abierto a propósito.
 */
const MILLON = 1_000_000;

const TRAMOS_PRECIO: { texto: string; desde?: number; hasta?: number }[] = [
  { texto: 'Hasta $50 M', hasta: 50 * MILLON },
  { texto: '$50 M a $100 M', desde: 50 * MILLON, hasta: 100 * MILLON },
  { texto: '$100 M a $200 M', desde: 100 * MILLON, hasta: 200 * MILLON },
  { texto: 'Más de $200 M', desde: 200 * MILLON },
];

/**
 * Cortes de año. Mismo caso que el precio: el filtro del catálogo pide un
 * desde y un hasta libres, así que los tramos se definen acá.
 */
const TRAMOS_ANIO: { texto: string; desde?: number; hasta?: number }[] = [
  { texto: '2024 o más nuevas', desde: 2024 },
  { texto: '2020 a 2023', desde: 2020, hasta: 2023 },
  { texto: 'Anteriores a 2020', hasta: 2019 },
];

/** Ordena por cantidad y, a igual cantidad, alfabéticamente. */
function porCantidad(a: AtajoBusqueda, b: AtajoBusqueda): number {
  return b.cantidad - a.cantidad || a.texto.localeCompare(b.texto, 'es');
}

/** Saca los atajos vacíos y descarta la categoría si no quedó ninguno. */
function categoria(
  id: string,
  titulo: string,
  atajos: AtajoBusqueda[],
): CategoriaBusqueda | null {
  const conStock = atajos.filter((atajo) => atajo.cantidad > 0);
  return conStock.length > 0 ? { id, titulo, atajos: conStock } : null;
}

export function armarCategoriasBusqueda(
  unidades: Unidad[],
  sucursales: Sucursal[],
): CategoriaBusqueda[] {
  const contar = (predicado: (unidad: Unidad) => boolean) =>
    unidades.filter(predicado).length;

  const valoresUnicos = <T extends string>(sacar: (unidad: Unidad) => T): T[] => [
    ...new Set(unidades.map(sacar)),
  ];

  /**
   * Tipo y condición van SEPARADOS, y no juntos como "Camión 0km" o "Usado".
   *
   * En el modelo de datos del sitio son dos campos distintos —`tipo` es qué es
   * la unidad, `estado` en qué condición está— justamente para poder cruzarlos:
   * hay camiones 0 km y camiones usados, y un utilitario usado no es un camión
   * usado. Mezclarlos en un solo grupo obligaría a publicar una entrada por
   * combinación, y el que busca "usados" no encontraría los semis.
   */
  const tipos = categoria(
    'tipo',
    'Por tipo de unidad',
    valoresUnicos((unidad) => unidad.tipo).map((tipo) => ({
      texto: tipo,
      href: alCatalogo({ tipo }),
      cantidad: contar((unidad) => unidad.tipo === tipo),
    })),
  );

  const condiciones = categoria(
    'condicion',
    'Por condición',
    valoresUnicos((unidad) => unidad.estado).map((estado) => ({
      texto: estado,
      href: alCatalogo({ estado }),
      cantidad: contar((unidad) => unidad.estado === estado),
    })),
  );

  const marcas = categoria(
    'marca',
    'Por marca',
    valoresUnicos((unidad) => unidad.marca).map((marca) => ({
      texto: marca,
      href: alCatalogo({ marca }),
      cantidad: contar((unidad) => unidad.marca === marca),
    })),
  );

  /* Las unidades sin precio publicado no entran en ningún tramo: no se puede
     afirmar que caigan adentro. Es la misma regla que aplica el filtro del
     catálogo, y por eso los números de acá coinciden con los de allá. */
  const precios = categoria(
    'precio',
    'Por rango de precio',
    TRAMOS_PRECIO.map(({ texto, desde, hasta }) => ({
      texto,
      href: alCatalogo({
        ...(desde !== undefined && { precioDesde: String(desde) }),
        ...(hasta !== undefined && { precioHasta: String(hasta) }),
      }),
      cantidad: contar(
        (unidad) =>
          unidad.precio !== null &&
          (desde === undefined || unidad.precio >= desde) &&
          (hasta === undefined || unidad.precio <= hasta),
      ),
    })),
  );

  const anios = categoria(
    'anio',
    'Por año',
    TRAMOS_ANIO.map(({ texto, desde, hasta }) => ({
      texto,
      href: alCatalogo({
        ...(desde !== undefined && { anioDesde: String(desde) }),
        ...(hasta !== undefined && { anioHasta: String(hasta) }),
      }),
      cantidad: contar(
        (unidad) =>
          unidad.anio !== null &&
          (desde === undefined || unidad.anio >= desde) &&
          (hasta === undefined || unidad.anio <= hasta),
      ),
    })),
  );

  const porSucursal = categoria(
    'sucursal',
    'Por sucursal',
    sucursales.map((sucursal) => ({
      texto: sucursal.nombre,
      href: alCatalogo({ sucursal: sucursal.id as IdSucursal }),
      cantidad: contar((unidad) => unidad.sucursalId === sucursal.id),
    })),
  );

  /* El orden es el de una búsqueda real: primero qué es la unidad, después en
     qué condición, después de quién, y al final los números y el lugar. Los
     dos primeros van ordenados por stock —lo que más hay, primero—; precio y
     año conservan su orden natural, que es lo que los hace una escala. */
  return [
    tipos && { ...tipos, atajos: [...tipos.atajos].sort(porCantidad) },
    condiciones && { ...condiciones, atajos: [...condiciones.atajos].sort(porCantidad) },
    marcas && { ...marcas, atajos: [...marcas.atajos].sort(porCantidad) },
    precios,
    anios,
    porSucursal,
  ].filter((categoria): categoria is CategoriaBusqueda => categoria !== null);
}
