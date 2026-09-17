import type { ParametrosFinanciacion } from '@/lib/types';

/**
 * Configuración comercial de la calculadora.
 *
 * Es el ÚNICO lugar donde se tocan estos números: ningún componente ni fórmula
 * los hardcodea. Cuando el dólar se mueve, cuando cambia la tasa o cuando se
 * renegocia el margen, se edita acá y nada más.
 *
 * El dólar oficial no viene de ninguna API todavía: se actualiza a mano.
 */
export const PARAMETROS_FINANCIACION: ParametrosFinanciacion = {
  // Conversión USD → ARS. Aplica a las dos modalidades.
  //
  //   cotizacion = dolarOficialVenta + margenDolarPesos = 1.530 + 5 = 1.535
  //
  // El margen es un MONTO FIJO en pesos por dólar, no un porcentaje.
  //
  // Antes acá había un 1.540 con el margen en 0: el cambio "ya armado" que
  // pasaba el equipo comercial, metido como si fuera el oficial. Por eso el
  // sitio calculaba a 1.540 y no a 1.535, y por eso cambiar la fórmula sola no
  // alcanzaba — el problema era el dato, no la cuenta. Los dos campos van
  // separados justamente para que esto no se repita: arriba el oficial que se
  // puede verificar contra el banco, abajo el margen de Decker.
  //
  // Se actualiza a mano: no hay API de cotización todavía. Cuando el dólar se
  // mueve, se cambia el oficial acá y nada más.
  dolarOficialVenta: 1_530,
  margenDolarPesos: 5,

  // Modalidad 1 — Financiación estándar.
  tasaAnualPorDefecto: 18,
  interesMensualAdicionalPorDefecto: 1,

  plazosDisponibles: [12, 24, 36, 48],
  plazoPorDefecto: 36,

  anticipoMinimoPorcentaje: 30,
  anticipoSugeridoPorcentaje: 40,

  // Modalidad 2 — Leasing.
  tasaAnualLeasingPorDefecto: 20,
  aumentoMensualLeasingPorDefecto: 1.25,

  // Los dos IVA de la operación, que son distintos y se aplican al revés uno
  // del otro: el del bien se SACA dividiendo al principio, el del alquiler se
  // suma multiplicando al final. Ver el encabezado de `calcularLeasing`.
  ivaBienPorcentaje: 10.5,
  ivaAlquilerPorcentaje: 21,

  pagoFinalLeasingPorcentaje: 30,

  valorEjemploUsd: 60_000,

  leyenda:
    'Simulación orientativa. No constituye una oferta de crédito: la tasa, el plazo y las ' +
    'condiciones finales dependen de la operación vigente y de la evaluación del equipo ' +
    'comercial.',
};
