import { asegurarClave, olvidarClave } from '@/lib/rutasur/clave';
import { pedir } from '@/lib/rutasur/cliente';
import { hayClave, SEGUNDOS_DE_REVALIDACION } from '@/lib/rutasur/config';
import { ErrorDeApi } from '@/lib/rutasur/errores';

/**
 * Los precios de las unidades. SÓLO SERVIDOR.
 *
 * DÓNDE ESTÁN, DESPUÉS DE BUSCARLOS EN DOS LUGARES EQUIVOCADOS
 *
 * No están en `/vehiculos`: sus 48 campos no incluyen ningún importe. Y no
 * están en `/precios`, aunque el nombre lo prometa: eso devuelve los DOCUMENTOS
 * de lista de precios que publica Decker —`price_name`, `price_url` a un Excel
 * o un PDF, `price_alta`—. "Listas de precios" era literal.
 *
 * Están en `/vendedores/vehiculos`, el mismo catálogo detrás de la API key. Son
 * 59 campos en vez de 48: los once de más son `seller_*`, y dos de ellos son
 * los que importan.
 *
 *   seller_price      "90.000"      el importe, como TEXTO
 *   seller_pricetype  "u$s" | "$"   la moneda, en un campo aparte
 *
 * DOS TRAMPAS QUE HAY QUE MIRAR DE CERCA
 *
 * El importe viene en formato argentino, donde **el punto separa miles**. Un
 * `Number("90.000")` devuelve 90 —noventa dólares por un Volvo— y
 * `Number("38.000.000")` devuelve `NaN`. Hay que sacar los puntos antes de
 * convertir; de eso se encarga `parsearImporte`.
 *
 * Y la moneda viaja en su propio campo, así que un importe sin `seller_pricetype`
 * no se puede interpretar: los mismos "23.000" son un camión en dólares o una
 * batea en pesos, y errarle es un factor de mil quinientos. Ver `monedaDe`.
 */
if (typeof window !== 'undefined') {
  throw new Error(
    'lib/rutasur/precios.ts se importó desde el navegador. Este módulo usa la ' +
      'API key: no puede entrar en el bundle del cliente.',
  );
}

/**
 * El precio en dólares más alto que se considera creíble.
 *
 * Sirve para detectar importes cargados en pesos pero etiquetados en dólares,
 * que existen en los datos reales. Ver el comentario en `mapearPrecios`.
 */
const TOPE_RAZONABLE_USD = 1_000_000;

/** Precio de una unidad, por `vehicle_id`. */
export type PreciosPorUnidad = Map<number, { pesos: number | null; dolares: number | null }>;

/**
 * El mapa ya armado, guardado en memoria del proceso.
 *
 * HACE FALTA PORQUE LA RESPUESTA NO ENTRA EN LA CACHÉ DE NEXT. Son 2.608 filas
 * y doce megas y medio; el límite de Next son dos. En el log del deploy se ve
 * así, una vez por página renderizada:
 *
 *     Failed to set Next.js data cache for .../vendedores/vehiculos,
 *     items over 2MB can not be cached (12509655 bytes)
 *
 * Sin esto, cada visita al catálogo se bajaría doce megas de nuevo contra una
 * API que bloquea por IP cuando se le pide de más. El mapa derivado, en cambio,
 * son unos pocos kilobytes: se arma una vez y se reusa.
 *
 * Memoria del proceso, igual que `ultimoStockBueno` en `lib/api.ts`, con la
 * misma limitación: cada instancia del hosting arma el suyo. Para esto alcanza.
 */
interface CacheDePrecios {
  mapa: PreciosPorUnidad;
  cuando: number;
}

/**
 * En `globalThis` por el mismo motivo que la API key: Next empaqueta cada ruta
 * por separado y una variable de módulo se duplicaría con ellas. Acá pesa el
 * doble, porque cada copia se bajaría sus propios nueve megas.
 */
const PRECIOS = Symbol.for('decker.rutasur.precios');
type Global = typeof globalThis & { [PRECIOS]?: CacheDePrecios | null };

const leerCache = (): CacheDePrecios | null => (globalThis as Global)[PRECIOS] ?? null;
const guardarCache = (valor: CacheDePrecios) => {
  (globalThis as Global)[PRECIOS] = valor;
};

