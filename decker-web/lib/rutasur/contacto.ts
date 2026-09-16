import { pedir } from '@/lib/rutasur/cliente';
import { ErrorDeApi, type CausaDeError } from '@/lib/rutasur/errores';


/**
 * Envío de consultas al backend. SÓLO SERVIDOR (ver `cliente.ts`).
 *
 * EL POST NO REEMPLAZA AL WHATSAPP, SE SUMA
 *
 * El recorrido de una consulta es: se manda el POST y DESPUÉS se abre WhatsApp,
 * las dos cosas. El POST es lo que deja el lead registrado en el backend, donde
 * comercial lo puede ver aunque el visitante nunca llegue a mandar el mensaje;
 * el WhatsApp es lo que el visitante entiende que hizo. Sacar cualquiera de los
 * dos rompe una mitad distinta.
 *
 * Y POR ESO NINGUNA DE ESTAS FUNCIONES TIRA
 *
 * Si el POST falla, el visitante igual tiene que terminar en WhatsApp. Un lead
 * perdido en el CRM es recuperable —la conversación llega igual—; un botón de
 * WhatsApp que no abre porque el backend está caído es una venta perdida.
 *
 * Pero "no tirar" no es "no contar". Devuelven un `ResultadoDeEnvio` con el
 * mensaje que corresponde mostrarle al visitante: los `errors` de un 422 dicen
 * qué campo está mal, y un 429 pide esperar. Antes esto devolvía un `boolean` y
 * esos mensajes morían en el `console.error`; el visitante creía que su consulta
 * había quedado registrada cuando no.
 *
 * LOS NOMBRES DE LOS CAMPOS, YA CONFIRMADOS CONTRA LA API
 *
 * Están sacados del 422 que devuelve cada endpoint con el cuerpo vacío, que es
 * la única documentación que hay de esto. Son EN CASTELLANO en los dos primeros
 * —`nombre`, `telefono`, `vehiculo`— y con prefijo `contact_` en el tercero.
 * No hay lógica común entre ellos: es así y hay que respetarlo.
 *
 *   POST /vehiculos/contacto   nombre, email, localidad, telefono, mensaje,
 *                              agencia, vehiculo
 *   POST /contactos/vender     nombre, email, telefono, marca, anio, kilometros
 *   POST /contactos/contacto   contact_name, contact_email, contact_city,
 *                              contact_phone, contact_msj, contact_desde
 *
 * Antes de esto se mandaban los nombres en inglés (`name`, `phone`,
 * `vehicle_id`) y la API los rechazaba TODOS con 422: no se registró ni un solo
 * lead. No se notaba porque nadie leía la respuesta.
 *
 * OJO: la API marca esos campos como OBLIGATORIOS. Ver la nota de cada función
 * sobre los que el sitio todavía no pide.
 */

const RUTAS = {
  porUnidad: '/vehiculos/contacto',
  vender: '/contactos/vender',
  general: '/contactos/contacto',
} as const;

/**
 * Lo que devuelve un envío. `mensaje` sólo viene cuando hay algo CONCRETO que
 * decirle al visitante: qué campo rechazó un 422, o el "esperá un momento" de
 * un 429. Un 500 o una falla de red no traen mensaje —no hay nada útil que
 * agregar— y quien llama pone su propia frase. Nunca lleva la URL de la API ni
 * el detalle del error: eso va al log del servidor.
 */
export interface ResultadoDeEnvio {
  ok: boolean;
  mensaje?: string;
  /**
   * Por qué falló. Lo usa la ruta para decidir si vale la pena molestar al
   * visitante: un 422 lo puede corregir él, un 500 no.
   */
  causa?: CausaDeError;
}

export interface ConsultaPorUnidad {
  nombre: string;
  telefono: string;
  email?: string;
  localidad?: string;
  mensaje?: string;
  /** El `vehicle_id`, que sale del final del slug con `idDeSlug()`. */
  vehiculoId: number;
  /** El `company_id` de la agencia donde está la unidad. */
  agenciaId?: number;
}

