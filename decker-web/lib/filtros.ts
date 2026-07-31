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
    if (unidad.precio === null) return false;
    if (precioDesde !== undefined && unidad.precio < precioDesde) return false;
    if (precioHasta !== undefined && unidad.precio > precioHasta) return false;
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
      return copia.sort((a, b) => alFinal(a.precio) - alFinal(b.precio));
    case 'precio-desc':
      return copia.sort((a, b) => {
        if (a.precio === null) return 1;
        if (b.precio === null) return -1;
        return b.precio - a.precio;
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
