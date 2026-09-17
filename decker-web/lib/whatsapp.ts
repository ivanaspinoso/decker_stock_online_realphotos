import { SUCURSALES, WHATSAPP_GENERAL } from '@/lib/data/sucursales';
import {
  formatearKm,
  formatearNumero,
  formatearPorcentaje,
  formatearPrecio,
  formatearUsd,
} from '@/lib/format';
import type {
  IdSucursal,
  ResultadoFinanciacion,
  ResultadoLeasing,
  Unidad,
} from '@/lib/types';

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

/**
 * Número del asesor de la sucursal de la unidad. Nunca un número único.
 *
 * `null` es un caso real y no defensivo: el backend tiene once concesionarias y
 * el sitio describe cinco, así que hay unidades publicadas sin sucursal
 * asignada —las 32 que carga en "Todos los Concesionarios", y las de las
 * agencias que el sitio no describe—. Esas consultas van al número general, que
 * es exactamente lo que querés que pase: alguien atiende igual.
 */
export function whatsappDeSucursal(id: IdSucursal | null): string {
  if (id === null) return WHATSAPP_GENERAL;
  return SUCURSALES.find((s) => s.id === id)?.asesor.whatsapp ?? WHATSAPP_GENERAL;
}

/**
 * El nombre de la sucursal para mostrar, o "Consultar" si no tiene.
 *
 * "Consultar" y no una cadena vacía: es la misma palabra con la que el sitio
 * muestra el precio, el año y los kilómetros que no están cargados, y en la
 * ficha una etiqueta "Sucursal" sin nada al lado se lee como un error de la
 * página, no como un dato que falta.
 */
export function nombreDeSucursal(id: IdSucursal | null): string {
  if (id === null) return 'Consultar';
  return SUCURSALES.find((s) => s.id === id)?.nombre ?? 'Consultar';
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
    // Sin sucursal, la línea no se manda: un "Sucursal: Consultar" en el
    // mensaje le pide al asesor que averigüe algo que él no puede averiguar.
    ...(unidad.sucursalId !== null ? [`Sucursal: ${sucursal}`] : []),
  ];

  return linkWhatsapp(whatsappDeSucursal(unidad.sucursalId), lineas.join('\n'));
}

/**
 * Encabezado común de las dos modalidades: quién escribe y por qué unidad.
 * El asesor tiene que poder contestar sin volver a preguntar la sucursal.
 */
function encabezadoSimulacion(titulo: string, unidad?: Unidad): string[] {
  return [
    `Hola Decker, ${titulo}:`,
    ``,
    ...(unidad
      ? [
          `Unidad: ${unidad.nombre}`,
          ...(unidad.sucursalId !== null
            ? [`Sucursal: ${nombreDeSucursal(unidad.sucursalId)}`]
            : []),
          ``,
        ]
      : []),
  ];
}

/** Consulta de financiación estándar. Si viene una unidad, la nombra en el mensaje. */
export function linkConsultaFinanciacion(
  resultado: ResultadoFinanciacion,
  unidad?: Unidad,
): string {
  const numero = unidad ? whatsappDeSucursal(unidad.sucursalId) : WHATSAPP_GENERAL;
  const lineas = [
    ...encabezadoSimulacion('simulé una financiación y quiero avanzar', unidad),
    `Modalidad: financiación estándar`,
    // Van el valor en dólares Y la cotización usada: si el asesor rehace la
    // cuenta con otro dólar, tiene a la vista de dónde salió la diferencia.
    `Valor de la unidad: ${formatearUsd(resultado.valorUsd)}`,
    `Cotización aplicada: ${formatearPrecio(Math.round(resultado.cotizacionAplicada))} por dólar`,
    // El asesor tiene que saber si ese importe es plata o un usado sin tasar:
    // cambia a quién deriva la operación antes de contestar.
    resultado.entregaEsUsado
      ? `Entrega de usado (valor estimado, a tasar): ${formatearPrecio(
          Math.round(resultado.anticipoPesos),
        )}`
      : `Entrega inicial: ${formatearPrecio(Math.round(resultado.anticipoPesos))}`,
    `Monto a financiar: ${formatearPrecio(Math.round(resultado.montoAFinanciar))}`,
    `Plazo: ${resultado.plazo} cuotas`,
    `Tasa: ${formatearNumero(resultado.tasaAnual)}% anual + ${formatearNumero(
      resultado.interesMensualAdicional,
    )}% mensual`,
    `Cuota estimada: ${formatearPrecio(Math.round(resultado.cuotaMensual))}`,
    `Total estimado: ${formatearPrecio(Math.round(resultado.totalAPagar))}`,
  ];

  return linkWhatsapp(numero, lineas.join('\n'));
}

