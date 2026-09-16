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
  // 1.540 es el cambio que usa hoy el equipo comercial, con su margen YA
  // incluido: por eso el margen queda en 0 y no en 5. Los dos campos siguen
  // separados porque la cuenta es la misma —`oficial × (1 + margen/100)`— y el
  // día que vuelvan a partir del oficial se carga el oficial arriba y el 5
  // abajo, sin tocar ninguna fórmula.
  //
  // Se actualiza a mano: no hay API de cotización todavía. Cuando el equipo
  // comercial cambie el número, se cambia acá y nada más.
  dolarOficialVenta: 1_540,
  margenDolarPorcentaje: 0,

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
