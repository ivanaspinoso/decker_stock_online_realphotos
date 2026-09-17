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
  //   cotizacion = dolarOficialVenta + margenDolarPesos
  //
  // El margen es un MONTO FIJO en pesos por dólar, no un porcentaje. Sobre un
  // oficial de 1.530 la cotización es 1.535, no 1.606. Es el único de los dos
  // números que se sigue editando a mano: es una decisión comercial de Decker,
  // no un dato de mercado.
  //
  // EL DÓLAR DE ACÁ YA NO ES EL QUE SE USA. Lo pisa `getParametrosFinanciacion`
  // con el oficial venta de Banco Nación en vivo — ver `lib/dolar.ts`. Este
  // número quedó como ÚLTIMA LÍNEA DE RESPALDO, para el caso de que DolarAPI no
  // conteste y el proceso todavía no haya visto ningún valor bueno.
  //
  // Para corregir el respaldo sin un deploy está la variable de entorno
  // `DOLAR_OFICIAL_VENTA_RESPALDO`, que le gana a este número.
  //
  // Vale la pena mantenerlo más o menos al día igual: además de ser el
  // respaldo, es la referencia contra la que `lib/dolar.ts` decide si el valor
  // que contestó la API es creíble.
  dolarOficialVenta: 1_530,
  margenDolarPesos: 5,

  // Modalidad 1 — Financiación estándar.
  //
  // ACÁ SE CAMBIAN LAS TASAS, y es el único lugar. Fueron campos editables en
  // la calculadora hasta que se sacaron: la tasa la pacta Decker, no la persona
  // que está cotizando, y un visitante podía bajarla a 0 y sacar una captura de
  // una cuota que nadie le iba a dar. Cuando Decker pida un cambio, se edita
  // este archivo y sale en el próximo deploy.
  tasaAnual: 18,
  interesMensualAdicional: 1,

  plazosDisponibles: [12, 24, 36, 48],
  plazoPorDefecto: 36,

  anticipoMinimoPorcentaje: 30,
  anticipoSugeridoPorcentaje: 40,

  // Modalidad 2 — Leasing. Los de la planilla confirmada por Decker, y
  // tampoco los toca el visitante.
  tasaAnualLeasing: 20,
  aumentoMensualLeasing: 1.25,

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
