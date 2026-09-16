import type { ResultadoFinanciacion, ResultadoLeasing } from '@/lib/types';

/**
 * Cotización con la que la calculadora pasa de dólares a pesos.
 *
 *   cotizacion = dolarOficialVenta · (1 + margen/100)
 *
 * Las unidades se cargan en USD y toda la simulación se muestra en pesos, así
 * que ésta es la única puerta entre las dos monedas: ningún otro cálculo de
 * este archivo vuelve a tocar el tipo de cambio.
 *
 * El margen es una decisión comercial de Decker, no una constante financiera:
 * vive en `lib/data/financiacion.ts` junto a la tasa y los plazos, y se edita
 * ahí. El dólar oficial tampoco sale de una API todavía — se actualiza a mano
 * en ese mismo archivo.
 */
export function cotizacionConMargen(
  dolarOficialVenta: number,
  margenPorcentaje: number,
): number {
  if (!Number.isFinite(dolarOficialVenta) || dolarOficialVenta <= 0) return 0;
  const margen = Number.isFinite(margenPorcentaje) ? margenPorcentaje : 0;
  return dolarOficialVenta * (1 + margen / 100);
}

/**
 * Tasa efectiva MENSUAL de la financiación estándar, en tanto por uno.
 *
 *   i = tasaAnual/12/100 + interesMensualAdicional/100
 *
 * La tasa anual entra como NOMINAL —es la convención que ya usaba el sistema
 * francés de este archivo, y la que lee el equipo comercial cuando dice "18%
 * anual"— así que su parte mensual es una simple división por 12. El punto
 * extra por mes se suma a esa parte mensual, no se compone contra ella: "18%
 * anual más 1% por mes" es una suma en la cabeza de quien arma la operación,
 * y componerlo (1,015 × 1,01) agregaría 1,5 puntos básicos que nadie pactó.
 *
 * Con los valores por defecto: 18/12/100 + 1/100 = 0,015 + 0,010 = 0,025.
 * O sea 2,5% mensual, equivalente a una TNA del 30%.
 */
export function tasaMensualEfectiva(
  tasaAnual: number,
  interesMensualAdicional: number,
): number {
  const anual = Number.isFinite(tasaAnual) && tasaAnual > 0 ? tasaAnual : 0;
  const adicional =
    Number.isFinite(interesMensualAdicional) && interesMensualAdicional > 0
      ? interesMensualAdicional
      : 0;
  return anual / 100 / 12 + adicional / 100;
}

/**
 * MODALIDAD 1 — Financiación estándar.
 *
 * Sistema francés de amortización (cuota fija):
 *
 *   cuota = C · [ i · (1+i)^n ] / [ (1+i)^n − 1 ]
 *
 * donde `C` = capital a financiar EN PESOS, `i` = la tasa mensual efectiva de
 * `tasaMensualEfectiva`, `n` = cantidad de cuotas.
 *
 * Valor y entrega entran en dólares porque así se carga el stock; la conversión
 * ocurre una sola vez, arriba de todo, y de ahí para abajo todo es pesos.
 */
export function calcularFinanciacion(params: {
  valorUsd: number;
  anticipoUsd: number;
  plazo: number;
  tasaAnual: number;
  interesMensualAdicional: number;
  /** Pesos por dólar, YA con el margen aplicado. */
  cotizacion: number;
}): ResultadoFinanciacion | null {
  const { valorUsd, anticipoUsd, plazo, tasaAnual, interesMensualAdicional, cotizacion } =
    params;

  if (!Number.isFinite(valorUsd) || valorUsd <= 0) return null;
  if (!Number.isFinite(plazo) || plazo <= 0) return null;
  if (!Number.isFinite(cotizacion) || cotizacion <= 0) return null;
  if (!Number.isFinite(tasaAnual) || tasaAnual < 0) return null;

  const anticipoUsdValido =
    Number.isFinite(anticipoUsd) && anticipoUsd > 0 ? anticipoUsd : 0;

  const valorPesos = valorUsd * cotizacion;
  const anticipoPesos = anticipoUsdValido * cotizacion;
  const montoAFinanciar = Math.max(valorPesos - anticipoPesos, 0);

  const i = tasaMensualEfectiva(tasaAnual, interesMensualAdicional);

  const base = {
    valorUsd,
    valorPesos,
    cotizacionAplicada: cotizacion,
    anticipoPesos,
    plazo,
    tasaAnual,
    interesMensualAdicional,
    tasaMensual: i * 100,
  };

  if (montoAFinanciar === 0) {
    return {
      ...base,
      montoAFinanciar: 0,
      cuotaMensual: 0,
      totalAPagar: 0,
      costoFinanciero: 0,
    };
  }

  const cuotaMensual =
    i === 0
      ? montoAFinanciar / plazo
      : (montoAFinanciar * (i * Math.pow(1 + i, plazo))) / (Math.pow(1 + i, plazo) - 1);

  const totalAPagar = cuotaMensual * plazo;

  return {
    ...base,
    montoAFinanciar,
    cuotaMensual,
    totalAPagar,
    costoFinanciero: totalAPagar - montoAFinanciar,
  };
}

