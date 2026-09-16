import {
  MS_DE_ESPERA,
  SEGUNDOS_DE_REVALIDACION,
  apiKey,
  urlBase,
} from '@/lib/rutasur/config';
import { ErrorDeApi, RecursoInexistente } from '@/lib/rutasur/errores';

/**
 * El cliente HTTP contra la API de Ruta Sur. TODA llamada sale de acá.
 *
 * No hay un solo `fetch` a esta API en ningún otro archivo del proyecto, y esa
 * es la regla que hace que el manejo de códigos de respuesta, el timeout, el
 * cacheo y la API key estén resueltos una vez y no catorce.
 *
 * SÓLO CORRE EN EL SERVIDOR. No es una recomendación de estilo: los endpoints
 * protegidos mandan la API key en el header, y todo lo que un componente
 * cliente importa termina en el bundle que baja el navegador. Si este módulo
 * entrara ahí, la key quedaría a la vista de cualquiera —y una key filtrada no
 * se arregla con un deploy, se arregla pidiéndole a Eduardo que la rote—.
 *
 * Como el proyecto no tiene instalado el paquete `server-only` (que haría
 * fallar el BUILD, que es mejor), la guarda es en tiempo de ejecución.
 *
 * Quién puede llamar a esto:
 * - Server Components y las funciones de `lib/api.ts`, que ya son de servidor.
 * - Los Route Handlers de `app/api/`, que son la puerta para el navegador: el
 *   cliente le pide a esa ruta —mismo origen, sin key— y la ruta le pide a la
 *   API con la key puesta.
 */
if (typeof window !== 'undefined') {
  throw new Error(
    'lib/rutasur/cliente.ts se importó desde el navegador. Este módulo lleva ' +
      'la API key: no puede entrar en el bundle del cliente. Los componentes ' +
      'cliente piden los datos a las rutas de /api.',
  );
}

export interface OpcionesDePedido {
  /** GET por defecto. */
  metodo?: 'GET' | 'POST' | 'PUT';
  /** Se serializa a JSON, salvo que sea un `FormData` (ver abajo). */
  cuerpo?: unknown;
  /** Query params. Los `undefined` y las cadenas vacías se descartan. */
  query?: Record<string, string | number | undefined>;
  /**
   * Manda `X-API-KEY` leyéndola de `RUTASUR_API_KEY`. Falla si no está.
   *
   * OJO CON EL ALCANCE: esto lee la variable de entorno y nada más. NO genera
   * la key a partir de usuario y contraseña. Quien puede tener que generarla
   * llama a `asegurarClave()` y pasa el resultado por `cabecerasExtra` —ver
   * `lib/rutasur/precios.ts`—; no se hace desde acá porque `clave.ts` usa este
   * mismo cliente para su `PUT /key` y quedarían importándose en círculo.
   */
  requiereClave?: boolean;
  /**
   * Cabeceras extra. Lo usa sólo `PUT /key`, que recibe las credenciales por
   * cabecera —ver `lib/rutasur/clave.ts`—. No meter nada acá que pueda
   * terminar en un log: las cabeceras se mandan tal cual.
   */
  cabecerasExtra?: Record<string, string>;
  /**
   * Segundos de caché. `0` desactiva (los POST no se cachean nunca).
   * Ver `SEGUNDOS_DE_REVALIDACION`: acá el cacheo no es performance, es no
   * quedar bloqueados por el rate limit de la API.
   */
  revalidar?: number;
}

/**
 * Pide una ruta y devuelve el JSON crudo, sin interpretar.
 *
 * Devuelve `unknown` a propósito: traducir es responsabilidad de `mapeo.ts`.
 * Acá pasan cinco cosas —autenticar, esperar con límite, leer el código de
 * respuesta, tolerar el cuerpo vacío y convertir cualquier falla en un
 * `ErrorDeApi`— y ninguna necesita saber qué se pidió.
 */
