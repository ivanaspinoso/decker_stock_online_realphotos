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
let cacheEnMemoria: { clave: string; vence: number } | null = null;

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

  if (cacheEnMemoria && cacheEnMemoria.vence - MARGEN_MS > Date.now()) {
    return cacheEnMemoria.clave;
  }

  return generarClave();
}

/**
 * Invalida la key guardada para que el próximo pedido saque una nueva.
 *
 * ACÁ ENTRA EL 403. Cuando un endpoint protegido contesta 403, el cliente tira
 * un `ErrorDeApi` de causa `configuracion`; quien lo atrape llama a esto y
 * reintenta UNA vez. No está cableado todavía porque sin credenciales reales no
 * hay forma de probar que el reintento funcione, y un reintento no probado
 * contra una API que bloquea por volumen es peor que no tenerlo.
 *
 * Lo que sí está garantizado hoy: un 403 no pasa en silencio. Llega como
 * `configuracion` —que no se reintenta— y queda en el log del servidor
 * nombrando la key.
 */
export function olvidarClave(): void {
  cacheEnMemoria = null;
}

/**
 * `PUT /key` con usuario y contraseña. Devuelve la key y la cachea.
 *
 * El nombre del campo de la respuesta es una SUPOSICIÓN: no pudimos probar este
 * endpoint porque no tenemos credenciales. Por eso se aceptan varios nombres
 * posibles y, si no aparece ninguno, falla nombrando las claves que sí llegaron
 * —así el primero que lo pruebe ve en el log exactamente qué contestó la API—.
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

  // POR CABECERA Y POR CUERPO, LAS DOS.
  //
  // La documentación de Eduardo dice cabeceras (`user:` y `pass:`). Probado
  // contra la API real, los dos transportes llegan igual: con credenciales
  // inexistentes contesta lo mismo de las dos formas. Se mandan ambas porque no
  // hay manera de saber cuál lee de verdad hasta tener credenciales válidas, y
  // mandar de más no cuesta nada.
  //
  // OJO CON EL 500. Con un usuario que no existe, `PUT /key` contesta
  // `500 {"error":"Could not save the key. User inexistent."}`, no un 401. Si
  // esto falla, el estado HTTP no distingue "credenciales mal" de "se cayó el
  // servidor": hay que leer el texto del error.
  const cuerpo = await pedir('/key', {
    metodo: 'PUT',
    cabecerasExtra: { user: datos.usuario, pass: datos.clave },
    cuerpo: { user: datos.usuario, password: datos.clave, pass: datos.clave },
    revalidar: 0,
  });

  const objeto = (typeof cuerpo === 'object' && cuerpo !== null ? cuerpo : {}) as Record<
    string,
    unknown
  >;
  const posible = [objeto.key, objeto.api_key, objeto.token, objeto.data].find(
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
  cacheEnMemoria = { clave: posible.trim(), vence };
  return cacheEnMemoria.clave;
}