/**
 * Trae los precios, o un mapa vacío si todavía no hay con qué pedirlos.
 *
 * NO TIRA NUNCA. Ni cuando falta la key, ni cuando la API contesta cualquier
 * cosa. El precio es un dato de más: el catálogo ya sabe vivir sin él —muestra
 * "Consultar"— y hacer que las 240 unidades desaparezcan porque un endpoint
 * secundario falló sería cambiar una carencia conocida por una caída.
 */
export async function traerPrecios(): Promise<PreciosPorUnidad> {
  if (!hayClave()) return new Map();

  const guardado = leerCache();
  if (guardado && Date.now() - guardado.cuando < SEGUNDOS_DE_REVALIDACION * 1000) {
    return guardado.mapa;
  }

  try {
    const mapa = mapearPrecios(await pedirVehiculosConPrecio());
    // Un mapa vacío no se guarda: sería cachear un fallo y dejar el catálogo
    // sin precios hasta que expire, cuando el próximo intento podría andar.
    if (mapa.size > 0) guardarCache({ mapa, cuando: Date.now() });
    return mapa;
  } catch (error) {
    /**
     * UN 403 SE REINTENTA UNA VEZ, CON KEY NUEVA. Cualquier otra cosa, no.
     *
     * 403 acá significa "key ausente, inválida, suspendida o sin nivel
     * suficiente". Si la generamos nosotros con `PUT /key`, puede haber vencido
     * o alguien la suspendió: tirarla y pedir otra es lo que corresponde, y es
     * lo que pide la checklist de la documentación.
     *
     * Una sola vez. Si la nueva también da 403, el problema no es el token
     * —son las credenciales, o el nivel de la clave— y seguir pidiendo sólo
     * acelera el bloqueo por IP.
     */
    if (error instanceof ErrorDeApi && error.estadoHttp === 403) {
      olvidarClave();
      try {
        const mapa = mapearPrecios(await pedirVehiculosConPrecio());
        if (mapa.size > 0) guardarCache({ mapa, cuando: Date.now() });
        return mapa;
      } catch (segundo) {
        console.error(
          '[rutasur] El listado autenticado sigue dando 403 con una key nueva. ' +
            'Revisar las credenciales y el nivel de acceso de la clave:',
          segundo,
        );
        return leerCache()?.mapa ?? new Map();
      }
    }

    console.error('[rutasur] No se pudieron traer los precios:', error);
    // Si hay un mapa viejo se sirve ése: precios de hace un rato son mejores
    // que ninguno, y el catálogo no cambia de precio cada cinco minutos.
    return leerCache()?.mapa ?? new Map();
  }
}

/**
 * El catálogo detrás de la key, que es donde viven los precios.
 *
 * Se piden TODOS de una y no paginado, aunque sean doce megas. `offset` y
 * `limit` funcionan, pero el `limit` se topea en 100 —igual que en el endpoint
 * público— así que traer las 2.608 filas serían veintisiete pedidos seguidos
 * contra una API que bloquea por IP con muchos menos que eso. Un pedido grande
 * es más barato que veintisiete chicos.
 *
 * La key se resuelve acá y no con el `requiereClave` del cliente HTTP, porque
 * aquél sólo lee `RUTASUR_API_KEY` del entorno: si lo único que hay es usuario
 * y contraseña, falla en vez de ir a buscarla. Y no puede vivir adentro del
 * cliente porque `clave.ts` lo usa para su propio `PUT /key`: quedarían
 * importándose en círculo.
 */
async function pedirVehiculosConPrecio(): Promise<unknown> {
  const clave = await asegurarClave();
  return pedir('/vendedores/vehiculos', {
    cabecerasExtra: { 'X-API-KEY': clave },
    revalidar: SEGUNDOS_DE_REVALIDACION,
  });
}