/**
 * Hasta cuándo no se vuelve a llamar a la API porque se la sabe caída.
 *
 * QUÉ PROBLEMA RESUELVE
 *
 * El server de Ruta Sur bloquea por IP cuando se le pide de más, y el bloqueo
 * dura entre veinticinco y cincuenta minutos. Mientras dura, el puerto no
 * acepta conexiones: cada `fetch` se queda esperando los diez segundos que
 * tarda el sistema en darse por vencido.
 *
 * Eso no rompía el sitio —el catálogo tiene su respaldo, la galería y las
 * agencias tienen el suyo— pero lo volvía inusable. Medido: ocho fichas al
 * azar, todas entre 10,3 y 10,7 segundos, porque cada una pedía sus fotos a
 * `/vehiculos/{id}/imagenes` y esperaba el timeout completa antes de mostrarse
 * sin ellas. Diez segundos en blanco es peor que un error: con un error la
 * persona entiende que algo pasa, con diez segundos piensa que el sitio no
 * anda y se va.
 *
 * Entonces el primer fallo abre un respiro. Durante ese rato, cualquier lectura
 * corta al instante sin tocar la red, y quien la pidió usa su respaldo como si
 * hubiera fallado rápido. Las mismas ocho fichas pasan de 10,5 segundos a
 * cuarenta milisegundos.
 *
 * POR QUÉ MEDIO MINUTO Y NO MÁS
 *
 * Porque el respiro también decide cuánto tarda el sitio en darse cuenta de que
 * la API volvió. Con treinta segundos son unos pocos reintentos en toda la
 * ventana del bloqueo —nada que lo alimente— y la recuperación es casi
 * inmediata.
 *
 * POR QUÉ ESTO NO ES EL LIMITADOR DE RITMO QUE SE SACÓ
 *
 * Son opuestos. Aquél frenaba pedidos que iban a funcionar, y por eso hacía el
 * sitio cuarenta y ocho veces más lento —ver el comentario más abajo—. Éste
 * sólo actúa DESPUÉS de una falla comprobada y salta apenas la API contesta: no
 * puede demorar un pedido que hubiera andado.
 *
 * Es memoria del proceso: en un hosting con varias instancias cada una lleva su
 * propia cuenta, que para esto alcanza.
 */
let apiCaidaHasta = 0;
const RESPIRO_MS = 30_000;

