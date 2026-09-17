import { cache } from 'react';
import { PARAMETROS_FINANCIACION } from '@/lib/data/financiacion';

/**
 * El dólar oficial venta, en vivo.
 *
 * Antes era un número escrito a mano en `lib/data/financiacion.ts` que alguien
 * tenía que acordarse de actualizar. Cuando no se acordaba, la calculadora
 * seguía cotizando con el dólar de hace tres semanas sin avisarle a nadie —y un
 * número viejo se ve exactamente igual que uno bueno—.
 *
 * SÓLO CORRE EN EL SERVIDOR. No por secreto —la API es pública y sin clave—
 * sino porque el cacheo es lo que evita salir a la red una vez por visitante, y
 * eso sólo existe del lado del servidor. Un componente cliente que quiera este
 * dato lo recibe por props desde la página, ya resuelto.
 *
 * POR QUÉ EL ENDPOINT DE BANCO NACIÓN Y NO EL "OFICIAL"
 *
 * `/ambito/dolares/oficial` es un PROMEDIO entre varias casas de cambio.
 * Decker mira Banco Nación, así que el promedio puede no coincidir con lo que
 * ellos tienen a la vista, y una calculadora que no coincide con lo que el
 * vendedor ve en su pantalla es una calculadora en la que no se confía.
 * Medido el 17/9: el promedio daba 1.531,56 y BNA daba 1.535.
 *
 * Verificado contra una segunda fuente el mismo día —la API de bancos de
 * CriptoYa, que lee de otro lado— con el mismo resultado: BNA 1.485 / 1.535.
 */
if (typeof window !== 'undefined') {
  throw new Error(
    'lib/dolar.ts se importó desde el navegador. Este módulo sale a la red y ' +
      'depende del cacheo del servidor: en el cliente pediría la cotización ' +
      'una vez por visitante. La cotización baja por props desde la página.',
  );
}

/** Banco Nación dentro de "Dólares Ámbito". Ver el encabezado. */
const URL_BNA = 'https://dolarapi.com/v1/ambito/dolares/bna';

/**
 * Cada cuánto se vuelve a pedir, en segundos. Una hora.
 *
 * El dólar oficial no se mueve varias veces por hora: el BNA publica su pizarra
 * a la mañana y la ajusta a lo sumo un par de veces en el día. Una hora deja la
 * calculadora razonablemente al día y son 24 llamadas diarias a un servicio
 * gratuito de terceros, que es un uso que no le molesta a nadie.
 *
 * Es también la ventana de la que sale el respaldo: mientras el valor está en
 * la caché de Next, un corte de DolarAPI no se nota.
 */
const SEGUNDOS_DE_REVALIDACION = 60 * 60;

/**
 * Cuánto esperamos antes de cortar, en milisegundos.
 *
 * Corto a propósito, al revés que los veinte segundos de Ruta Sur. Allá el
 * timeout largo distingue "no existe" de "tarda" y no hay con qué reemplazar el
 * dato. Acá hay respaldo inmediato y esto bloquea el render de la home: es
 * preferible cotizar con el valor de hace una hora que dejar a alguien mirando
 * un blanco.
 */
const MS_DE_ESPERA = 4_000;

/**
 * Último valor bueno que vio ESTE proceso.
 *
 * Es la segunda línea de respaldo, detrás de la caché de Next. Cubre el caso en
 * que la caché ya venció y justo en ese momento DolarAPI no contesta: en vez de
 * caer al número de respaldo escrito a mano, se sigue usando el último real,
 * aunque tenga horas.
 *
 * Es memoria del proceso y se pierde en cada deploy. Alcanza: en un hosting con
 * varias instancias cada una lleva la suya, y la de respaldo escrita a mano
 * está abajo para cuando no hay ninguna.
 */
let ultimoValido: { venta: number; fechaActualizacion: string | null } | null = null;

/** De dónde salió el número que se está usando. Lo mira el log, no la pantalla. */
export type OrigenCotizacion = 'api' | 'memoria' | 'respaldo';

export interface DolarOficial {
  /** Pesos por dólar, oficial venta. SIN el margen de Decker. */
  venta: number;
  origen: OrigenCotizacion;
  /** Cuándo lo publicó la fuente. `null` si el valor no vino de la API. */
  fechaActualizacion: string | null;
}