/**
 * Pasa el listado autenticado a un mapa de precios por `vehicle_id`.
 *
 * Una unidad entra al mapa sólo si tiene importe Y moneda. Lo que no cumple se
 * saltea y el sitio muestra "Consultar", que es la verdad: de las cien primeras
 * unidades, setenta y dos traen precio, una dice "LISTA" y una tiene importe
 * sin moneda.
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

  let sinMoneda = 0;
  let sinImporte = 0;
  let fueraDeEscala = 0;

  for (const fila of lista) {
    if (!fila || typeof fila !== 'object') continue;
    const f = fila as Record<string, unknown>;

    const id = Number(f.vehicle_id);
    if (!Number.isFinite(id) || id <= 0) continue;

    const importe = parsearImporte(f.seller_price);
    if (importe === null) {
      if (String(f.seller_price ?? '').trim() !== '') sinImporte += 1;
      continue;
    }

    const moneda = monedaDe(f.seller_pricetype);
    if (moneda === null) {
      sinMoneda += 1;
      continue;
    }

    /**
     * UN IMPORTE EN DÓLARES FUERA DE ESCALA NO SE MUESTRA.
     *
     * Apareció uno real: un tanque a "US$ 25.000.000". La mediana de los
     * precios en pesos del catálogo es exactamente 25.000.000, así que el
     * importe está bien y lo que está mal es la etiqueta de moneda —lo cargaron
     * en pesos y quedó marcado `u$s`—.
     *
     * No se corrige solo. Convertirlo a pesos sería adivinar, y adivinar un
     * precio es peor que no mostrarlo: si por algún motivo ese tanque sí valiera
     * esa cifra, la estaríamos dividiendo por mil quinientos. Se descarta y la
     * unidad queda en "Consultar", igual que las que vienen sin moneda.
     *
     * El tope es un millón de dólares. La unidad más cara del catálogo real
     * ronda los 220.000, así que deja pasar holgadamente cualquier precio
     * legítimo y sólo atrapa lo que es obviamente un error de carga.
     */
    if (moneda === 'USD' && importe > TOPE_RAZONABLE_USD) {
      fueraDeEscala += 1;
      continue;
    }

    mapa.set(
      id,
      moneda === 'USD' ? { pesos: null, dolares: importe } : { pesos: importe, dolares: null },
    );
  }

  if (mapa.size === 0 && lista.length > 0) {
    console.error(
      `[rutasur] El listado autenticado trajo ${lista.length} filas y ninguna con ` +
        'precio usable. Claves de la primera fila:',
      Object.keys(lista[0] as object),
    );
  } else {
    console.info(
      `[rutasur] ${mapa.size} precios de ${lista.length} unidades` +
        (sinMoneda ? ` · ${sinMoneda} sin moneda` : '') +
        (sinImporte ? ` · ${sinImporte} con importe no numérico` : '') +
        (fueraDeEscala ? ` · ${fueraDeEscala} con moneda dudosa` : ''),
    );
  }

  return mapa;
}

/**
 * Convierte `seller_price` a un número, o `null`.
 *
 * EL PUNTO SEPARA MILES. Es formato argentino: `"90.000"` son noventa mil y
 * `"38.000.000"` treinta y ocho millones. Un `Number()` directo devuelve `90` y
 * `NaN` respectivamente —noventa dólares por un Volvo—, así que los puntos se
 * sacan antes de convertir y la coma, si aparece, es la decimal.
 *
 * No todo lo que viene es un número: hay unidades cargadas con `"LISTA"`, que
 * significa "está en la lista de precios" y no un importe. Esas devuelven
 * `null` y quedan en "Consultar", que es exactamente lo que quieren decir.
 */
function parsearImporte(valor: unknown): number | null {
  if (typeof valor === 'number') return Number.isFinite(valor) && valor > 0 ? valor : null;
  if (typeof valor !== 'string') return null;

  const limpio = valor.replace(/[\s$u·]/gi, '').trim();
  if (limpio === '') return null;
  // Sólo dígitos, puntos y comas: "LISTA", "a convenir" y compañía se van acá.
  if (!/^[\d.,]+$/.test(limpio)) return null;

  const numero = Number(limpio.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

/**
 * La moneda de `seller_pricetype`, o `null` si no se puede saber.
 *
 * `null` ES UNA RESPUESTA CORRECTA Y SE USA. Un importe sin moneda declarada es
 * ambiguo: los mismos "23.000" son un camión en dólares o un acoplado en pesos,
 * y mostrar uno por el otro es errarle por mil quinientas veces. Antes que
 * arriesgar un número que puede estar catastróficamente mal, la unidad queda en
 * "Consultar" y el asesor lo dice por WhatsApp.
 */
function monedaDe(valor: unknown): 'USD' | 'ARS' | null {
  const tipo = String(valor ?? '')
    .trim()
    .toLowerCase();
  if (tipo === '') return null;
  if (tipo.includes('u')) return 'USD'; // "u$s", "usd", "US$"
  if (tipo.includes('$')) return 'ARS';
  return null;
}
