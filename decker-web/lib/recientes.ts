/**
 * Vistas recientes.
 *
 * Se anota qué fichas abrió esta persona, en su navegador y nada más. Misma
 * nota de privacidad que `lib/favoritos.ts`: acá no hay un dato personal, hay
 * cinco slugs que la persona borra vaciando los datos del sitio.
 *
 * No es lo mismo que guardadas y por eso es otra lista: guardar es un acto
 * deliberado —"esta me interesa"— y visitar no lo es. Mezclarlas llenaría las
 * guardadas de unidades que alguien abrió y descartó.
 *
 * Cinco. Es una franja de una sola fila, para volver sobre lo que se acaba de
 * mirar; con veinte pasa a ser un historial, que es otra cosa y necesita otra
 * pantalla.
 */

const CLAVE_RECIENTES = 'decker:recientes';

/** Cuántas se recuerdan. Ver el encabezado. */
export const MAXIMO_RECIENTES = 5;

export const EVENTO_CAMBIO_RECIENTES = 'decker:recientes-cambiaron';

function leerCrudo(): string | null {
  try {
    return window.localStorage.getItem(CLAVE_RECIENTES);
  } catch {
    return null;
  }
}

function escribirCrudo(valor: string): void {
  try {
    window.localStorage.setItem(CLAVE_RECIENTES, valor);
  } catch {
    // Sin almacenamiento no hay historial. No se pierde nada que la persona
    // haya cargado: son fichas que ya vio.
  }
}

export function leerRecientes(): string[] {
  if (typeof window === 'undefined') return [];
  const crudo = leerCrudo();
  if (!crudo) return [];
  try {
    const valor: unknown = JSON.parse(crudo);
    if (!Array.isArray(valor)) return [];
    return valor
      .filter((elemento): elemento is string => typeof elemento === 'string')
      .slice(0, MAXIMO_RECIENTES);
  } catch {
    return [];
  }
}

/**
 * Anota una visita. La más reciente queda primera y no se repite.
 *
 * Volver a entrar a una ficha que ya estaba la SUBE al principio en vez de
 * dejarla donde estaba: la franja tiene que reflejar en qué anda la persona
 * ahora, no en qué orden descubrió las unidades.
 */
export function registrarVisita(slug: string): string[] {
  if (typeof window === 'undefined') return [];

  const previas = leerRecientes();
  const siguientes = [slug, ...previas.filter((id) => id !== slug)].slice(
    0,
    MAXIMO_RECIENTES,
  );

  // Sin cambios no se escribe ni se avisa: recargar una ficha no tiene por qué
  // volver a renderizar la franja en las demás pestañas.
  if (siguientes.join('|') === previas.join('|')) return previas;

  escribirCrudo(JSON.stringify(siguientes));
  window.dispatchEvent(
    new CustomEvent<string[]>(EVENTO_CAMBIO_RECIENTES, { detail: siguientes }),
  );

  return siguientes;
}

export function suscribirARecientes(alCambiar: (slugs: string[]) => void): () => void {
  const enEstaPestana = (evento: Event) => {
    const detalle = (evento as CustomEvent<string[]>).detail;
    alCambiar(detalle ?? leerRecientes());
  };

  const enOtraPestana = (evento: StorageEvent) => {
    if (evento.key !== null && evento.key !== CLAVE_RECIENTES) return;
    alCambiar(leerRecientes());
  };

  window.addEventListener(EVENTO_CAMBIO_RECIENTES, enEstaPestana);
  window.addEventListener('storage', enOtraPestana);

  return () => {
    window.removeEventListener(EVENTO_CAMBIO_RECIENTES, enEstaPestana);
    window.removeEventListener('storage', enOtraPestana);
  };
}