/** Consulta de leasing. Manda las dos cifras separadas: cuotas y pago final. */
export function linkConsultaLeasing(resultado: ResultadoLeasing, unidad?: Unidad): string {
  const numero = unidad ? whatsappDeSucursal(unidad.sucursalId) : WHATSAPP_GENERAL;
  const lineas = [
    ...encabezadoSimulacion('simulé un leasing y quiero avanzar', unidad),
    `Modalidad: leasing`,
    `Valor de la unidad: ${formatearUsd(resultado.valorUsd)}`,
    `Cotización aplicada: ${formatearPrecio(Math.round(resultado.cotizacionAplicada))} por dólar`,
    `Plazo: ${resultado.plazo} cuotas`,
    `Tasa anual: ${formatearNumero(resultado.tasaAnual)}%`,
    // `formatearPorcentaje` y no `formatearNumero`: el segundo redondea a entero
    // y el aumento es 1,25%. El asesor recibía "1% mensual" y rehacía la cuenta
    // con una tasa que no era la del sitio.
    `Aumento de la cuota: ${formatearPorcentaje(resultado.aumentoMensual)}% mensual`,
    `Primera cuota: ${formatearPrecio(Math.round(resultado.primeraCuota))}`,
    `Última cuota: ${formatearPrecio(Math.round(resultado.ultimaCuota))}`,
    `Canon inicial (${resultado.cuotasDeCanon} ${
      resultado.cuotasDeCanon === 1 ? 'cuota' : 'cuotas'
    }): ${formatearPrecio(Math.round(resultado.canonInicial))}`,
    `Pago final (${formatearNumero(resultado.pagoFinalPorcentaje)}%): ${formatearPrecio(
      Math.round(resultado.pagoFinal),
    )}`,
    `Total estimado: ${formatearPrecio(Math.round(resultado.totalOperacion))}`,
  ];

  return linkWhatsapp(numero, lineas.join('\n'));
}

export interface DatosUsado {
  nombre: string;
  telefono: string;
  email?: string;
  marca: string;
  modelo: string;
  anio: string;
  km: string;
  estado: string;
  sucursalId: IdSucursal;
  /** Cuántas fotos cargó. Sólo para anunciarlas: no viajan en el link. */
  cantidadDeFotos?: number;
}

/** Cotización de un usado como parte de pago. Deriva a la sucursal elegida. */
export function linkCotizarUsado(datos: DatosUsado): string {
  const lineas = [
    `Hola Decker, quiero cotizar mi unidad como parte de pago:`,
    ``,
    `Nombre: ${datos.nombre}`,
    `Teléfono: ${datos.telefono}`,
    // Va sólo si se cargó: el formulario lo pide, pero este helper también lo
    // usa el asesor con datos parciales.
    ...(datos.email ? [`Email: ${datos.email}`] : []),
    `Unidad: ${datos.marca} ${datos.modelo}`,
    `Año: ${datos.anio}`,
    `Kilómetros / uso: ${datos.km}`,
    ...(datos.estado ? [`Estado general: ${datos.estado}`] : []),
      `Sucursal de preferencia: ${nombreDeSucursal(datos.sucursalId)}`,
    /**
     * LAS FOTOS NO VIAJAN EN EL LINK, Y NO HAY FORMA DE QUE LO HAGAN.
     *
     * Un `wa.me?text=` sólo lleva texto: WhatsApp no tiene ningún parámetro
     * para adjuntar archivos, y no es algo que se arregle con más código. Las
     * fotos que la persona cargó van al backend de Decker, no al chat.
     *
     * Entonces el mensaje las anuncia y pide que las mande. Sin esta línea
     * pasa lo peor de los dos mundos: el visitante eligió cuatro fotos, dio
     * por hecho que se mandaron, y del otro lado el asesor abre una consulta
     * sin una sola imagen y tiene que pedirlas de nuevo.
     *
     * Va en primera persona —“te paso”— porque el mensaje lo escribe el
     * visitante: es SUYO, y tiene que sonar como algo que él diría.
     */
    ...(datos.cantidadDeFotos
      ? [
          ``,
          datos.cantidadDeFotos === 1
            ? `Te paso una foto de la unidad acá abajo 👇`
            : `Te paso ${datos.cantidadDeFotos} fotos de la unidad acá abajo 👇`,
        ]
      : []),
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
