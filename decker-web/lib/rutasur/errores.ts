/**
 * El único tipo de error que sale de la capa de Ruta Sur.
 *
 * Todo lo que puede fallar contra la API —que no haya red, que tarde, que
 * conteste 403, que conteste 200 con un cuerpo que no entendemos— entra por acá
 * y sale como un `ErrorDeApi`. Quien lo atrapa no tiene que distinguir entre un
 * `TypeError` de fetch, un `DOMException` de timeout y un JSON inesperado: mira
 * `causa` y decide.
 *
 * `causa` está pensada para decidir, no para mostrar:
 * - `configuracion`: falta la URL o la API key. Es un error NUESTRO, de deploy,
 *   y no se arregla reintentando.
 * - `red` / `timeout`: el server no contestó. Reintentar tiene sentido.
 * - `http`: contestó con un código de error. `estadoHttp` dice cuál.
 * - `validacion`: un 422. `mensajes` trae lo que hay que mostrarle al usuario,
 *   campo por campo. Es el único caso en que el texto de la API va a pantalla.
 * - `formato`: contestó bien pero el cuerpo no es lo que esperábamos.
 *
 * Salvo `validacion`, al usuario NO se le muestra ninguno de estos mensajes:
 * son para el log del servidor. La pantalla de error dice una sola cosa, en
 * castellano y sin detalles técnicos (ver `app/error.tsx`).
 */
export type CausaDeError =
  | 'configuracion'
  | 'red'
  | 'timeout'
  | 'http'
  | 'validacion'
  | 'formato';

export class ErrorDeApi extends Error {
  readonly causa: CausaDeError;
  readonly estadoHttp?: number;
  /**
   * Los mensajes del `errors` de un 422, aplanados. Van a pantalla tal cual:
   * son los que le dicen al usuario que el teléfono está mal escrito.
   */
  readonly mensajes: string[];

  constructor(
    causa: CausaDeError,
    mensaje: string,
    estadoHttp?: number,
    mensajes: string[] = [],
  ) {
    super(mensaje);
    this.name = 'ErrorDeApi';
    this.causa = causa;
    this.estadoHttp = estadoHttp;
    this.mensajes = mensajes;
  }

  /**
   * `true` si volver a pedir lo mismo puede llegar a funcionar.
   *
   * El 429 queda AFUERA a propósito, al revés de lo que uno haría por reflejo:
   * la documentación de esta API pide explícitamente no reintentar automático
   * ante un 429, y el sitio muestra "esperá un momento" en vez de insistir.
   * Insistir contra un rate limit es lo que lo extiende.
   */
  get valeReintentar(): boolean {
    if (this.causa === 'red' || this.causa === 'timeout') return true;
    if (this.causa === 'http') return (this.estadoHttp ?? 0) >= 500;
    return false;
  }

  /**
   * Lo que se le muestra al visitante. Nunca la URL, el endpoint ni el detalle
   * del 500: eso va al log del servidor.
   */
  get mensajeParaElUsuario(): string {
    return this.mensajeAccionable ?? this.mensajeGenerico;
  }

  /**
   * El mensaje SÓLO si dice algo que la persona pueda usar: qué campo está mal,
   * o que espere un momento. `undefined` cuando lo único que hay para decir es
   * "algo falló".
   *
   * La diferencia importa donde el mensaje se compone con otro texto —los
   * formularios de lead agregan "el WhatsApp sirve igual"—: pegarle adelante un
   * genérico produce dos frases que dicen lo mismo.
   */
  get mensajeAccionable(): string | undefined {
    if (this.causa === 'validacion') {
      // Ver `esParaHumanos`: esta API devuelve claves de traducción crudas.
      const utiles = this.mensajes.filter(esParaHumanos);
      if (utiles.length > 0) return utiles.join(' ');
      return undefined;
    }
    if (this.estadoHttp === 429) {
      return 'Estamos recibiendo muchas consultas. Esperá un momento y volvé a intentar.';
    }
    return undefined;
  }

  private get mensajeGenerico(): string {
    if (this.causa === 'timeout') {
      return 'La consulta está tardando más de lo normal. Probá de nuevo en un minuto.';
    }
    if (this.causa === 'red') {
      return 'No pudimos conectarnos. Revisá tu conexión y probá de nuevo.';
    }
    return 'No pudimos completar la operación. Probá de nuevo en unos minutos.';
  }
}

/**
 * Se pidió un recurso que la API no tiene.
 *
 * Es una subclase y no una `causa` más porque quien la atrapa hace algo
 * distinto: no muestra un error, muestra "no hay resultados" o saca la unidad
 * de favoritos. Mezclarla con las fallas reales es exactamente lo que produce
 * un "no se pudo cargar el stock" cuando en realidad la búsqueda no tuvo
 * coincidencias.
 */
/**
 * ¿Este mensaje del `errors` se le puede mostrar a una persona?
 *
 * ESTA API DEVUELVE CLAVES DE TRADUCCIÓN SIN RESOLVER. Un 422 de
 * `/vehiculos/contacto` con el cuerpo vacío contesta `validation.required` en
 * los siete campos, y el `message` de arriba dice literalmente
 * `"validation.required (and 6 more errors)"`. Son identificadores internos de
 * Laravel que quedaron sin traducir del lado del backend.
 *
 * Mostrarle "validation.required validation.required validation.required" a
 * alguien que quiso consultar por un camión es peor que no decirle nada: no
 * entiende qué pasó y encima el sitio parece roto. Se filtran y queda el
 * mensaje genérico, que al menos es una frase.
 *
 * Si algún día el backend los traduce, van a pasar solos: el filtro sólo saca
 * lo que tiene forma de clave —`palabra.palabra`, sin espacios—.
 */
function esParaHumanos(mensaje: string): boolean {
  const limpio = mensaje.trim();
  if (!limpio) return false;
  // `validation.required`, `auth.failed`: puntos, sin espacios, todo minúscula.
  return !/^[a-z_]+(\.[a-z_]+)+$/.test(limpio);
}

export class RecursoInexistente extends ErrorDeApi {
  constructor(mensaje: string) {
    super('http', mensaje, 404);
    this.name = 'RecursoInexistente';
  }
}
