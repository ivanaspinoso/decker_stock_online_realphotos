import { pedir } from '@/lib/rutasur/cliente';
import { credenciales } from '@/lib/rutasur/config';
import { ErrorDeApi } from '@/lib/rutasur/errores';

/**
 * Obtención de la API key. SÓLO SERVIDOR.
 *
 * ESTADO: PREPARADO, NO ENCHUFADO. Todavía no tenemos las credenciales, y todo
 * lo que el sitio usa hoy —catálogo, agencias, banners, envío de leads— es
 * público y no necesita key. Este módulo existe para que el día que Eduardo
 * mande usuario y contraseña, enchufarlo sea completar dos variables de entorno
 * y llamar a `asegurarClave()` desde donde haga falta.
 *
 * QUÉ REQUIERE KEY HOY: `/precios` (verificado: contesta 403 "Token Inválido"
 * sin ella) y los endpoints de escritura que todavía no están documentados.
 *
 * POR QUÉ NO SE LLAMA A `PUT /key` EN CADA PEDIDO
 *
 * Porque sería una llamada de más por cada request y, en una API que corta las
 * conexiones cuando se le piden muchas cosas seguidas, duplicar el tráfico es
 * la forma más rápida de quedarse afuera. La key se guarda y se reusa.
 *
 * DÓNDE SE GUARDA
 *
 * Preferentemente en `RUTASUR_API_KEY`, generada una vez a mano y puesta en el
 * entorno del deploy: es lo más simple y no hay nada que se pueda filtrar por
 * un bug de caché. El `cacheEnMemoria` de abajo es el respaldo para el caso en
 * que la key tenga vencimiento y haya que renovarla sola.
 *
 * NUNCA en `localStorage`, en una cookie legible por el navegador, ni en una
 * variable con prefijo `NEXT_PUBLIC_`.
 */
if (typeof window !== 'undefined') {
  throw new Error(
    'lib/rutasur/clave.ts se importó desde el navegador. Este módulo pide y ' +
      'guarda la API key: no puede entrar en el bundle del cliente.',
  );
}

/**
 * La key obtenida al vuelo, viva mientras viva el proceso de Node.
 *
 * Es memoria de proceso a propósito y tiene una limitación conocida: en un
 * hosting con varias instancias, cada una pide la suya. Con una key por
 * instancia y no por request eso es aceptable. Si alguna vez molesta, el lugar
 * donde cambiarlo por un storage compartido (Redis, KV) es esta variable y la
 * función de abajo; nada más del proyecto se entera.
 */
interface CacheDeClave {
  clave: string;
  vence: number;
}

/**
 * La caché vive en `globalThis` Y NO EN UNA VARIABLE DEL MÓDULO.
 *
 * Next empaqueta cada ruta por separado, así que `/`, `/catalogo` y
 * `/api/unidades` cargan su PROPIA copia de este archivo. Una variable de
 * módulo se duplica con ellas: cada ruta guardaría su key por su cuenta y
 * pediría la suya.
 *
 * Eso rompió los precios de la forma más confusa posible. La primera ruta
 * sacaba su key y cargaba los 2.155 precios bien; la segunda y la tercera
 * pedían otra, y a la tercera `PUT /key` contestaba 429 —la documentación avisa
 * que la creación de claves tiene límite por minuto—. En el log se veía una
 * línea de éxito seguida de dos de "demasiados pedidos", y en el sitio, cero
 * precios.
 *
 * `globalThis` es uno solo por proceso de Node, así que las tres rutas comparten
 * la misma key y se pide una sola vez.
 */
const CLAVE = Symbol.for('decker.rutasur.clave');
type Global = typeof globalThis & { [CLAVE]?: CacheDeClave | null };

function leerCache(): CacheDeClave | null {
  return (globalThis as Global)[CLAVE] ?? null;
}

function guardarCache(valor: CacheDeClave | null): void {
  (globalThis as Global)[CLAVE] = valor;
}

/** Margen antes del vencimiento, para no usar una key que expira en el camino. */
const MARGEN_MS = 60_000;

/**
 * Devuelve una key usable: la del entorno, la cacheada, o una nueva.
 *
 * Hoy no la llama nadie porque no hay endpoints protegidos en uso. Es el punto
 * de extensión, no código muerto por descuido.
 */
