/**
 * Favoritos anónimos.
 *
 * El comprador de un camión no abre una cuenta para marcar tres unidades: entra
 * desde una búsqueda, compara, se va, y vuelve dos días después. Todo el sistema
 * vive en el navegador de esa persona y no pide absolutamente nada a cambio.
 *
 * PRIVACIDAD — INNEGOCIABLE
 * Acá NO se guarda ni un dato personal: ni nombre, ni teléfono, ni mail, ni la
 * dirección IP. Sólo dos cosas: qué slugs marcó y un identificador aleatorio de
 * visitante que no está atado a ninguna persona y que la persona borra vaciando
 * los datos del sitio. El identificador existe para poder contar más adelante
 * "qué unidades se guardan más", no para reconocer a nadie.
 *
 * Cuando esto se conecte a un backend real hay que REVISARLO CON EL CLIENTE
 * antes de habilitarlo: bajo la Ley 25.326 de Protección de Datos Personales,
 * un identificador persistente enviado a un servidor deja de ser un dato del
 * navegador y pasa a ser un dato tratado por Decker, con las obligaciones que
 * eso implica (finalidad declarada, política de privacidad, derecho de acceso y
 * supresión). Mientras el evento sólo se escribe en la consola, no sale del
 * dispositivo y no hay tratamiento.
 */

const CLAVE_FAVORITOS = 'decker:favoritos';
const CLAVE_VISITANTE = 'decker:visitante';

/** Cambió la lista: lo escuchan todas las tarjetas montadas en la página. */
export const EVENTO_CAMBIO = 'decker:favoritos-cambiaron';

export interface EventoFavorito {
  /** Slug de la unidad. Es el id público, el mismo que va en la URL. */
  unidad: string;
  /** Identificador aleatorio del navegador. No identifica a una persona. */
  visitante: string;
  accion: 'guardar' | 'quitar';
  /** ISO 8601, en hora del dispositivo. */
  momento: string;
}

/**
 * Todo acceso a `localStorage` va envuelto: en ventana privada, con las cookies
 * de terceros bloqueadas o con el almacenamiento lleno, `localStorage` no
 * devuelve `null`, TIRA. Un favorito que no se puede guardar no puede tumbar la
 * ficha de la unidad.
 */
function leerCrudo(clave: string): string | null {
  try {
    return window.localStorage.getItem(clave);
  } catch {
    return null;
  }
}

function escribirCrudo(clave: string, valor: string): void {
  try {
    window.localStorage.setItem(clave, valor);
  } catch {
    // Sin almacenamiento, los favoritos duran lo que dure la pestaña. Es una
    // degradación aceptable: nada de lo que hay acá es información que el
    // usuario no pueda volver a marcar.
  }
}

export function leerFavoritos(): string[] {
  if (typeof window === 'undefined') return [];
  const crudo = leerCrudo(CLAVE_FAVORITOS);
  if (!crudo) return [];
  try {
    const valor: unknown = JSON.parse(crudo);
    // Se valida en vez de confiar: el usuario puede haber editado la clave a
    // mano, o puede haber quedado de una versión anterior con otro formato.
    if (!Array.isArray(valor)) return [];
    return valor.filter((elemento): elemento is string => typeof elemento === 'string');
  } catch {
    return [];
  }
}

export function esFavorita(slug: string): boolean {
  return leerFavoritos().includes(slug);
}

/**
 * Identificador aleatorio del navegador. Se genera la primera vez y no se
 * regenera: si se regenerara en cada visita no serviría para contar nada, y si
 * derivara de algo del dispositivo sería una huella, que es justo lo que NO se
 * quiere.
 */
export function idVisitante(): string {
  if (typeof window === 'undefined') return 'servidor';

  const guardado = leerCrudo(CLAVE_VISITANTE);
  if (guardado) return guardado;

  const nuevo =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : // Respaldo para navegadores viejos —los que corren en el teléfono que
        // motiva todo este sitio—. No tiene que ser criptográfico: sólo tiene
        // que no repetirse.
        `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  escribirCrudo(CLAVE_VISITANTE, nuevo);
  return nuevo;
}

/**
 * Marca o desmarca una unidad. Devuelve la lista resultante.
 *
 * Lee del almacenamiento en vez de recibir la lista por parámetro: puede haber
 * dos pestañas abiertas, o la misma unidad puede estar en la grilla y en la
 * sección de guardadas al mismo tiempo.
 */
export function alternarFavorito(slug: string): string[] {
  const actuales = leerFavoritos();
  const estaba = actuales.includes(slug);
  const siguientes = estaba ? actuales.filter((id) => id !== slug) : [slug, ...actuales];

  escribirCrudo(CLAVE_FAVORITOS, JSON.stringify(siguientes));

  registrarEvento({
    unidad: slug,
    visitante: idVisitante(),
    accion: estaba ? 'quitar' : 'guardar',
    momento: new Date().toISOString(),
  });

  // Avisa a las demás tarjetas de la página. El evento `storage` del navegador
  // sólo se dispara en las OTRAS pestañas, nunca en la que hizo el cambio.
  window.dispatchEvent(new CustomEvent<string[]>(EVENTO_CAMBIO, { detail: siguientes }));

  return siguientes;
}

/**
 * Registra el evento de favorito.
 *
 * TODO: enviar a backend real cuando exista. El destino previsto es Airtable o
 * un endpoint propio; la forma del evento ya es la definitiva, así que conectar
 * es reemplazar este `console.info` por un `fetch` con `keepalive` (para que el
 * pedido sobreviva a la navegación) y una cola de reintento.
 *
 * ANTES DE CONECTARLO: revisar con el cliente el punto de privacidad del
 * encabezado de este archivo. Mientras el evento sólo se escribe en consola, no
 * sale del dispositivo.
 */
function registrarEvento(evento: EventoFavorito): void {
  // eslint-disable-next-line no-console
  console.info('[decker:favorito]', evento);
}

/**
 * Suscribe a los cambios de la lista. Devuelve la función para desuscribirse.
 *
 * Escucha las dos fuentes: el evento propio (misma pestaña) y `storage` (otra
 * pestaña del mismo sitio).
 */
export function suscribirAFavoritos(alCambiar: (favoritos: string[]) => void): () => void {
  const enEstaPestana = (evento: Event) => {
    const detalle = (evento as CustomEvent<string[]>).detail;
    alCambiar(detalle ?? leerFavoritos());
  };

  const enOtraPestana = (evento: StorageEvent) => {
    if (evento.key !== null && evento.key !== CLAVE_FAVORITOS) return;
    alCambiar(leerFavoritos());
  };

  window.addEventListener(EVENTO_CAMBIO, enEstaPestana);
  window.addEventListener('storage', enOtraPestana);

  return () => {
    window.removeEventListener(EVENTO_CAMBIO, enEstaPestana);
    window.removeEventListener('storage', enOtraPestana);
  };
}
