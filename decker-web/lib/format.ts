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
