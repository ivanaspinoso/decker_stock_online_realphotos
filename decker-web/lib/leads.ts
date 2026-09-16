/**
 * Registro de consultas, desde el navegador. Módulo de CLIENTE.
 *
 * Es la otra mitad de `lib/rutasur/contacto.ts`: aquél le pega a la API desde
 * el servidor, éste le avisa al servidor desde el navegador.
 *
 * EL ORDEN: SE DISPARA, NO SE ESPERA, Y DESPUÉS SE MIRA
 *
 * Los navegadores sólo dejan abrir una pestaña nueva DENTRO del gesto que la
 * pidió. Si hiciéramos `await fetch(...)` y recién después `window.open`, entre
 * el clic y la apertura pasa un viaje de red: para el navegador eso ya no es el
 * gesto del usuario y bloquea el popup. El visitante clickea "Consultar por
 * WhatsApp" y no pasa nada.
 *
 * Entonces el pedido SALE PRIMERO pero no se espera: se dispara y en el mismo
 * tick se abre WhatsApp. `keepalive` es lo que hace que sobreviva a que la
 * pestaña se vaya a otro lado.
 *
 * LO QUE SÍ SE HACE: LEER LA RESPUESTA CUANDO LLEGA
 *
 * Antes esto era un `void fetch(...)` —se disparaba y nadie miraba nunca el
 * resultado—. Un 422 (un teléfono que la API rechaza) o un 429 (demasiados
 * envíos seguidos) se perdían en silencio: el visitante se iba convencido de
 * que su consulta había quedado registrada, y del lado de Decker no había nada.
 *
 * Ahora la respuesta se lee igual, tarde, con el visitante ya en WhatsApp. Si
 * falló algo QUE LA PERSONA PUEDA ARREGLAR se anuncia con un evento y
 * `AvisoDeLead` lo muestra en la página: para cuando vuelve a la pestaña, el
 * aviso está ahí. No llega a tiempo para que corrija antes de escribir —eso
 * costaría el popup— pero sí para que sepa que tiene que insistir, en vez de
 * esperar un llamado que nunca va a venir.
 *
 * Si el que falló fue el servidor, no se le dice nada: ver el comentario en
 * `disparar()`. Un cartel rojo por un 500 asusta al visitante por algo que no
 * hizo mal y que no lo afecta —su mensaje de WhatsApp llega igual—.
 */

/** Evento que escucha `AvisoDeLead`. Misma convención que `decker:favoritos-cambiaron`. */
export const EVENTO_LEAD_FALLO = 'decker:lead-fallo';

/** Lo que viaja en el evento: qué decirle al visitante. */
export interface DetalleDeFallo {
  mensaje: string;
}

/**
 * Deja registrada una consulta por una unidad, sin bloquear el WhatsApp.
 *
 * NO HACE NADA SI NO HAY DATOS DE CONTACTO, y esa guarda es lo que evita
 * mostrarle un error a todo el mundo.
 *
 * `POST /vehiculos/contacto` exige `nombre`, `email`, `localidad` y `telefono`
 * —confirmado contra el 422 de la API—. El botón de la ficha no pide ninguno:
 * es un clic directo a WhatsApp. Sin la guarda, cada visitante que lo tocara
 * dispararía un 422 garantizado y vería el aviso de "no pudimos registrar tu
 * consulta", que sería un error nuestro disfrazado de problema suyo.
 *
 * Entonces: sin datos no se llama. El WhatsApp abre igual, que es lo que el
 * visitante quería, y nadie ve un cartel rojo por algo que no hizo mal.
 *
 * QUÉ FALTA PARA QUE ESTO REGISTRE DE VERDAD: un formulario que pida nombre,
 * teléfono, email y localidad antes de abrir WhatsApp. Es una decisión de
 * producto —pedir datos baja la conversión del botón— y por eso no se toma
 * desde acá. El día que exista, esta función ya está lista: le llegan los datos
 * y deja de cortar.
 */
export function registrarConsultaDeUnidad(datos: {
  slug: string;
  nombre?: string;
  telefono?: string;
  email?: string;
  localidad?: string;
  mensaje?: string;
}): void {
  const tieneContacto =
    Boolean(datos.nombre?.trim()) &&
    Boolean(datos.telefono?.trim()) &&
    Boolean(datos.email?.trim());

  if (!tieneContacto) return;

  disparar('/api/contacto/unidad', JSON.stringify(datos), 'application/json');
}

/** Deja registrada una oferta de usado. Puede llevar fotos. */
export function registrarOfertaDeUsado(formulario: FormData): void {
  // Sin `Content-Type`: `fetch` le pone el `boundary` del multipart solo, y
  // ponérselo a mano rompe el parseo del otro lado.
  disparar('/api/contacto/vender', formulario);
}

function disparar(ruta: string, cuerpo: BodyInit, contentType?: string): void {
  try {
    fetch(ruta, {
      method: 'POST',
      body: cuerpo,
      ...(contentType ? { headers: { 'Content-Type': contentType } } : {}),
      // Sobrevive a que la pestaña navegue a WhatsApp.
      keepalive: true,
    })
      .then(async (respuesta) => {
        // La ruta contesta 200 incluso cuando el envío falló: lo que decide es
        // el cuerpo. Ver el comentario de las rutas en `app/api/contacto/`.
        const datos = (await respuesta.json().catch(() => null)) as {
          registrada?: boolean;
          mensaje?: string;
        } | null;

        if (datos?.registrada) return;

        // SIN MENSAJE NO SE AVISA NADA, y el silencio es deliberado.
        //
        // Quien decide si el visitante tiene que enterarse es la ruta, no este
        // archivo. Su criterio —ver `mensajeDeLead` en
        // `app/api/contacto/*/route.ts`— es si la persona puede HACER algo:
        // un 422 se muestra porque el dato es suyo y lo puede corregir, un 429
        // porque puede esperar. Un 500 o una falla de red se callan: es
        // problema nuestro, la persona no puede arreglarlo, y su consulta no se
        // perdió porque el WhatsApp que se acaba de abrir lleva todos los datos
        // que cargó.
        //
        // Acá había un `|| MENSAJE_GENERICO` que anulaba esa decisión: la ruta
        // mandaba `mensaje: undefined` para no molestar y el cartel salía igual.
        // Con los tres endpoints de contacto devolviendo 500 hoy, eso significa
        // que TODO el mundo veía "no pudimos registrar tu consulta" después de
        // completar el formulario bien.
        //
        // El error no se pierde: queda en el log del servidor con el lead
        // entero, bajo `[LEAD-NO-REGISTRADO]`.
        if (datos?.mensaje) avisar(datos.mensaje);
      })
      .catch(() => {
        // El pedido no llegó a salir: sin red, o la pestaña se cerró antes. No
        // se avisa nada —no hay pantalla donde mostrarlo— y el mensaje de
        // WhatsApp, que es lo que resuelve la consulta, ya está abierto.
      });
  } catch {
    // `fetch` puede tirar sincrónicamente si el cuerpo es inválido. Tampoco es
    // motivo para que no se abra WhatsApp.
  }
}

function avisar(mensaje: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<DetalleDeFallo>(EVENTO_LEAD_FALLO, { detail: { mensaje } }),
  );
}