export async function pedir(ruta: string, opciones: OpcionesDePedido = {}): Promise<unknown> {
  const {
    metodo = 'GET',
    cuerpo,
    query,
    requiereClave = false,
    cabecerasExtra,
    revalidar = metodo === 'GET' ? SEGUNDOS_DE_REVALIDACION : 0,
  } = opciones;

  const destino = `${urlBase()}${ruta.startsWith('/') ? ruta : `/${ruta}`}${armarQuery(query)}`;

  const cabeceras: Record<string, string> = {
    // La API decide por el `Accept` si contesta JSON o si redirige a una
    // pantalla HTML. Sin esto, un 403 puede llegar como un 302 y romper el
    // parseo con un mensaje que no ayuda a nadie.
    Accept: 'application/json',
  };

  if (requiereClave) {
    const clave = apiKey();
    if (!clave) {
      throw new ErrorDeApi(
        'configuracion',
        `${ruta} es un endpoint protegido y falta RUTASUR_API_KEY. Ver lib/rutasur/clave.ts.`,
      );
    }
    cabeceras['X-API-KEY'] = clave;
  }

  if (cabecerasExtra) Object.assign(cabeceras, cabecerasExtra);

  // El FormData va crudo: `fetch` le pone el `boundary` al Content-Type solo, y
  // ponérselo a mano rompe el parseo del lado de PHP. Lo usa el formulario de
  // parte de pago, que puede llevar fotos.
  const esFormData = typeof FormData !== 'undefined' && cuerpo instanceof FormData;
  if (cuerpo !== undefined && !esFormData) cabeceras['Content-Type'] = 'application/json';

  let respuesta: Response;
  try {
    /**
     * SIN LIMITADOR DE RITMO ACÁ, y no por olvido: se probó y se sacó.
     *
     * La idea era obvia —este backend se bloquea por volumen sostenido, así que
     * pongamos un freno en el único lugar por donde pasan todas las llamadas— y
     * estaba mal por una razón que sólo apareció midiendo: **Next intercepta
     * este `fetch` y lo sirve de su caché sin tocar la red**. Desde acá no hay
     * forma de saber si un pedido va a salir o no, así que el freno frenaba
     * también los que se resolvían de memoria.
     *
     * Medido con seis fichas en paralelo, todas ya cacheadas: 20.986 ms con el
     * freno contra 436 ms sin él. Cuarenta y ocho veces más lento para proteger
     * un tráfico que no existía.
     *
     * Lo que SÍ limita el tráfico real está en otro lado y ya funciona: el
     * `revalidate` de `config.ts` (el catálogo sale a la red una vez cada cinco
     * minutos, no una por visita), las fotos cacheadas un día, la paginación de
     * 24, el escalonado de miniaturas de la galería y las tandas con descanso
     * del script de precalentado. Ver "Cuando la API falla" en CLAUDE.md.
     */
    // EL CORTA-CORRIENTE: si la API acaba de fallar, ni se intenta.
    //
    // Sólo para lecturas. Un POST de lead se manda igual aunque la API venga
    // fallando: es el dato de una persona real, y perderlo por una suposición
    // nuestra sería peor que esperar. Además va sin bloquear a nadie —el
    // visitante ya está en WhatsApp— así que la espera no se nota.
    if (metodo === 'GET' && Date.now() < apiCaidaHasta) {
      throw new ErrorDeApi(
        'red',
        `La API falló hace menos de ${RESPIRO_MS / 1000}s y está en respiro (${destino}).`,
      );
    }

    respuesta = await fetch(destino, {
      method: metodo,
      headers: cabeceras,
      body:
        cuerpo === undefined
          ? undefined
          : esFormData
            ? (cuerpo as FormData)
            : JSON.stringify(cuerpo),
      // En Next 16 `fetch` NO cachea por defecto.
      ...(revalidar > 0
        ? { next: { revalidate: revalidar } }
        : { cache: 'no-store' as const }),
      signal: AbortSignal.timeout(MS_DE_ESPERA),
    });
  } catch (error) {
    // `AbortSignal.timeout` corta con un DOMException llamado TimeoutError; el
    // resto de las fallas de red llegan como TypeError. Se separan porque al
    // mirar el log no es lo mismo "tarda demasiado" que "no resuelve el DNS".
    //
    // OJO: en esta API un timeout NO siempre significa "el server está lento".
    // Un `/vehiculos/{id}` inexistente se cuelga 21 segundos y corta, y lo
    // mismo hace cuando te pasaste de pedidos seguidos. Quien pide un recurso
    // puntual tiene que interpretar el timeout en su contexto (ver
    // `lib/rutasur/vehiculos.ts`).
    apiCaidaHasta = Date.now() + RESPIRO_MS;

    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new ErrorDeApi('timeout', `La API no contestó en ${MS_DE_ESPERA / 1000}s (${destino}).`);
    }
    throw new ErrorDeApi('red', `No se pudo llegar a la API (${destino}): ${mensajeDe(error)}`);
  }

  // Se lee como texto y se parsea a mano porque hay que distinguir el cuerpo
  // vacío del cuerpo inválido, y `.json()` los confunde en el mismo throw.
  const texto = await respuesta.text();
  const json = parsearOIndefinido(texto);

  // Contestó: la API está viva, se cierra el respiro. Vale aunque el código sea
  // un error: un 500 o un 422 son respuestas, no una caída.
  apiCaidaHasta = 0;

  if (!respuesta.ok) throw errorSegunCodigo(respuesta.status, destino, json);

  // CUERPO VACÍO CON 200. `GET /vehiculos/search` contesta con el cuerpo vacío
  // —no con `[]`— cuando la búsqueda no tiene coincidencias. Un `.json()` sobre
  // eso explota, y explotar es exactamente lo que no queremos: "no encontramos
  // nada" no es una falla. Se devuelve un array vacío y lo entiende el llamador.
  if (texto.trim() === '') return [];

  if (json === undefined) {
    // Un 200 con cuerpo que no es JSON suele ser una página de error de PHP o
    // el HTML de un proxy. Alcanza con saber que no era JSON.
    throw new ErrorDeApi('formato', `La API contestó 200 pero el cuerpo no es JSON (${destino}).`);
  }

  return json;
}

/**
 * Traduce el código de respuesta al error que corresponde.
 *
 * Los códigos y su significado salen de la documentación de la API. Están
 * resueltos acá y en ningún otro lado: ningún llamador mira un `status`.
 */
