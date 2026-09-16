import { pedir } from '@/lib/rutasur/cliente';
import { hayClave, SEGUNDOS_DE_REVALIDACION } from '@/lib/rutasur/config';

/**
 * Los precios de las unidades. SÓLO SERVIDOR.
 *
 * POR QUÉ EL CATÁLOGO DICE "CONSULTAR" EN LAS 240 UNIDADES
 *
 * Porque el precio NO ESTÁ en ningún endpoint público. Verificado campo por
 * campo: `/vehiculos`, `/vehiculos/{id}` y `/agencias/{id}/vehiculos` devuelven
 * los mismos 48 campos y ninguno es un precio —ni `vehicle_price`, ni `valor`,
 * ni nada parecido—.
 *
 * El precio vive en `GET /precios`, que es protegido: sin `X-API-KEY` contesta
 * `403 {"message":"Token Inválido"}`. Lo mismo `/vendedores/vehiculos` y
 * `/seller/vehiculos`.
 *
 * O sea: no es que el mapeo se olvide de leerlo. No hay nada que leer hasta que
 * tengamos credenciales.
 *
 * QUÉ FALTA, EXACTAMENTE
 *
 * Una de estas dos, de parte de Eduardo:
 *
 *   RUTASUR_API_KEY=<token ya generado>
 *
 * o, si prefiere que la generemos nosotros:
 *
 *   RUTASUR_API_USER=<usuario>
 *   RUTASUR_API_PASSWORD=<contraseña>
 *
 * Con cualquiera de las dos, `lib/rutasur/clave.ts` resuelve el token y esta
 * función empieza a devolver precios sin tocar nada más.
 *
 * LO ÚNICO QUE QUEDA A CONFIRMAR ES LA FORMA DE LA RESPUESTA
 *
 * La documentación dice "listas de precios" y no muestra un ejemplo, así que no
 * se puede saber de antemano si viene un array plano, un objeto indexado por id
 * o una lista por categoría. Adivinarlo sería escribir tres mapeos y que ande
 * ninguno.
 *
 * Por eso `mapearPrecios` cubre las dos formas más probables y, la primera vez
 * que la respuesta no encaje, deja las claves en el log. Con esa línea el mapeo
 * se termina en un minuto.
 */
if (typeof window !== 'undefined') {
  throw new Error(
    'lib/rutasur/precios.ts se importó desde el navegador. Este módulo usa la ' +
      'API key: no puede entrar en el bundle del cliente.',
  );
}

/** Precio de una unidad, por `vehicle_id`. */
export type PreciosPorUnidad = Map<number, { pesos: number | null; dolares: number | null }>;

/**
 * Trae los precios, o un mapa vacío si todavía no hay con qué pedirlos.
 *
 * NO TIRA CUANDO FALTA LA KEY, y esa es la decisión importante: hoy no la
 * tenemos, y hacer que el catálogo entero explote por un dato que el sitio ya
 * sabe mostrar como "Consultar" sería cambiar una carencia conocida por una
 * caída. Cuando la key esté, esto se enciende solo.
 */
export async function traerPrecios(): Promise<PreciosPorUnidad> {
  if (!hayClave()) return new Map();

  try {
    const crudo = await pedir('/precios', {
      requiereClave: true,
      revalidar: SEGUNDOS_DE_REVALIDACION,
    });
    return mapearPrecios(crudo);
  } catch (error) {
    // Un 403 acá significa que la key venció o la suspendieron. El catálogo
    // sigue saliendo con "Consultar", que es el estado que ya sabe mostrar.
    console.error('[rutasur] No se pudieron traer los precios:', error);
    return new Map();
  }
}

/**
 * Pasa la respuesta de `/precios` a un mapa por `vehicle_id`.
 *
 * Cubre las dos formas que puede tener una "lista de precios" en esta API,
 * porque las dos aparecen en otros endpoints suyos:
 *
 *   [{ vehicle_id: 3455, price: 85000, currency: "USD" }, …]
 *   { data: [ … lo mismo … ] }
 *
 * Los nombres de los campos se buscan entre varios alias por el mismo motivo
 * por el que existe este comentario: no están documentados. Lo que NO se hace
 * es inventar un precio —si no se encuentra un número, la unidad queda en
 * `null` y el sitio muestra "Consultar", que es la verdad—.
 */
export function mapearPrecios(crudo: unknown): PreciosPorUnidad {
  const mapa: PreciosPorUnidad = new Map();

  const lista = Array.isArray(crudo)
    ? crudo
    : Array.isArray((crudo as { data?: unknown })?.data)
      ? ((crudo as { data: unknown[] }).data)
      : null;

  if (!lista) {
    console.error(
      '[rutasur] `/precios` devolvió algo que no es una lista. Claves recibidas:',
      crudo && typeof crudo === 'object' ? Object.keys(crudo) : typeof crudo,
    );
    return mapa;
  }

  for (const fila of lista) {
    if (!fila || typeof fila !== 'object') continue;
    const f = fila as Record<string, unknown>;

    const id = numero(f.vehicle_id ?? f.vehiculo_id ?? f.id);
    if (id === null) continue;

    const dolares = numero(f.price_usd ?? f.precio_usd ?? f.usd);
    const pesos = numero(f.price ?? f.precio ?? f.price_ars ?? f.ars);

    // La moneda puede venir declarada en vez de separada en dos campos.
    const moneda = String(f.currency ?? f.moneda ?? '').toUpperCase();
    if (moneda === 'USD' && dolares === null && pesos !== null) {
      mapa.set(id, { pesos: null, dolares: pesos });
      continue;
    }

    mapa.set(id, { pesos, dolares });
  }

  if (mapa.size === 0 && lista.length > 0) {
    console.error(
      '[rutasur] `/precios` trajo filas pero no se reconoció ningún campo. ' +
        'Claves de la primera fila:',
      Object.keys(lista[0] as object),
    );
  }

  return mapa;
}

/** Un número usable, o `null`. Descarta cadenas vacías, textos y `0`. */
function numero(valor: unknown): number | null {
  if (typeof valor === 'number') return Number.isFinite(valor) && valor > 0 ? valor : null;
  if (typeof valor !== 'string' || valor.trim() === '') return null;
  const n = Number(valor.replace(/[^\d.,-]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}