/**
 * MODALIDAD 2 — Leasing.
 *
 * Nada que ver con el francés de arriba: acá no hay capital que se amortice en
 * cuota fija. El cliente paga un canon durante el plazo que elige y recién al
 * final ejerce la compra con un pago del 30%.
 *
 * LOS DOS IVA, QUE SON DISTINTOS Y NO SE PUEDEN CONFUNDIR
 *
 * Esta operación toca el IVA dos veces, con alícuotas diferentes y en momentos
 * opuestos del cálculo. Es el error más fácil de cometer acá y el más caro:
 *
 * - **10,5% — el IVA del bien.** Los porcentajes 70/30 se calculan sobre el
 *   precio de lista, que viene CON IVA incluido. Para trabajar sobre el valor
 *   neto hay que sacárselo, y sacar un IVA es DIVIDIR por 1,105, no multiplicar
 *   por 0,895. Se hace al principio, sobre los dólares.
 * - **21% — el IVA del alquiler.** El canon es un alquiler y tributa al 21%. Se
 *   suma al FINAL, sobre la cuota ya ajustada, multiplicando por 1,21.
 *
 * Usar la misma constante para los dos, o aplicar el 10,5% como una resta,
 * cambia la cuota en cientos de miles de pesos.
 *
 * EL ORDEN, QUE TAMPOCO ES INTERCAMBIABLE
 *
 *   capitalUsd   = valorUsd · 70% / 1,105          ← 70/30 en USD, después el IVA
 *   finalUsd     = valorUsd · 30% / 1,105
 *   capital$     = capitalUsd · cotizacion          ← una sola conversión
 *   cuotaBase    = capital$/n + capital$ · tasaAnual/12
 *   cuota_k      = cuotaBase · (1 + aumento)^(k−1)
 *   cuota_k final= cuota_k · 1,21                   ← el IVA del alquiler, al final
 *   pagoFinal$   = finalUsd · cotizacion            ← aparte, no va en la última cuota
 *
 * Tres detalles que no se deducen de las fórmulas:
 *
 * - **La cuota 1 no lleva ajuste** (exponente k−1): se paga al arrancar la
 *   operación, no un mes después.
 * - **El interés no se amortiza.** `capital$ · tasaAnual/12` es un monto fijo
 *   que se suma a cada cuota, siempre sobre el capital original. No es el
 *   sistema francés: en leasing el capital no baja porque el bien no es del
 *   cliente hasta que ejerce la compra.
 * - **El canon inicial son 3 cuotas si la unidad es 0 km y 1 si es usada.** Es
 *   una condición comercial de Decker, no algo que se derive del cálculo.
 *
 * CASO DE PRUEBA, VERIFICADO AL PESO
 *
 * US$45.750 · cotización 1.540 · 48 cuotas · 20% anual · 1,25% de aumento:
 * cuota 1 = $2.025.183 y cuota 48 = $3.631.037. Si un cambio en este archivo
 * mueve esos dos números, el cambio está mal. Están en `PRUEBA_LEASING`, al
 * pie, para que no se pierdan.
 */
