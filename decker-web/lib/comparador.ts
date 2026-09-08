/**
 * Comparador de unidades.
 *
 * Mismo trato que los favoritos y por la misma razón: el que compara tres
 * camiones no abre una cuenta para hacerlo. Todo vive en el navegador de esa
 * persona, sin backend y sin pedirle un dato. Ver el encabezado de
 * `lib/favoritos.ts`: la nota de privacidad vale igual acá.
 *
 * Lo único propio de este módulo es el TOPE. Comparar es poner cosas al lado y
 * leer las diferencias de una pasada; con cuatro columnas en un teléfono cada
 * una mide setenta píxeles y no se lee ninguna. Tres es lo que entra sin que la
 * tabla tenga que scrollear en horizontal en la mayoría de los teléfonos, y es
 * también la cantidad que alguien sostiene en la cabeza mientras decide.
 */

import type { EstadoUnidad, IdSucursal, TipoUnidad } from '@/lib/types';

const CLAVE_COMPARADOR = 'decker:comparador';

/** Cuántas unidades entran a la vez. Ver el encabezado. */
export const MAXIMO_COMPARADOR = 3;

/** Cambió la lista: lo escuchan todas las tarjetas montadas en la página. */
export const EVENTO_CAMBIO_COMPARADOR = 'decker:comparador-cambio';

/**
 * Lo mínimo de una unidad para poder compararla sin pedirle nada al servidor.
 *
 * Son los campos que ya muestra la ficha, ni uno más: el comparador no inventa
 * datos, pone al lado los que cada unidad ya tiene. Va en el layout de todo el
 * sitio, así que lleva sólo esto —nada de galerías ni descripciones—.
 */
export interface ResumenComparacion {
  slug: string;
  nombre: string;
  marca: string;
  modelo: string;
  tipo: TipoUnidad;
  estado: EstadoUnidad;
  anio: number | null;
  km: number | null;
  precio: number | null;
  sucursalId: IdSucursal;
  imagen: string;
}

/** Qué pasó al tocar. `llena` es el tope alcanzado, no un error. */
export type ResultadoComparador = 'agregada' | 'quitada' | 'llena';

/**
 * Todo acceso a `localStorage` va envuelto: en ventana privada, con las cookies
 * de terceros bloqueadas o con el almacenamiento lleno, `localStorage` no
 * devuelve `null`, TIRA.
 */
function leerCrudo(clave: string): string | null {
  try {
    return window.localStorage.getItem(clave);
  } catch {
    return null;
  }
}

function escribirCrudo(clave: string, valor: string): void {
  try {
    window.localStorage.setItem(clave, valor);
  } catch {
    // Sin almacenamiento la comparación dura lo que dure la pestaña. Es una
    // degradación aceptable: se vuelve a marcar y listo.
  }
}

export function leerComparador(): string[] {
  if (typeof window === 'undefined') return [];
  const crudo = leerCrudo(CLAVE_COMPARADOR);
  if (!crudo) return [];
  try {
    const valor: unknown = JSON.parse(crudo);
    if (!Array.isArray(valor)) return [];
    return valor
      .filter((elemento): elemento is string => typeof elemento === 'string')
      // El tope se aplica también al LEER: si quedó una lista más larga de una
      // versión anterior o de una edición a mano, la tabla no se rompe.
      .slice(0, MAXIMO_COMPARADOR);
  } catch {
    return [];
  }
}

export function estaEnComparador(slug: string): boolean {
  return leerComparador().includes(slug);
}

function guardar(slugs: string[]): void {
  escribirCrudo(CLAVE_COMPARADOR, JSON.stringify(slugs));
  // Avisa a las demás tarjetas de la página. El evento `storage` del navegador
  // sólo se dispara en las OTRAS pestañas, nunca en la que hizo el cambio.
  window.dispatchEvent(
    new CustomEvent<string[]>(EVENTO_CAMBIO_COMPARADOR, { detail: slugs }),
  );
}

/**
 * Suma o saca una unidad. Devuelve la lista resultante y QUÉ PASÓ.
 *
 * El resultado se devuelve en vez de dejar que el componente lo deduzca: sacar
 * y "no entró porque está lleno" dejan la misma lista, y quien llama necesita
 * decir cosas distintas en cada caso.
 *
 * La que entra va AL FINAL y no al principio, al revés que en favoritos: las
 * columnas de la tabla mantienen el orden en que se fueron eligiendo, que es el
 * orden en que la persona las tiene en la cabeza. Un favorito nuevo, en cambio,
 * va arriba de todo porque esa lista se lee como novedades.
 */
export function alternarComparador(slug: string): {
  lista: string[];
  resultado: ResultadoComparador;
} {
  const actuales = leerComparador();

  if (actuales.includes(slug)) {
    const siguientes = actuales.filter((id) => id !== slug);
    guardar(siguientes);
    return { lista: siguientes, resultado: 'quitada' };
  }

  if (actuales.length >= MAXIMO_COMPARADOR) {
    // No se saca la más vieja para hacer lugar: sería descartar en silencio
    // algo que la persona eligió. Se avisa y no se toca nada.
    return { lista: actuales, resultado: 'llena' };
  }

  const siguientes = [...actuales, slug];
  guardar(siguientes);
  return { lista: siguientes, resultado: 'agregada' };
}

export function quitarDelComparador(slug: string): string[] {
  const siguientes = leerComparador().filter((id) => id !== slug);
  guardar(siguientes);
  return siguientes;
}

export function vaciarComparador(): string[] {
  guardar([]);
  return [];
}

/**
 * Suscribe a los cambios de la lista. Devuelve la función para desuscribirse.
 *
 * Escucha las dos fuentes: el evento propio (misma pestaña) y `storage` (otra
 * pestaña del mismo sitio).
 */
export function suscribirAComparador(alCambiar: (slugs: string[]) => void): () => void {
  const enEstaPestana = (evento: Event) => {
    const detalle = (evento as CustomEvent<string[]>).detail;
    alCambiar(detalle ?? leerComparador());
  };

  const enOtraPestana = (evento: StorageEvent) => {
    if (evento.key !== null && evento.key !== CLAVE_COMPARADOR) return;
    alCambiar(leerComparador());
  };

  window.addEventListener(EVENTO_CAMBIO_COMPARADOR, enEstaPestana);
  window.addEventListener('storage', enOtraPestana);

  return () => {
    window.removeEventListener(EVENTO_CAMBIO_COMPARADOR, enEstaPestana);
    window.removeEventListener('storage', enOtraPestana);
  };
}