/**
 * El valor de respaldo escrito a mano, última línea de defensa.
 *
 * Se lee de `DOLAR_OFICIAL_VENTA_RESPALDO` para poder corregirlo sin un deploy
 * de código —si DolarAPI se cae una semana, se actualiza la variable en Vercel
 * y listo—, y si la variable no está, cae a la constante del repo.
 *
 * Nunca devuelve 0 ni NaN: mostrar "$ 0" o romper el cálculo por una API de
 * terceros sería el peor de los finales posibles para esto.
 */
function respaldo(): number {
  const delEntorno = Number(process.env.DOLAR_OFICIAL_VENTA_RESPALDO?.trim());
  if (Number.isFinite(delEntorno) && delEntorno > 0) return delEntorno;
  return PARAMETROS_FINANCIACION.dolarOficialVenta;
}

/**
 * Si el número que contestó la API es creíble.
 *
 * La banda se mide contra el respaldo y no contra límites absolutos, así que se
 * mueve sola con la inflación: un tope fijo escrito hoy sería el próximo número
 * viejo que nadie actualiza.
 *
 * Es ancha —de un cuarto al cuádruple— porque no está para detectar que el
 * dólar subió, que es justamente lo que queremos que pase. Está para atajar las
 * fallas que un `Number()` no atrapa: un 0, un valor en centavos, un campo que
 * cambió de nombre y llega `undefined`.
 */
function esCreible(venta: unknown): venta is number {
  if (typeof venta !== 'number' || !Number.isFinite(venta) || venta <= 0) return false;
  const referencia = respaldo();
  return venta >= referencia / 4 && venta <= referencia * 4;
}

/**
 * Deja constancia de cada vez que NO se usó el valor en vivo.
 *
 * Existe para poder contestar "¿DolarAPI está fallando seguido?" mirando el log
 * en vez de adivinando. Si esto aparece todos los días, hay que cambiar de
 * fuente; si aparece una vez por mes, es el servicio gratuito haciendo lo que
 * hace un servicio gratuito.
 */
function avisarFallback(origen: OrigenCotizacion, venta: number, motivo: string) {
  console.warn(
    `[dolar] DolarAPI no sirvió (${motivo}). Uso el ${
      origen === 'memoria' ? 'último valor en memoria' : 'valor de respaldo'
    }: ${venta}. Fuente: ${URL_BNA}`,
  );
}

/**
 * El dólar oficial venta de Banco Nación. Nunca tira y nunca devuelve 0.
 *
 * Tres respaldos, en orden: el último valor que vio este proceso, la variable
 * `DOLAR_OFICIAL_VENTA_RESPALDO`, y la constante del repo. Cada vez que se cae
 * a alguno queda avisado en el log del servidor.
 *
 * El `cache()` de React es por pedido: la home pide los parámetros una vez y la
 * ficha otra, y sin esto serían dos lecturas para el mismo render. El
 * `revalidate` del `fetch` es el que cuida el tráfico real contra DolarAPI.
 */
export const getDolarOficialVenta = cache(async (): Promise<DolarOficial> => {
  const caerAlRespaldo = (motivo: string): DolarOficial => {
    if (ultimoValido) {
      avisarFallback('memoria', ultimoValido.venta, motivo);
      return { ...ultimoValido, origen: 'memoria' };
    }
    const venta = respaldo();
    avisarFallback('respaldo', venta, motivo);
    return { venta, origen: 'respaldo', fechaActualizacion: null };
  };

  try {
    const respuesta = await fetch(URL_BNA, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(MS_DE_ESPERA),
      next: { revalidate: SEGUNDOS_DE_REVALIDACION },
    });

    if (!respuesta.ok) return caerAlRespaldo(`HTTP ${respuesta.status}`);

    const cuerpo = (await respuesta.json()) as { venta?: unknown; fechaActualizacion?: unknown };

    // `venta` y no `compra`: es el precio al que el banco VENDE dólares, que es
    // lo que le cuesta a Decker conseguirlos. Con `compra` la calculadora
    // cotizaría cincuenta pesos por dólar por debajo de la operación real.
    if (!esCreible(cuerpo.venta)) {
      return caerAlRespaldo(`la API contestó un venta no creíble: ${JSON.stringify(cuerpo.venta)}`);
    }

    const fechaActualizacion =
      typeof cuerpo.fechaActualizacion === 'string' ? cuerpo.fechaActualizacion : null;

    ultimoValido = { venta: cuerpo.venta, fechaActualizacion };
    return { venta: cuerpo.venta, origen: 'api', fechaActualizacion };
  } catch (error) {
    const motivo = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return caerAlRespaldo(motivo);
  }
});