export async function asegurarClave(): Promise<string> {
  const delEntorno = process.env.RUTASUR_API_KEY?.trim();
  if (delEntorno) return delEntorno;

  const guardada = leerCache();
  if (guardada && guardada.vence - MARGEN_MS > Date.now()) return guardada.clave;

  return generarClave();
}

/**
 * Invalida la key guardada para que el próximo pedido saque una nueva.
 *
 * ES LO QUE PIDE LA CHECKLIST DE LA DOCUMENTACIÓN: "manejar expiración y
 * suspensión del token". Una key puede vencer sola, o alguien puede suspenderla
 * desde `POST /key/suspend`. En los dos casos el endpoint protegido contesta
 * 403 y la key que tenemos en memoria queda muerta: sin esto seguiríamos
 * mandándola en cada pedido hasta que el proceso se reinicie, acumulando 403
 * contra un server que bloquea por volumen.
 *
 * Lo llama `traerPrecios` al recibir un 403, y reintenta UNA sola vez. Una sola
 * porque si la key nueva también da 403, el problema no es el token —es que las
 * credenciales ya no sirven— y seguir pidiendo sólo acelera el bloqueo.
 *
 * No hace nada cuando la key viene de `RUTASUR_API_KEY`: esa no se genera al
 * vuelo, se cambia en el entorno. El reintento la volvería a leer idéntica.
 */
export function olvidarClave(): void {
  guardarCache(null);
}

/**
 * `PUT /key` con usuario y contraseña. Devuelve la key y la cachea.
 *
 * La respuesta está documentada y es:
 *
 *   HTTP 201 {"status":1,"token":"api-key-generada","user":{"user_id":123}}
 *
 * O sea que el campo es `token`. Igual se siguen aceptando `key`, `api_key` y
 * `data` como alternativas: el endpoint nunca se pudo ejecutar de verdad —no
 * tenemos credenciales— así que lo documentado todavía no está confirmado
 * contra la API. Si no aparece ninguno, falla nombrando las claves que sí
 * llegaron, para que el primero que lo pruebe vea en el log qué contestó.
 */
async function generarClave(): Promise<string> {
  const datos = credenciales();
  if (!datos) {
    throw new ErrorDeApi(
      'configuracion',
      'No hay API key ni credenciales. Completar RUTASUR_API_KEY, o bien ' +
        'RUTASUR_API_USER y RUTASUR_API_PASSWORD, en .env.local.',
    );
  }

  // LAS CREDENCIALES VAN POR CABECERA Y EL CUERPO VA VACÍO.
  //
  // La documentación es explícita: "PUT /key no lleva payload JSON. Las
  // credenciales se envían como encabezados". Acá se mandaba también un cuerpo
  // con `user`/`password`, de cuando no sabíamos cuál de los dos transportes
  // leía; ya no hace falta y mandar la contraseña dos veces es una copia de más
  // de un secreto, que es exactamente lo que no conviene multiplicar.
  //
  // OJO CON EL 500. Con un usuario que no existe, `PUT /key` contesta
  // `500 {"error":"Could not save the key. User inexistent."}`, no un 401. Si
  // esto falla, el estado HTTP no distingue "credenciales mal" de "se cayó el
  // servidor": hay que leer el texto del error.
  const cuerpo = await pedir('/key', {
    metodo: 'PUT',
    cabecerasExtra: { user: datos.usuario, pass: datos.clave },
    revalidar: 0,
  });

  const objeto = (typeof cuerpo === 'object' && cuerpo !== null ? cuerpo : {}) as Record<
    string,
    unknown
  >;
  const posible = [objeto.token, objeto.key, objeto.api_key, objeto.data].find(
    (valor): valor is string => typeof valor === 'string' && valor.trim() !== '',
  );

  if (!posible) {
    throw new ErrorDeApi(
      'formato',
      `PUT /key contestó sin una key reconocible. Claves recibidas: ` +
        `${Object.keys(objeto).join(', ') || '(ninguna)'}. Ajustar lib/rutasur/clave.ts.`,
    );
  }

  // Sin dato de vencimiento, una hora es una apuesta conservadora: si la key
  // durase más, lo único que pasa es que se regenera de más una vez por hora.
  const vence = Date.now() + 60 * 60 * 1000;
  guardarCache({ clave: posible.trim(), vence });
  return posible.trim();
}
