import { pedir } from '@/lib/rutasur/cliente';
import { LARGOS, MAXIMO_DE_FOTOS } from '@/lib/rutasur/limites';
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
  /** El NOMBRE de la unidad, como se lee en la ficha. No el id. */
  vehiculo: string;
  /** El NOMBRE de la agencia. No el `company_id`. */
  agencia: string;
}

/**
 * Consulta por una unidad puntual. Se dispara junto con el botón de WhatsApp.
 *
 * `agencia` Y `vehiculo` VAN COMO NOMBRE, NO COMO ID, y esto costó dos vueltas.
 *
 * Primero se mandaban como número y la API contestaba `422 validation.string`.
 * El arreglo obvio fue convertirlos a texto con `String()`, y la validación
 * pasó —pero mandaba `"1"` y `"3455"`—. La documentación aclara lo que el 422
 * no decía: son campos de TEXTO LIBRE, `agencia` es "el nombre de la agencia"
 * hasta 150 caracteres y `vehiculo` "la unidad consultada" hasta 255.
 *
 * O sea que el 422 se arreglaba pasando el id a texto, y el resultado seguía
 * siendo inútil: el asesor abría la consulta y leía "agencia 1, vehículo 3455".
 * Pasar una validación no es lo mismo que mandar el dato bien.
 */
export async function registrarConsultaPorUnidad(
  datos: ConsultaPorUnidad,
): Promise<ResultadoDeEnvio> {
  return enviar(RUTAS.porUnidad, {
    nombre: recortar(datos.nombre, LARGOS.nombre),
    email: recortar(datos.email ?? '', LARGOS.email),
    localidad: recortar(datos.localidad ?? '', LARGOS.localidad),
    telefono: recortar(datos.telefono, LARGOS.telefono),
    mensaje: recortar(datos.mensaje ?? '', LARGOS.mensaje),
    agencia: recortar(datos.agencia, LARGOS.agencia),
    vehiculo: recortar(datos.vehiculo, LARGOS.vehiculo),
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
  /**
   * Fotos del usado, ya convertidas a Data URL Base64 por el navegador.
   * Como máximo cuatro: la API sólo tiene `fileSource1` a `fileSource4`.
   */
  fotos?: string[];
}


/**
 * Corta un texto al largo que la API acepta.
 *
 * Sin esto, un mensaje de más de 5.000 caracteres vuelve como 422 y el
 * visitante ve "revisá los datos" sin entender cuál. Es preferible que llegue
 * recortado a que no llegue: el asesor igual lo va a contestar por WhatsApp,
 * donde el texto viaja entero.
 */
const recortar = (valor: string, tope: number) => valor.trim().slice(0, tope);

/**
 * Formulario de parte de pago.
 *
 * VA COMO JSON, NO COMO MULTIPART, y las fotos adentro del JSON.
 *
 * Esto antes mandaba un `FormData` con los archivos como `imagenes[]`, que es
 * la convención de Laravel y era una suposición razonable. La documentación de
 * Eduardo dice otra cosa: el cuerpo es `application/json` y cada foto viaja
 * como un **Data URL Base64 completo** —con el prefijo `data:image/jpeg;base64,`
 * incluido— en un campo propio, `fileSource1` a `fileSource4`. Un multipart no
 * lo lee.
 *
 * LOS TIPOS TAMPOCO SON LIBRES
 *
 * `anio` es un entero entre 1900 y el año que viene, y `kilometros` un número.
 * El formulario los tiene como texto —son `<input>`— y acá se convierten. Un
 * `"2019"` entre comillas pasa la validación de Laravel por casualidad; un
 * campo vacío que se convierte en `NaN`, no.
 *
 * LO QUE SE SACÓ
 *
 * `modelo`, `estado` y `mensaje` no existen en esta API. Se mandaban "por si
 * el backend los guarda", y no los guarda: los descarta. Lo que sí existe es
 * `observaciones`, un texto libre de hasta 5.000 caracteres, así que los tres
 * se juntan ahí en vez de perderse.
 */
export async function registrarOfertaDeUsado(datos: OfertaDeUsado): Promise<ResultadoDeEnvio> {
  const anio = Number.parseInt(datos.anio, 10);
  const kilometros = Number.parseInt(String(datos.km).replace(/\D/g, ''), 10);

  const cuerpo: Record<string, unknown> = {
    nombre: recortar(datos.nombre, LARGOS.nombre),
    email: recortar(datos.email ?? '', LARGOS.email),
    telefono: recortar(datos.telefono, LARGOS.telefono),
    marca: recortar(datos.marca, LARGOS.marca),
    // `NaN` no se manda: que la API conteste "falta el año" es más claro que
    // recibir un número inventado.
    anio: Number.isFinite(anio) ? anio : undefined,
    kilometros: Number.isFinite(kilometros) ? kilometros : undefined,
    observaciones: recortar(observacionesDe(datos), LARGOS.observaciones),
  };

  // Las fotos ocupan un campo numerado cada una. Se manda sólo lo que haya.
  (datos.fotos ?? []).slice(0, MAXIMO_DE_FOTOS).forEach((foto, indice) => {
    cuerpo[`fileSource${indice + 1}`] = foto;
  });

  return enviar(RUTAS.vender, cuerpo);
}

/**
 * Junta en un solo texto lo que la API no tiene campo para guardar.
 *
 * El modelo, el estado de la unidad y la sucursal elegida son datos que el
 * visitante se tomó el trabajo de cargar. Perderlos porque la API no los
 * contempla obligaría al asesor a volver a preguntar exactamente lo que ya
 * le respondieron.
 */
function observacionesDe(datos: OfertaDeUsado): string {
  return [
    datos.modelo ? `Modelo: ${datos.modelo}` : '',
    datos.estado ? `Estado: ${datos.estado}` : '',
    datos.mensaje ?? '',
  ]
    .filter(Boolean)
    .join('\n');
}

export interface ConsultaGeneral {
  nombre: string;
  telefono: string;
  email?: string;
  localidad?: string;
  mensaje: string;
  /** El `vehicle_id`, si la consulta salió de una ficha. Entero, opcional. */
  unidadId?: number;
}

/**
 * Contacto general del sitio.
 *
 * `contact_unidad` es el único campo opcional de esta API y es un ENTERO —el id
 * del vehículo—, al revés de `/vehiculos/contacto`, donde la unidad va por
 * nombre. No es un descuido de la documentación: son dos formularios distintos
 * del backend viejo y cada uno guarda lo suyo. Se manda sólo si hay unidad.
 */
export async function registrarConsultaGeneral(datos: ConsultaGeneral): Promise<ResultadoDeEnvio> {
  return enviar(RUTAS.general, {
    contact_name: recortar(datos.nombre, LARGOS.nombre),
    contact_phone: recortar(datos.telefono, LARGOS.telefono),
    contact_email: recortar(datos.email ?? '', LARGOS.email),
    contact_city: recortar(datos.localidad ?? '', LARGOS.localidad),
    contact_msj: recortar(datos.mensaje, LARGOS.mensaje),
    // De dónde salió la consulta. El backend lo exige; "Web" es lo que
    // corresponde a este sitio.
    contact_desde: 'Web',
    ...(Number.isFinite(datos.unidadId) ? { contact_unidad: datos.unidadId } : {}),
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