/** Consulta por una unidad puntual. Se dispara junto con el botón de WhatsApp. */
export async function registrarConsultaPorUnidad(
  datos: ConsultaPorUnidad,
): Promise<ResultadoDeEnvio> {
  return enviar(RUTAS.porUnidad, {
    // COMO TEXTO, NO COMO NÚMERO. Son ids y se leen como números, pero la API
    // los valida con `string` y manda 422 `validation.string` si viajan como
    // enteros de JSON. Verificado contra la API real.
    vehiculo: String(datos.vehiculoId),
    agencia: datos.agenciaId === undefined ? undefined : String(datos.agenciaId),
    nombre: datos.nombre,
    telefono: datos.telefono,
    email: datos.email ?? '',
    localidad: datos.localidad ?? '',
    mensaje: datos.mensaje ?? '',
  });
}

export interface OfertaDeUsado {
  nombre: string;
  telefono: string;
  email?: string;
  marca: string;
  modelo: string;
  anio: string;
  km: string;
  estado?: string;
  mensaje?: string;
  /** Fotos del usado, si el visitante las cargó. */
  imagenes?: File[];
}

/**
 * Formulario de parte de pago.
 *
 * Va como `FormData` y no como JSON porque puede llevar fotos. Los campos de
 * texto viajan igual; `cliente.ts` no le pone `Content-Type` a mano para que
 * `fetch` arme el `boundary` que PHP necesita para separar los archivos.
 *
 * Las imágenes se mandan como `images[]`, que es la convención que espera
 * Laravel para un array de archivos. A confirmar con el primer 422 real.
 */
export async function registrarOfertaDeUsado(datos: OfertaDeUsado): Promise<ResultadoDeEnvio> {
  const cuerpo = new FormData();
  cuerpo.set('nombre', datos.nombre);
  cuerpo.set('telefono', datos.telefono);
  cuerpo.set('email', datos.email ?? '');
  cuerpo.set('marca', datos.marca);
  cuerpo.set('anio', datos.anio);
  cuerpo.set('kilometros', datos.km);
  // `modelo`, `estado` y `mensaje` no están en la lista de obligatorios del
  // 422, pero se mandan igual: si el backend los guarda, mejor para el asesor.
  cuerpo.set('modelo', datos.modelo);
  cuerpo.set('estado', datos.estado ?? '');
  cuerpo.set('mensaje', datos.mensaje ?? '');
  for (const imagen of datos.imagenes ?? []) cuerpo.append('imagenes[]', imagen);

  return enviar(RUTAS.vender, cuerpo);
}

export interface ConsultaGeneral {
  nombre: string;
  telefono: string;
  email?: string;
  localidad?: string;
  mensaje: string;
}

/** Contacto general del sitio, sin unidad de referencia. */
export async function registrarConsultaGeneral(datos: ConsultaGeneral): Promise<ResultadoDeEnvio> {
  return enviar(RUTAS.general, {
    contact_name: datos.nombre,
    contact_phone: datos.telefono,
    contact_email: datos.email ?? '',
    contact_city: datos.localidad ?? '',
    contact_msj: datos.mensaje,
    // De dónde salió la consulta. El backend lo exige; "Web" es lo que
    // corresponde a este sitio.
    contact_desde: 'Web',
  });
}

/**
 * Manda y cuenta cómo salió, sin tirar nunca.
 *
 * El error se loguea ENTERO del lado del servidor —con la URL, el código y, si
 * es un 422, los nombres de campo que la API rechazó, que es lo que va a decir
 * cómo se llaman de verdad—. Al visitante sólo le vuelve
 * `mensajeParaElUsuario`, que no nombra endpoints ni códigos.
 */
