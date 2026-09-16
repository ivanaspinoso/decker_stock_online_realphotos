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

/**
 * El precio de una unidad, en su moneda, listo para mostrar.
 *
 * DOS MONEDAS, Y NO SE PUEDEN MEZCLAR. La API guarda el importe en
 * `seller_price` y la moneda aparte en `seller_pricetype`: de las 240 unidades
 * publicadas, unas están en dólares y otras en pesos, sin un criterio que
 * permita deducirlo. Un camión a 90.000 es noventa mil dólares; una batea a
 * 38.000.000 son treinta y ocho millones de pesos. Mostrar uno con el símbolo
 * del otro se equivoca por un factor de mil quinientos.
 *
 * Por eso existe esta función y por eso devuelve el símbolo adentro. Antes cada
 * pantalla hacía `formatearPrecio(unidad.precio)`, que asume pesos: las
 * unidades en dólares tienen `precio: null` y salían todas como "Consultar"
 * —212 precios cargados y ni uno visible—.
 *
 * `null` en las dos monedas es un caso real y legítimo: la unidad no tiene
 * precio cargado, o lo tiene sin moneda declarada, y ahí "Consultar" es la
 * verdad. Ver `monedaDe` en `lib/rutasur/precios.ts`.
 */
export function formatearPrecioDeUnidad(unidad: {
  precio: number | null;
  precioUsd: number | null;
}): string {
  if (unidad.precioUsd !== null) return formatearUsd(unidad.precioUsd);
  return formatearPrecio(unidad.precio);
}

/**
 * La moneda de una unidad, escrita con todas las letras.
 *
 * POR QUÉ NO ALCANZA CON EL SÍMBOLO
 *
 * El catálogo mezcla las dos: 151 unidades en dólares y 61 en pesos, una al
 * lado de la otra en la misma grilla. Los símbolos son parecidos —`US$` y `$`—
 * y en Argentina el peso y el dólar se escriben los dos con `$` según quién lo
 * escriba. Alguien que recorre la lista rápido puede leer `$ 38.000.000` como
 * dólares y descartar una batea que está a su alcance, o leer `US$ 90.000` como
 * pesos y entrar a una ficha que no puede pagar.
 *
 * Errarle acá cuesta un factor de mil quinientos. La palabra al lado del número
 * lo cierra sin que haya que pensarlo.
 *
 * Devuelve `null` cuando no hay precio: ahí no hay moneda que aclarar, la
 * pantalla dice "Consultar" y con eso alcanza.
 */
export function monedaDeUnidad(unidad: {
  precio: number | null;
  precioUsd: number | null;
}): 'dólares' | 'pesos' | null {
  if (unidad.precioUsd !== null) return 'dólares';
  if (unidad.precio !== null) return 'pesos';
  return null;
}

/** Si la unidad tiene un precio publicado, en cualquiera de las dos monedas. */
export function tienePrecio(unidad: { precio: number | null; precioUsd: number | null }): boolean {
  return unidad.precio !== null || unidad.precioUsd !== null;
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
