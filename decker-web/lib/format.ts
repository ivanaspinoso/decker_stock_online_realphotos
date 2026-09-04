/** Formateo de datos numéricos. Todo el sitio muestra pesos argentinos. */

const PESOS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const NUMERO = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

/**
 * Los campos sin cargar se muestran como "Consultar", nunca como `0`.
 * Las unidades que vienen del sitio original no tienen precio, año ni km.
 */
export function formatearPrecio(valor: number | null): string {
  if (valor === null) return 'Consultar';
  return PESOS.format(valor);
}

export function formatearAnio(anio: number | null): string {
  return anio === null ? 'Consultar' : String(anio);
}

export function formatearKm(km: number | null): string {
  if (km === null) return 'Consultar';
  if (km === 0) return '0 km';
  return `${NUMERO.format(km)} km`;
}

export function formatearNumero(valor: number): string {
  return NUMERO.format(valor);
}

/** Semis y bateas no llevan kilometraje: ahí se muestra la configuración. */
export function tieneKilometraje(tipo: string): boolean {
  return tipo !== 'Semi' && tipo !== 'Batea';
}

/**
 * ¿Este valor es una CIFRA o es una palabra?
 *
 * Decide si un valor de ficha va en la monoespaciada. La regla del sistema es
 * que la mono está reservada para datos numéricos —precios, años, kilómetros,
 * potencia, tasas—, porque su ancho fijo es lo que hace que una columna de
 * números se compare de un vistazo.
 *
 * Sobre una palabra ese mismo ancho fijo no aporta nada y encima se lee como
 * otra tipografía: "Volvo", "Bahía Blanca" o "Consultar" en mono, al lado de un
 * párrafo en la normal, rompen la unidad de la página aunque sean cortes de la
 * misma familia. La tabla del catálogo ya aplicaba este criterio a mano; esto
 * lo vuelve una sola regla para las tres superficies.
 *
 * El corte es simple a propósito: empieza con dígito, es cifra. Alcanza para
 * todo lo que publica el sitio —"2022", "298.000 km", "420 CV" van a mono;
 * "Volvo", "Camión", "Carga pesada", "Disponible", "Consultar" no— y no hay que
 * acordarse de marcar campo por campo cuando se agrega uno nuevo.
 */
export function esCifra(valor: string): boolean {
  return /^\d/.test(valor.trim());
}