function errorSegunCodigo(estado: number, destino: string, json: unknown): ErrorDeApi {
  const cuerpo = esObjeto(json) ? json : {};
  const mensajeApi = typeof cuerpo.message === 'string' ? cuerpo.message : '';

  switch (estado) {
    // 400: una regla de negocio del backend. El mensaje SÍ es para el usuario.
    case 400:
      return new ErrorDeApi(
        'validacion',
        `400 en ${destino}: ${mensajeApi || 'sin detalle'}`,
        400,
        mensajeApi ? [mensajeApi] : [],
      );

    // 403: la API key no sirve. Es un problema NUESTRO, no del visitante.
    // El punto de extensión para refrescarla está en `lib/rutasur/clave.ts`;
    // hoy no se regenera sola porque todavía no tenemos las credenciales.
    case 403:
      return new ErrorDeApi(
        'configuracion',
        `403 en ${destino}: la API key es inválida o está suspendida ` +
          `(${mensajeApi || 'sin detalle'}). Ver lib/rutasur/clave.ts.`,
        403,
      );

    // 404: el recurso no existe. Quien llamó decide si eso es un error o un
    // "no hay resultados". Las colecciones vacías de esta API NO llegan por
    // acá: contestan 200 con `[]`.
    case 404:
      return new RecursoInexistente(`404 en ${destino}.`);

    // 422: validación de formulario. Los mensajes van a pantalla.
    case 422:
      return new ErrorDeApi(
        'validacion',
        `422 en ${destino}.`,
        422,
        aplanarErrores(cuerpo.errors) ?? (mensajeApi ? [mensajeApi] : []),
      );

    // 429: rate limit. NO se reintenta —ver `valeReintentar`—.
    case 429:
      return new ErrorDeApi('http', `429 en ${destino}: demasiados pedidos.`, 429);

    default:
      return new ErrorDeApi(
        'http',
        `La API contestó ${estado} en ${destino}${mensajeApi ? `: ${mensajeApi}` : ''}.`,
        estado,
      );
  }
}

/**
 * Aplana el `errors` de Laravel: `{ campo: ["a", "b"] }` → `["a", "b"]`.
 *
 * Se pierde a qué campo pertenece cada mensaje, y está bien: los formularios
 * del sitio son cortos y el mensaje de Laravel ya nombra el campo ("El campo
 * teléfono es obligatorio").
 */
function aplanarErrores(errors: unknown): string[] | null {
  if (!esObjeto(errors)) return null;
  const mensajes = Object.values(errors).flatMap((valor) =>
    Array.isArray(valor) ? valor.filter((m): m is string => typeof m === 'string') : [],
  );
  return mensajes.length > 0 ? mensajes : null;
}

/**
 * Arma el query string descartando lo vacío.
 *
 * `encodeURIComponent` sobre cada valor: la búsqueda del hero manda texto libre
 * y un "volvo fh 6x4" sin codificar rompe la URL, tal como avisa la
 * documentación.
 */
function armarQuery(query?: Record<string, string | number | undefined>): string {
  if (!query) return '';
  const partes = Object.entries(query)
    .filter(([, valor]) => valor !== undefined && valor !== '')
    .map(([clave, valor]) => `${clave}=${encodeURIComponent(String(valor))}`);
  return partes.length > 0 ? `?${partes.join('&')}` : '';
}

function parsearOIndefinido(texto: string): unknown {
  if (texto.trim() === '') return undefined;
  try {
    return JSON.parse(texto);
  } catch {
    return undefined;
  }
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function mensajeDe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Exige que la respuesta sea una colección.
 *
 * Esta API devuelve los listados como ARRAY PELADO —sin `{ data: ... }`—,
 * verificado contra la respuesta real de `/vehiculos`, `/agencias`, `/banners`,
 * `/categorias` y `/vehiculos/{id}/imagenes`. El `{ data: ... }` igual se
 * acepta por si alguno de los 63 endpoints usa un API Resource.
 *
 * Lo que NO hace: adivinar. Si el cuerpo no es ninguna de las dos formas, tira
 * `formato` en vez de devolver `[]`. Un array vacío acá se vería en pantalla
 * como "no hay unidades en stock" —una afirmación falsa y perfectamente
 * creíble— y nadie se enteraría de que la integración está rota.
 */
export function exigirColeccion(cuerpo: unknown): unknown[] {
  if (Array.isArray(cuerpo)) return cuerpo;
  if (esObjeto(cuerpo) && Array.isArray(cuerpo.data)) return cuerpo.data;
  throw new ErrorDeApi('formato', `Se esperaba una colección y llegó ${describir(cuerpo)}.`);
}

/** Describe lo que llegó para que el mensaje de error sirva de algo. */
function describir(valor: unknown): string {
  if (valor === null) return 'null';
  if (valor === undefined) return 'un cuerpo vacío';
  if (Array.isArray(valor)) return 'un array';
  if (typeof valor !== 'object') return `un ${typeof valor}`;
  const claves = Object.keys(valor);
  if (claves.length === 0) return 'un objeto vacío';
  return `un objeto con las claves: ${claves.slice(0, 8).join(', ')}`;
}
