import { SUCURSALES, WHATSAPP_GENERAL } from '@/lib/data/sucursales';
import { formatearKm, formatearPrecio } from '@/lib/format';
import type { IdSucursal, ResultadoFinanciacion, Unidad } from '@/lib/types';

/**
 * Armado de links de WhatsApp.
 *
 * Todo link es un `https://wa.me/<numero>?text=<mensaje>` real, con el mensaje
 * codificado. Cada punto del sitio arma su propio mensaje con el contexto que
 * tiene a mano: la unidad que se está mirando, el resultado de la simulación,
 * los datos del usado a cotizar.
 */

export function linkWhatsapp(numero: string, mensaje: string): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje.trim())}`;
}

/** Número del asesor de la sucursal de la unidad. Nunca un número único. */
export function whatsappDeSucursal(id: IdSucursal): string {
  return SUCURSALES.find((s) => s.id === id)?.asesor.whatsapp ?? WHATSAPP_GENERAL;
}

export function nombreDeSucursal(id: IdSucursal): string {
  return SUCURSALES.find((s) => s.id === id)?.nombre ?? '';
}

/** Consulta por una unidad concreta. Deriva al asesor de su sucursal. */
export function linkConsultaUnidad(unidad: Unidad): string {
  const sucursal = nombreDeSucursal(unidad.sucursalId);
  // Sólo se mandan los datos que la unidad tiene cargados: nada de "Año: null".
  const lineas = [
    `Hola Decker, quiero consultar por esta unidad:`,
    ``,
    `Unidad: ${unidad.nombre}`,
    ...(unidad.anio !== null ? [`Año: ${unidad.anio}`] : []),
    ...(unidad.km !== null && unidad.km > 0 ? [`Kilómetros: ${formatearKm(unidad.km)}`] : []),
    `Estado: ${unidad.estado}`,
    ...(unidad.financiacion !== null ? [`Financiación: ${unidad.financiacion}`] : []),
    `Sucursal: ${sucursal}`,
  ];

  return linkWhatsapp(whatsappDeSucursal(unidad.sucursalId), lineas.join('\n'));
}

/** Consulta de financiación. Si viene una unidad, la nombra en el mensaje. */
export function linkConsultaFinanciacion(
  resultado: ResultadoFinanciacion,
  unidad?: Unidad,
): string {
  const numero = unidad ? whatsappDeSucursal(unidad.sucursalId) : WHATSAPP_GENERAL;
  const lineas = [
    `Hola Decker, simulé una financiación y quiero avanzar:`,
    ``,
    ...(unidad
      ? [`Unidad: ${unidad.nombre}`, `Sucursal: ${nombreDeSucursal(unidad.sucursalId)}`, ``]
      : []),
    `Monto a financiar: ${formatearPrecio(Math.round(resultado.montoAFinanciar))}`,
    `Plazo: ${resultado.plazo} cuotas`,
    `Tasa anual orientativa: ${resultado.tasaAnual}%`,
    `Cuota estimada: ${formatearPrecio(Math.round(resultado.cuotaMensual))}`,
    `Total estimado: ${formatearPrecio(Math.round(resultado.totalAPagar))}`,
  ];

  return linkWhatsapp(numero, lineas.join('\n'));
}

export interface DatosUsado {
  nombre: string;
  telefono: string;
  marca: string;
  modelo: string;
  anio: string;
  km: string;
  estado: string;
  sucursalId: IdSucursal;
}

/** Cotización de un usado como parte de pago. Deriva a la sucursal elegida. */
export function linkCotizarUsado(datos: DatosUsado): string {
  const lineas = [
    `Hola Decker, quiero cotizar mi unidad como parte de pago:`,
    ``,
    `Nombre: ${datos.nombre}`,
    `Teléfono: ${datos.telefono}`,
    `Unidad: ${datos.marca} ${datos.modelo}`,
    `Año: ${datos.anio}`,
    `Kilómetros / uso: ${datos.km}`,
    ...(datos.estado ? [`Estado general: ${datos.estado}`] : []),
    `Sucursal de preferencia: ${nombreDeSucursal(datos.sucursalId)}`,
  ];

  return linkWhatsapp(whatsappDeSucursal(datos.sucursalId), lineas.join('\n'));
}

/** Consulta genérica, sin unidad de referencia. */
export function linkConsultaGeneral(mensaje?: string): string {
  return linkWhatsapp(
    WHATSAPP_GENERAL,
    mensaje ?? 'Hola Decker, quiero consultar por una unidad.',
  );
}
