import { PARAMETROS_FINANCIACION } from '@/lib/data/financiacion';
import { cotizacionConMargen } from '@/lib/financiacion';
/**
 * Cuántas unidades entran en una página del catálogo.
 *
 * VIVE ACÁ Y NO EN `CatalogoCliente` aunque sea quien la usa para cortar la
 * lista, porque `app/catalogo/page.tsx` también la necesita: acota el
 * `?pagina=` de la URL contra el stock antes de renderizar.
 *
 * Y no se puede importar desde el componente: `CatalogoCliente` es `'use
 * client'`, y lo que un Server Component importa de un módulo cliente no es el
 * valor sino una referencia. El cálculo daba `NaN` y el catálogo salía vacío.
 * Este archivo no lleva `'use client'`, así que los dos lados leen el número.
 *
 * 24 es múltiplo de 2, 3 y 4: la última fila queda completa en las tres
 * anchuras de la grilla, sin un hueco al final.
 */
export const UNIDADES_POR_PAGINA = 24;

import type { FiltrosCatalogo, Unidad } from '@/lib/types';

/**
 * Filtrado y orden puros.
 *
 * Vive separado de `lib/api.ts` a propósito: el catálogo filtra en el cliente y
 * si importara desde `api.ts` se arrastraría todo el dataset al bundle del
 * navegador. Acá no hay ningún import de datos.
 *
 * Regla con los campos sin cargar (`null` en precio, año o km): sólo quedan
 * afuera si el usuario acotó activamente ese rango. Si no filtró por precio, la
 * unidad "a consultar" tiene que seguir apareciendo.
 */

/**
 * El precio de una unidad llevado a pesos, para poder compararlas entre sí.
 *
 * POR QUÉ HACE FALTA CONVERTIR, Y POR QUÉ SÓLO ACÁ
 *
 * El catálogo tiene las dos monedas mezcladas: 151 unidades en dólares y 61 en
 * pesos. Ordenar por precio o filtrar por rango comparando los números crudos
 * pondría un camión de US$ 90.000 por debajo de una batea de $ 38.000.000, que
 * vale veinte veces menos. Hay que llevarlos a una sola moneda antes de
 * compararlos.
 *
 * Esto NO se usa para mostrar. En pantalla cada unidad va en su moneda real
 * —ver `formatearPrecioDeUnidad`—: el visitante tiene que ver el precio que le
 * van a cobrar, no una conversión nuestra. Convertir es sólo para poder
 * ordenar.
 *
 * La cotización sale del mismo lugar que la de la calculadora, así que hay un
 * solo número que mantener cuando el dólar se mueve.
 */
export function precioComparable(unidad: {
  precio: number | null;
  precioUsd: number | null;
}): number | null {
  if (unidad.precioUsd !== null) {
    return (
      unidad.precioUsd *
      cotizacionConMargen(
        PARAMETROS_FINANCIACION.dolarOficialVenta,
        PARAMETROS_FINANCIACION.margenDolarPorcentaje,
      )
    );
  }
  return unidad.precio;
}

export function cumpleFiltros(unidad: Unidad, filtros: FiltrosCatalogo): boolean {
  const {
    busqueda,
    tipo,
    marca,
    sucursalId,
    estado,
    financiacion,
    anioDesde,
    anioHasta,
    precioDesde,
    precioHasta,
  } = filtros;

  if (busqueda && busqueda.trim()) {
    const texto = normalizar(`${unidad.nombre} ${unidad.marca} ${unidad.modelo} ${unidad.tipo}`);
    // Todas las palabras tienen que aparecer: "volvo fh" no trae los FM.
    const terminos = normalizar(busqueda).split(/\s+/).filter(Boolean);
    if (!terminos.every((termino) => texto.includes(termino))) return false;
  }

  if (tipo && unidad.tipo !== tipo) return false;
  if (marca && unidad.marca !== marca) return false;
  if (sucursalId && unidad.sucursalId !== sucursalId) return false;
  if (estado && unidad.estado !== estado) return false;
  if (financiacion && unidad.financiacion !== financiacion) return false;

  if (anioDesde !== undefined || anioHasta !== undefined) {
    if (unidad.anio === null) return false;
    if (anioDesde !== undefined && unidad.anio < anioDesde) return false;
    if (anioHasta !== undefined && unidad.anio > anioHasta) return false;
  }

  if (precioDesde !== undefined || precioHasta !== undefined) {
    // En pesos las dos puntas: el rango que escribe la persona está en pesos y
    // la mitad del catálogo está en dólares. Ver `precioComparable`.
    const precio = precioComparable(unidad);
    if (precio === null) return false;
    if (precioDesde !== undefined && precio < precioDesde) return false;
    if (precioHasta !== undefined && precio > precioHasta) return false;
  }

  return true;
}

export function ordenarUnidades(
  unidades: Unidad[],
  orden: FiltrosCatalogo['orden'],
): Unidad[] {
  const copia = [...unidades];
  // Lo que no tiene dato cargado va al final en cualquier orden numérico: no es
  // ni lo más barato ni lo más caro, es "consultar".
  const alFinal = (valor: number | null) => valor ?? Number.POSITIVE_INFINITY;

  switch (orden) {
    case 'precio-asc':
      return copia.sort((a, b) => alFinal(precioComparable(a)) - alFinal(precioComparable(b)));
    case 'precio-desc':
      return copia.sort((a, b) => {
        const pa = precioComparable(a);
        const pb = precioComparable(b);
        // Las que no tienen precio van al final en los dos sentidos: "sin
        // precio" no es "el más caro" ni "el más barato", es otra cosa.
        if (pa === null) return 1;
        if (pb === null) return -1;
        return pb - pa;
      });
    case 'anio-desc':
      return copia.sort((a, b) => {
        if (a.anio === null) return 1;
        if (b.anio === null) return -1;
        return b.anio - a.anio;
      });
    case 'km-asc':
      return copia.sort((a, b) => alFinal(a.km) - alFinal(b.km));
    default:
      // Relevancia: destacadas primero, después 0 km, después año más nuevo.
      return copia.sort((a, b) => {
        if (a.destacada !== b.destacada) return a.destacada ? -1 : 1;
        const ceroKm = (u: Unidad) => (u.estado === '0 km' ? 0 : 1);
        if (ceroKm(a) !== ceroKm(b)) return ceroKm(a) - ceroKm(b);
        return alFinal(b.anio) === alFinal(a.anio) ? 0 : (b.anio ?? 0) - (a.anio ?? 0);
      });
  }
}

/** Saca acentos y pasa a minúsculas: "bahia" tiene que matchear "Bahía". */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}
