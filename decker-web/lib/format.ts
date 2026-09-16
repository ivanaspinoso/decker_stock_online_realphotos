/** Formateo de datos numéricos. Todo el sitio muestra pesos argentinos. */

const PESOS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const NUMERO = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

/**
 * Un porcentaje que puede tener decimales, con hasta dos y sin ceros de relleno.
 *
 * `formatearNumero` redondea a entero, que está bien para pesos y kilómetros
 * pero miente con las tasas: el aumento del leasing es 1,25% mensual y se
 * mostraba como "1%". Quien leía el resultado veía una cuota calculada con
 * 1,25 y un cartel diciendo 1, y no había forma de saber cuál era el bueno.
 *
 * Sin ceros de relleno para que 20 siga siendo "20" y no "20,00": la mayoría de
 * las tasas son redondas y no hay motivo para ensuciarlas.
 */
const PORCENTAJE = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });

/**
 * Dólares. Sólo aparecen en la calculadora de financiación —el stock se cotiza
 * en USD— y nunca como precio de catálogo o de ficha, que siguen en pesos.
 *
 * Se muestra "US$" y no "$" a secas justamente porque conviven las dos monedas
 * en la misma pantalla: un "$" ambiguo al lado de una cuota en pesos es un
 * error de lectura de tres ceros.
 */
const DOLARES = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'USD',
  currencyDisplay: 'narrowSymbol',
  maximumFractionDigits: 0,
});

/**
 * Los campos sin cargar se muestran como "Consultar", nunca como `0`.
 * Las unidades que vienen del sitio original no tienen precio, año ni km.
 */
export function formatearPrecio(valor: number | null): string {
  if (valor === null) return 'Consultar';
  return PESOS.format(valor);
}

export function formatearAnio(anio: number | null): string {
  return anio === null ? 'Consultar' : String(anio);
}

export function formatearKm(km: number | null): string {
  if (km === null) return 'Consultar';
  if (km === 0) return '0 km';
  return `${NUMERO.format(km)} km`;
}


export function formatearNumero(valor: number): string {
  return NUMERO.format(valor);
}

/** Un porcentaje con sus decimales. Ver `PORCENTAJE`. */
export function formatearPorcentaje(valor: number): string {
  return PORCENTAJE.format(valor);
}

export function formatearUsd(valor: number | null): string {
  if (valor === null) return 'Consultar';
  return `US${DOLARES.format(valor)}`;
}

/** Semis y bateas no llevan kilometraje: ahí se muestra la configuración. */
export function tieneKilometraje(tipo: string): boolean {
  return tipo !== 'Semi' && tipo !== 'Batea';
}

/**
 * ¿Este valor es una CIFRA o es una palabra?
 *
 * Decide si un valor de ficha va en la monoespaciada. La regla del sistema es
 * que la mono está reservada para datos numéricos —precios, años, kilómetros,
 * potencia, tasas—, porque su ancho fijo es lo que hace que una columna de
 * números se compare de un vistazo.
 *
 * Sobre una palabra ese mismo ancho fijo no aporta nada y encima se lee como
 * otra tipografía: "Volvo", "Bahía Blanca" o "Consultar" en mono, al lado de un
 * párrafo en la normal, rompen la unidad de la página aunque sean cortes de la
 * misma familia. La tabla del catálogo ya aplicaba este criterio a mano; esto
 * lo vuelve una sola regla para las tres superficies.
 *
 * El corte es simple a propósito: empieza con dígito, es cifra. Alcanza para
 * todo lo que publica el sitio —"2022", "298.000 km", "420 CV" van a mono;
 * "Volvo", "Camión", "Carga pesada", "Disponible", "Consultar" no— y no hay que
 * acordarse de marcar campo por campo cuando se agrega uno nuevo.
 */
export function esCifra(valor: string): boolean {
  return /^\d/.test(valor.trim());
}

/**
 * Número de WhatsApp para MOSTRAR.
 *
 * Los datos guardan el número como lo pide la API de WhatsApp —internacional,
 * sin `+` ni separadores—, y hasta ahora la pantalla mostraba esa misma tira:
 * `+5492974439691`. Trece dígitos corridos no se leen ni se dictan por
 * teléfono. Acá se le devuelve la forma en que la agencia lo escribe.
 *
 * Sólo se parte el caso que existe en el stock: móvil argentino, `549` más
 * característica de cuatro dígitos más seis del abonado. Cualquier otra cosa
 * —un fijo, una característica de dos o tres dígitos, un número de otro país—
 * se devuelve con el `+` y nada más: es preferible un número sin cortar que uno
 * cortado en el lugar equivocado.
 */
export function formatearWhatsapp(numero: string): string {
  const digitos = numero.replace(/\D/g, '');
  const movilArgentino = /^549(\d{4})(\d{2})(\d{4})$/.exec(digitos);
  if (!movilArgentino) return `+${digitos}`;
  const [, caracteristica, bloque, resto] = movilArgentino;
  return `+54 9 ${caracteristica} ${bloque}-${resto}`;
}

/**
 * Una línea con los datos técnicos que tenga la unidad.
 *
 * PARA QUÉ: sólo 57 de las 240 unidades traen descripción escrita por Decker.
 * En las otras, los lugares que esperaban un párrafo —la tarjeta del catálogo y
 * la meta descripción que lee Google— quedarían vacíos.
 *
 * Antes esto se resolvía metiendo los datos técnicos DENTRO de `descripcion`
 * durante el mapeo, y traía dos problemas: en la ficha salían como prosa en vez
 * de como tabla, y el texto empezaba repitiendo el nombre del camión que ya
 * estaba en el título.
 *
 * Ahora los datos viven en `unidad.ficha` y esto arma la línea sólo donde hace
 * falta una. No inventa nada: enumera lo que el backend mandó, en el orden en
 * que se mira un camión.
 */
export function resumenTecnico(ficha: {
  motor?: string;
  combustible?: string;
  traccion?: string;
  frenos?: string;
  largo?: string;
  color?: string;
}): string {
  return [
    ficha.motor && `Motor ${ficha.motor}`,
    ficha.combustible,
    ficha.traccion && `Tracción ${ficha.traccion}`,
    ficha.frenos && `Frenos ${ficha.frenos}`,
    ficha.largo,
    ficha.color,
  ]
    .filter(Boolean)
    .join(' · ');
}
