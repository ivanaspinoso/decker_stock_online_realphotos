import { asegurarClave, olvidarClave } from '@/lib/rutasur/clave';
import { pedir } from '@/lib/rutasur/cliente';
import { hayClave, SEGUNDOS_DE_REVALIDACION } from '@/lib/rutasur/config';
import { ErrorDeApi } from '@/lib/rutasur/errores';

/**
 * Los precios de las unidades. SÓLO SERVIDOR.
 *
 * `/precios` NO ES LO QUE PARECE, y descubrirlo costó una vuelta entera.
 *
 * La documentación lo lista como "Listas de precios" y era literal: devuelve
 * los DOCUMENTOS de lista de precios que publica Decker, no el precio de cada
 * camión. Las filas traen esto:
 *
 *   price_id · price_name · price_url · price_alta · price_activa
 *
 * Un nombre, un enlace a un archivo, una fecha y si está activa. Ni un importe,
 * ni una referencia a `vehicle_id`. Por ahí no hay forma de saber cuánto sale
 * un Volvo FM 380.
 *
 * DÓNDE ESTARÍAN DE VERDAD
 *
 * En `/vendedores/vehiculos`, que la documentación describe como "Vehículos con
 * acceso autenticado". Es el mismo listado de unidades pero detrás de la key, y
 * lo único que justifica que exista una versión autenticada del catálogo es que
 * traiga algo que la pública no. El precio es el candidato obvio: la pública
 * devuelve 48 campos y ninguno es un importe.
 *
 * Es una deducción, no un hecho: todavía no se pudo ejecutar. Por eso el mapeo
 * busca el importe entre varios nombres posibles y, si no encuentra ninguno,
 * DEJA LAS CLAVES DE LA PRIMERA FILA EN EL LOG. Esa línea fue la que cerró la
 * incógnita de `/precios` y es la que va a cerrar ésta.
 *
 * QUÉ PASA MIENTRAS TANTO
 *
 * Nada se rompe. Sin precios el catálogo muestra "Consultar" —lo que viene
 * haciendo desde el primer día— y esconde solo el filtro y el orden por precio.
 * El día que el mapeo acierte, aparecen y los controles vuelven, sin tocar un
 * componente.
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
 * NO TIRA NUNCA. Ni cuando falta la key, ni cuando la API contesta cualquier
 * cosa. El precio es un dato de más: el catálogo ya sabe vivir sin él y hacer
 * que las 240 unidades desaparezcan porque un endpoint secundario falló sería
 * cambiar una carencia conocida por una caída.
 */
export async function traerPrecios(): Promise<PreciosPorUnidad> {
  if (!hayClave()) return new Map();

  try {
    return mapearPrecios(await pedirVehiculosConPrecio());
  } catch (error) {
    /**
     * UN 403 SE REINTENTA UNA VEZ, CON KEY NUEVA. Cualquier otra cosa, no.
     *
     * 403 acá significa "key ausente, inválida, suspendida o sin nivel
     * suficiente". Si la key la generamos nosotros con `PUT /key`, puede haber
     * vencido o alguien la suspendió: tirarla y pedir otra es exactamente lo
     * que corresponde, y es lo que pide la checklist de la documentación.
     *
     * Una sola vez. Si la nueva también da 403, el problema no es el token
     * —son las credenciales, o el nivel de acceso de la clave— y seguir
     * pidiendo sólo acelera el bloqueo por IP.
     */
    if (error instanceof ErrorDeApi && error.estadoHttp === 403) {
      olvidarClave();
      try {
        return mapearPrecios(await pedirVehiculosConPrecio());
      } catch (segundo) {
        console.error(
          '[rutasur] El listado autenticado sigue dando 403 con una key nueva. ' +
            'Revisar las credenciales y el nivel de acceso de la clave:',
          segundo,
        );
        return new Map();
      }
    }

    console.error('[rutasur] No se pudieron traer los precios:', error);
    return new Map();
  }
}

/**
 * El listado de unidades detrás de la key, que es donde deberían estar los
 * precios.
 *
 * La key se resuelve acá y no con el `requiereClave` del cliente HTTP, porque
 * aquél sólo sabe leer `RUTASUR_API_KEY` del entorno: si lo único que tenemos
 * es usuario y contraseña, falla en vez de ir a buscarla. Y la llamada no puede
 * vivir adentro del cliente porque `clave.ts` lo usa para su propio `PUT /key`:
 * quedarían importándose en círculo.
 */