/**
 * Muestra en el log el cuerpo EXACTO que sale hacia Ruta Sur.
 *
 * PARA QUÉ, SI YA ESTÁ EL PANEL DE RED DEL NAVEGADOR
 *
 * Porque el navegador muestra otra cosa. Lo que se ve ahí es lo que el
 * formulario le manda a NUESTRA ruta `/api/contacto/*`; el pedido que sale de
 * nuestro servidor hacia Ruta Sur pasa por un proceso de Node y no aparece en
 * ningún panel. Y es justo el que importa: es donde los campos ya están
 * traducidos a los nombres que la API espera.
 *
 * CÓMO SE PRENDE
 *
 *   LOG_LEADS=1 npm start
 *
 * Y queda apagado por defecto a propósito: esto imprime nombre, teléfono y mail
 * de personas reales. En producción son datos de terceros en un log que puede
 * terminar en cualquier lado, así que se prende para diagnosticar y se apaga.
 *
 * Los archivos no se imprimen —una foto de un usado en base64 llenaría la
 * pantalla—: se listan por nombre y tamaño, que es lo que sirve para saber si
 * viajaron.
 */
function registrarEnvio(ruta: string, cuerpo: unknown): void {
  if (process.env.LOG_LEADS !== '1') return;

  const detalle =
    typeof FormData !== 'undefined' && cuerpo instanceof FormData
      ? Object.fromEntries(
          [...cuerpo.entries()].map(([clave, valor]) => [
            clave,
            valor instanceof File ? `<archivo ${valor.name}, ${valor.size} bytes>` : valor,
          ]),
        )
      : cuerpo;

  console.info(
    `[LEAD-ENVIADO] POST ${ruta}
${JSON.stringify(detalle, null, 2)}`,
  );
}

async function enviar(ruta: string, cuerpo: unknown): Promise<ResultadoDeEnvio> {
  registrarEnvio(ruta, cuerpo);

  try {
    await pedir(ruta, { metodo: 'POST', cuerpo, revalidar: 0 });
    return { ok: true };
  } catch (error) {
    registrarLeadPerdido(ruta, cuerpo, error);

    // Sólo lo ACCIONABLE. Quien llama compone el resto —"el WhatsApp sirve
    // igual"— y un genérico adelante daría dos frases diciendo lo mismo.
    if (error instanceof ErrorDeApi) {
      return { ok: false, mensaje: error.mensajeAccionable, causa: error.causa };
    }
    return { ok: false };
  }
}

/**
 * Deja el lead completo en el log del servidor cuando el backend no lo acepta.
 *
 * ES LA RED MIENTRAS EL BACKEND ESTÉ ROTO, y hoy lo está: los tres endpoints de
 * contacto pasan la validación y devuelven `500 Server Error` al guardar —
 * probado con una sola petición limpia y bien formada, no es rate limiting—.
 * Hasta que Eduardo lo arregle, ningún lead se registra del lado de Decker.
 *
 * Con esto, al menos no se pierde: queda en el log del servidor —en Vercel, en
 * los logs del deploy— con todos los datos que cargó la persona, en una línea
 * que se puede buscar por `LEAD-NO-REGISTRADO` y leer sin herramientas.
 *
 * No reemplaza al registro real. Es lo que permite recuperar a mano las
 * consultas de estos días si alguien las reclama.
 */
function registrarLeadPerdido(ruta: string, cuerpo: unknown, error: unknown): void {
  const datos =
    typeof FormData !== 'undefined' && cuerpo instanceof FormData
      ? Object.fromEntries(
          // Los archivos no se vuelcan al log: se anota que venían.
          [...cuerpo.entries()].map(([k, v]) => [k, v instanceof File ? `[archivo ${v.name}]` : v]),
        )
      : cuerpo;

  console.error(
    `[LEAD-NO-REGISTRADO] ${ruta} · ${new Date().toISOString()} · ` +
      `datos=${JSON.stringify(datos)} · motivo=${
        error instanceof ErrorDeApi ? `${error.causa} ${error.estadoHttp ?? ''}` : String(error)
      }`,
  );
}
