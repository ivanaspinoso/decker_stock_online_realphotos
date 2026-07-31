import type { ResultadoFinanciacion } from '@/lib/types';

/**
 * Sistema francés de amortización (cuota fija).
 *
 *   cuota = C · [ i · (1+i)^n ] / [ (1+i)^n − 1 ]
 *
 * donde `C` = capital, `i` = tasa efectiva mensual, `n` = cantidad de cuotas.
 * La tasa que ingresa el usuario es nominal anual, así que `i = tasaAnual/12/100`.
 *
 * Ver `financiacion.test.ts` para los casos de control de este cálculo.
 */
export function calcularFinanciacion(params: {
  valorUnidad: number;
  anticipo: number;
  plazo: number;
  tasaAnual: number;
}): ResultadoFinanciacion | null {
  const { valorUnidad, anticipo, plazo, tasaAnual } = params;

  if (!Number.isFinite(valorUnidad) || valorUnidad <= 0) return null;
  if (!Number.isFinite(plazo) || plazo <= 0) return null;
  if (!Number.isFinite(tasaAnual) || tasaAnual < 0) return null;

  const anticipoValido = Number.isFinite(anticipo) && anticipo > 0 ? anticipo : 0;
  const montoAFinanciar = Math.max(valorUnidad - anticipoValido, 0);

  if (montoAFinanciar === 0) {
    return {
      montoAFinanciar: 0,
      cuotaMensual: 0,
      totalAPagar: 0,
      costoFinanciero: 0,
      plazo,
      tasaAnual,
      tasaMensual: tasaAnual / 12,
    };
  }

  const i = tasaAnual / 100 / 12;
  const cuotaMensual =
    i === 0
      ? montoAFinanciar / plazo
      : (montoAFinanciar * (i * Math.pow(1 + i, plazo))) / (Math.pow(1 + i, plazo) - 1);

  const totalAPagar = cuotaMensual * plazo;

  return {
    montoAFinanciar,
    cuotaMensual,
    totalAPagar,
    costoFinanciero: totalAPagar - montoAFinanciar,
    plazo,
    tasaAnual,
    tasaMensual: tasaAnual / 12,
  };
}
