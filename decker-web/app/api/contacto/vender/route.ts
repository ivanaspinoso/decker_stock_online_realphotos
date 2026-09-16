import { registrarOfertaDeUsado } from '@/lib/rutasur/contacto';
import {
  DATA_URL_DE_IMAGEN,
  LARGO_MAXIMO_DE_DATA_URL,
  MAXIMO_DE_FOTOS,
} from '@/lib/rutasur/limites';

/**
 * `POST /api/contacto/vender` — deja registrado un usado ofrecido como parte
 * de pago.
 *
 * Se dispara junto con el botón de WhatsApp del formulario, no en su lugar: el
 * POST deja el lead en el backend de Decker y el WhatsApp abre la conversación.
 *
 * Recibe `multipart/form-data` y no JSON porque el formulario puede llevar
 * fotos del usado. Los campos se leen por nombre y se reenvían a la API con los
 * nombres que ella espera; de esa traducción se ocupa `lib/rutasur/contacto.ts`.
 *
 * SIEMPRE CONTESTA 200, por el mismo motivo que la ruta de consulta por unidad:
 * el cliente dispara esto sin esperarlo para poder abrir WhatsApp dentro del
 * gesto del usuario.
 *
 * Pero el `mensaje` sí viaja: el cliente lee la respuesta cuando llega y muestra
 * el aviso en la página. Es lo único que evita que un 422 —un teléfono mal
 * escrito, pongamos— deje al visitante creyendo que su usado quedó cotizado.
 */
export async function POST(pedido: Request) {
  let formulario: FormData;
  try {
    formulario = await pedido.formData();
  } catch {
    return Response.json({ registrada: false, motivo: 'cuerpo inválido' });
  }

  const resultado = await registrarOfertaDeUsado({
    nombre: texto(formulario, 'nombre'),
    telefono: texto(formulario, 'telefono'),
    email: texto(formulario, 'email'),
    marca: texto(formulario, 'marca'),
    modelo: texto(formulario, 'modelo'),
    anio: texto(formulario, 'anio'),
    km: texto(formulario, 'km'),
    estado: texto(formulario, 'estado'),
    // Se reenvía la sucursal elegida dentro del mensaje: la API de contacto no
    // tiene campo para eso, y perderla obligaría al asesor a volver a preguntar
    // lo único que el visitante ya eligió.
    mensaje: sucursalComoMensaje(formulario),
    // Las fotos llegan del navegador ya convertidas a Data URL Base64: la API
    // las quiere así, dentro del JSON, no como archivos. Ver `MAXIMO_DE_FOTOS`
    // y el comentario de `registrarOfertaDeUsado`.
    fotos: fotosDe(formulario),
  });

  return Response.json({
    registrada: resultado.ok,
    mensaje: resultado.ok ? undefined : mensajeDeLead(resultado),
  });
}

/**
 * Las fotos que mandó el navegador, validadas antes de reenviarlas.
 *
 * QUÉ SE COMPRUEBA ACÁ Y POR QUÉ NO ALCANZA CON EL NAVEGADOR
 *
 * El formulario ya limita tipo y tamaño, pero esa validación vive en el
 * cliente y cualquiera puede saltearla mandando un POST a mano a esta ruta.
 * Si dejáramos pasar un Data URL de cien megas, el que se cuelga esperando es
 * nuestro servidor, no el suyo.
 *
 * Los límites son los de la API: sólo JPEG, PNG o WebP, como máximo cuatro, y
 * cada Data URL hasta 14.000.000 de caracteres —que en Base64 son unos 10 MB
 * de archivo real—. Lo que no cumple se descarta en silencio: la consulta vale
 * más que la foto, y perderla entera por una imagen mal formada sería peor.
 */
function fotosDe(formulario: FormData): string[] {
  return formulario
    .getAll('fotos')
    .filter((valor): valor is string => typeof valor === 'string')
    .filter((foto) => DATA_URL_DE_IMAGEN.test(foto) && foto.length <= LARGO_MAXIMO_DE_DATA_URL)
    .slice(0, MAXIMO_DE_FOTOS);
}

function texto(formulario: FormData, campo: string): string {
  const valor = formulario.get(campo);
  return typeof valor === 'string' ? valor.trim() : '';
}

function sucursalComoMensaje(formulario: FormData): string {
  const sucursal = texto(formulario, 'sucursal');
  return sucursal ? `Sucursal de preferencia: ${sucursal}` : '';
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
