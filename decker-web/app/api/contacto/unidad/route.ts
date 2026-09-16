import { registrarConsultaPorUnidad } from '@/lib/rutasur/contacto';
import { idDeSlug } from '@/lib/rutasur/mapeo';
import { getSucursalPorId, getUnidadPorSlug } from '@/lib/api';

/**
 * `POST /api/contacto/unidad` — deja registrada una consulta por una unidad.
 *
 * SE SUMA AL WHATSAPP, NO LO REEMPLAZA. El botón de la ficha dispara esto y
 * abre WhatsApp: el POST deja el lead en el backend de Decker aunque el
 * visitante no llegue a mandar el mensaje, y el WhatsApp es lo que el visitante
 * entiende que hizo.
 *
 * SIEMPRE CONTESTA 200, y es deliberado: el cliente dispara esto sin esperarlo
 * —tiene que abrir WhatsApp dentro del mismo gesto o el navegador se lo bloquea
 * como popup—, así que un código de error acá no cambiaría nada.
 *
 * Lo que SÍ viaja es el `mensaje`. El cliente lee la respuesta cuando llega
 * —tarde, con el visitante ya en WhatsApp— y si algo falló lo muestra en la
 * página para cuando vuelva. Antes esto devolvía sólo `registrada: false` y los
 * mensajes de un 422 morían en el log: el visitante creía que su consulta había
 * quedado registrada cuando no. Ver `lib/leads.ts`.
 */
export async function POST(pedido: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await pedido.json();
  } catch {
    return Response.json({ registrada: false, motivo: 'cuerpo inválido' });
  }

  const datos = (cuerpo ?? {}) as Record<string, unknown>;
  const slug = typeof datos.slug === 'string' ? datos.slug : '';
  const vehiculoId = idDeSlug(slug);

  if (vehiculoId === null) {
    // Pasa con los datos de prueba, cuyos slugs no terminan en un id de la API.
    // No es un error del visitante ni algo que valga la pena reportar.
    return Response.json({ registrada: false, motivo: 'la unidad no tiene id de la API' });
  }

  /**
   * EL NOMBRE DE LA UNIDAD Y DE LA AGENCIA, NO SUS IDs.
   *
   * `POST /vehiculos/contacto` guarda los dos como texto libre —es lo que el
   * asesor lee al abrir la consulta— así que mandar el id lo dejaría leyendo
   * "agencia 1, vehículo 3455". Se buscan acá, en el servidor, porque el
   * navegador manda sólo el slug: es el único dato que la tarjeta y la ficha
   * tienen a mano en los dos lugares desde donde se dispara esto.
   *
   * Si la unidad ya no está en el catálogo —se vendió entre que cargó la página
   * y tocó el botón— se manda el slug como nombre. Es feo pero legible, y es
   * mejor que perder la consulta por un dato de presentación.
   */
  const unidad = await getUnidadPorSlug(slug);
  const sucursal = unidad ? await getSucursalPorId(unidad.sucursalId) : null;

  const resultado = await registrarConsultaPorUnidad({
    vehiculo: unidad?.nombre ?? slug,
    agencia: sucursal?.nombre ?? '',
    nombre: texto(datos.nombre),
    telefono: texto(datos.telefono),
    email: texto(datos.email),
    localidad: texto(datos.localidad),
    mensaje: texto(datos.mensaje),
  });

  return Response.json({
    registrada: resultado.ok,
    mensaje: resultado.ok ? undefined : mensajeDeLead(resultado),
  });
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

/**
 * Qué se le dice al visitante cuando el envío falló.
 *
 * `undefined` significa NO MOLESTARLO, y es la respuesta correcta más seguido
 * de lo que parece.
 *
 * El criterio es si la persona puede hacer algo con lo que le decimos:
 *
 * - **422** — el backend rechazó un dato: el email mal escrito, un campo que
 *   falta. Eso sí se muestra: es corregible y es suyo.
 * - **429** — hay que esperar un momento. También se muestra.
 * - **500, red, timeout** — se calla. Es un problema NUESTRO, la persona no
 *   puede hacer nada, y sobre todo: **su consulta no se perdió**. El mensaje de
 *   WhatsApp que se acaba de abrir lleva todos los datos que cargó, y cuando lo
 *   mande, llega. Decirle "no pudimos registrar tu consulta" en ese momento lo
 *   asusta por un problema interno que no lo afecta, y el riesgo real es que
 *   cierre las dos pestañas creyendo que no hay forma de contactar a Decker.
 *
 * Esto importa hoy más que nunca: los tres endpoints de contacto están
 * devolviendo 500 al guardar (bug del backend, ver `registrarLeadPerdido`), así
 * que sin este criterio TODOS los visitantes verían el cartel rojo.
 *
 * El error no desaparece: queda en el log del servidor con el lead completo.
 */
function mensajeDeLead(resultado: { mensaje?: string; causa?: string }): string | undefined {
  const esCorregible = resultado.causa === 'validacion' || Boolean(resultado.mensaje);
  if (!esCorregible) return undefined;

  return (
    `${resultado.mensaje ? `${resultado.mensaje} ` : ''}Revisá los datos y probá de nuevo. ` +
    'El mensaje de WhatsApp que se abrió llega igual: mandalo y te contestamos por ahí.'
  );
}