async function pedirVehiculosConPrecio(): Promise<unknown> {
  const clave = await asegurarClave();
  return pedir('/vendedores/vehiculos', {
    cabecerasExtra: { 'X-API-KEY': clave },
    revalidar: SEGUNDOS_DE_REVALIDACION,
  });
}

/**
 * Los nombres con los que puede venir el importe. Ninguno está documentado.
 *
 * Se prueban en orden y gana el primero que traiga un número. Los `vehicle_*`
 * van primero porque es el prefijo que usa toda esta API para los campos del
 * vehículo —`vehicle_km`, `vehicle_year`, `vehicle_power`— así que si el precio
 * existe, es lo más probable que se llame así.
 */
const CAMPOS_DE_PRECIO_USD = ['vehicle_price_usd', 'price_usd', 'precio_usd', 'usd'] as const;
const CAMPOS_DE_PRECIO_ARS = [
  'vehicle_price',
  'vehicle_precio',
  'price',
  'precio',
  'price_ars',
  'ars',
] as const;

/**
 * Pasa el listado autenticado a un mapa de precios por `vehicle_id`.
 *
 * EL CASO IMPORTANTE ES CUANDO NO ENCUENTRA NADA, y por eso este mapeo tiene
 * casi más log que lógica. Los nombres de los campos no están documentados: la
 * única forma de saberlos es ver una respuesta real, y la única forma de ver
 * una respuesta real cuando la API te bloquea por IP es que quede escrita en el
 * log del deploy.
 *
 * Así se resolvió `/precios` —el log dijo `price_id, price_name, price_url…` y
 * con eso quedó claro que no eran precios de unidades— y así se va a resolver
 * éste.
 *
 * Lo que NO hace es inventar un número. Si no encuentra un importe, la unidad
 * queda sin precio y el sitio muestra "Consultar", que es la verdad.
 */
export function mapearPrecios(crudo: unknown): PreciosPorUnidad {
  const mapa: PreciosPorUnidad = new Map();

  const lista = Array.isArray(crudo)
    ? crudo
    : Array.isArray((crudo as { data?: unknown })?.data)
      ? (crudo as { data: unknown[] }).data
      : null;

  if (!lista) {
    console.error(
      '[rutasur] El listado autenticado no es una lista. Claves recibidas:',
      crudo && typeof crudo === 'object' ? Object.keys(crudo) : typeof crudo,
    );
    return mapa;
  }

  for (const fila of lista) {
    if (!fila || typeof fila !== 'object') continue;
    const f = fila as Record<string, unknown>;

    const id = numero(f.vehicle_id ?? f.vehiculo_id ?? f.id);
    if (id === null) continue;

    const dolares = primerNumero(f, CAMPOS_DE_PRECIO_USD);
    const pesos = primerNumero(f, CAMPOS_DE_PRECIO_ARS);
    if (dolares === null && pesos === null) continue;

    // Un solo importe con la moneda declarada aparte: cuenta como dólares si lo
    // dice, y si no, como pesos.
    const moneda = String(f.currency ?? f.moneda ?? '').toUpperCase();
    if (moneda === 'USD' && dolares === null) {
      mapa.set(id, { pesos: null, dolares: pesos });
      continue;
    }

    mapa.set(id, { pesos, dolares });
  }

  if (mapa.size === 0 && lista.length > 0) {
    console.error(
      `[rutasur] El listado autenticado trajo ${lista.length} filas pero ninguna ` +
        'con precio reconocible. Claves de la primera fila:',
      Object.keys(lista[0] as object),
    );
  } else if (mapa.size > 0) {
    console.info(`[rutasur] ${mapa.size} precios cargados sobre ${lista.length} unidades.`);
  }

  return mapa;
}

/** El primer campo de la lista que traiga un número usable. */
function primerNumero(fila: Record<string, unknown>, campos: readonly string[]): number | null {
  for (const campo of campos) {
    const valor = numero(fila[campo]);
    if (valor !== null) return valor;
  }
  return null;
}

/**
 * Un número usable, o `null`.
 *
 * Descarta el cero además de lo vacío y lo que no es número: en esta API un `0`
 * significa "sin cargar", igual que `vehicle_year: 0` en las unidades que no
 * publican el año. Un camión que sale cero pesos sería peor que uno sin precio.
 */
function numero(valor: unknown): number | null {
  if (typeof valor === 'number') return Number.isFinite(valor) && valor > 0 ? valor : null;
  if (typeof valor !== 'string' || valor.trim() === '') return null;
  const n = Number(valor.replace(/[^\d.,-]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}
