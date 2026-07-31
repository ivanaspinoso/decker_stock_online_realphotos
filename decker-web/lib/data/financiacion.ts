import type { ParametrosFinanciacion } from '@/lib/types';

/**
 * Configuración comercial de la calculadora.
 *
 * Tasa y plazos son los del sitio original de Decker (tasa anual orientativa
 * 28%, plazos de 12 a 48 cuotas). Es el único lugar donde se tocan: ningún
 * componente hardcodea estos valores.
 */
export const PARAMETROS_FINANCIACION: ParametrosFinanciacion = {
  tasaAnualPorDefecto: 28,
  plazosDisponibles: [12, 24, 36, 48],
  plazoPorDefecto: 36,
  anticipoMinimoPorcentaje: 30,
  anticipoSugeridoPorcentaje: 40,
  leyenda:
    'Simulación orientativa por sistema francés de amortización. No constituye una oferta ' +
    'de crédito: la tasa, el plazo y las condiciones finales dependen de la operación ' +
    'vigente y de la evaluación del equipo comercial.',
};