export function calcularLeasing(params: {
  valorUsd: number;
  plazo: number;
  /** Tasa NOMINAL anual del leasing, en porcentaje. */
  tasaAnual: number;
  /** Cuánto sube la cuota cada mes, en porcentaje. */
  aumentoMensual: number;
  /** Porcentaje del pago final. Fijo por definición comercial. */
  pagoFinalPorcentaje: number;
  /** IVA del bien, en porcentaje. Se DIVIDE por (1 + esto/100). */
  ivaBienPorcentaje: number;
  /** IVA del alquiler, en porcentaje. Se multiplica al final. */
  ivaAlquilerPorcentaje: number;
  /** Pesos por dólar, ya con el margen aplicado. */
  cotizacion: number;
  /** 0 km paga 3 cuotas de canon inicial; usada, 1. */
  esCeroKm: boolean;
}): ResultadoLeasing | null {
  const {
    valorUsd,
    plazo,
    tasaAnual,
    aumentoMensual,
    pagoFinalPorcentaje,
    ivaBienPorcentaje,
    ivaAlquilerPorcentaje,
    cotizacion,
    esCeroKm,
  } = params;

  if (!Number.isFinite(valorUsd) || valorUsd <= 0) return null;
  if (!Number.isFinite(plazo) || plazo <= 0) return null;
  if (!Number.isFinite(cotizacion) || cotizacion <= 0) return null;
  if (!Number.isFinite(pagoFinalPorcentaje) || pagoFinalPorcentaje < 0) return null;
  if (pagoFinalPorcentaje >= 100) return null;

  const tasa = Number.isFinite(tasaAnual) && tasaAnual > 0 ? tasaAnual : 0;
  const aumento =
    Number.isFinite(aumentoMensual) && aumentoMensual > 0 ? aumentoMensual / 100 : 0;

  // El IVA del bien se SACA dividiendo. Un valor inválido se trata como 0 —o
  // sea, dividir por 1— y no como una excusa para no calcular.
  const divisorIvaBien =
    Number.isFinite(ivaBienPorcentaje) && ivaBienPorcentaje > 0
      ? 1 + ivaBienPorcentaje / 100
      : 1;
  const factorIvaAlquiler =
    Number.isFinite(ivaAlquilerPorcentaje) && ivaAlquilerPorcentaje > 0
      ? 1 + ivaAlquilerPorcentaje / 100
      : 1;

  // 1 y 2. Los porcentajes salen del valor en dólares; después se les saca el IVA del bien.
  const capitalUsd = (valorUsd * (1 - pagoFinalPorcentaje / 100)) / divisorIvaBien;
  const pagoFinalUsd = ((valorUsd * pagoFinalPorcentaje) / 100) / divisorIvaBien;

  // 3. Única conversión a pesos de todo el cálculo.
  const capitalPesos = capitalUsd * cotizacion;

  // 4. La cuota base: amortización lineal más el interés fijo sobre el capital.
  const cuotaBase = capitalPesos / plazo + (capitalPesos * tasa) / 100 / 12;

  // 5 y 6. El aumento se acumula mes a mes; el IVA del alquiler se suma al final.
  const cuotaDelMes = (mes: number) =>
    cuotaBase * Math.pow(1 + aumento, mes - 1) * factorIvaAlquiler;

  const primeraCuota = cuotaDelMes(1);
  const ultimaCuota = cuotaDelMes(plazo);

  // Suma geométrica de las `plazo` cuotas. Con aumento 0 son todas iguales y la
  // fórmula cerrada dividiría por cero.
  const totalCuotas =
    aumento === 0
      ? primeraCuota * plazo
      : (primeraCuota * (Math.pow(1 + aumento, plazo) - 1)) / aumento;

  // 7. El canon inicial. Las cuotas de más van sobre el total: el plazo no baja.
  const cuotasDeCanon = esCeroKm ? 3 : 1;
  const canonInicial = primeraCuota * cuotasDeCanon;

  // 8. El pago final va aparte, al cambio de hoy.
  const pagoFinal = pagoFinalUsd * cotizacion;

  return {
    valorUsd,
    valorPesos: valorUsd * cotizacion,
    cotizacionAplicada: cotizacion,
    plazo,
    tasaAnual: tasa,
    aumentoMensual,
    capitalUsd,
    capitalPesos,
    cuotaBase,
    primeraCuota,
    ultimaCuota,
    totalCuotas,
    cuotasDeCanon,
    canonInicial,
    pagoFinalUsd,
    pagoFinal,
    pagoFinalPorcentaje,
    // El canon adelanta cuotas, no las agrega: para una usada es la cuota 1 y ya
    // está contada en `totalCuotas`. Para una 0 km son dos cuotas de más.
    totalOperacion: totalCuotas + primeraCuota * (cuotasDeCanon - 1) + pagoFinal,
  };
}

/**
 * El caso de prueba de la fórmula de leasing, con los números que el equipo
 * comercial confirmó.
 *
 * No es decoración: `npm test` no existe todavía en este proyecto, así que esta
 * constante es el único lugar donde quedan escritos los valores contra los que
 * se puede verificar la fórmula. Si alguien toca `calcularLeasing`, correr esto
 * en un `node -e` y comparar es todo lo que hace falta para saber si lo rompió.
 */
export const PRUEBA_LEASING = {
  entrada: {
    valorUsd: 45_750,
    plazo: 48,
    tasaAnual: 20,
    aumentoMensual: 1.25,
    pagoFinalPorcentaje: 30,
    ivaBienPorcentaje: 10.5,
    ivaAlquilerPorcentaje: 21,
    cotizacion: 1_540,
    esCeroKm: false,
  },
  esperado: { primeraCuota: 2_025_183, ultimaCuota: 3_631_037, pagoFinal: 19_128_054 },
} as const;
