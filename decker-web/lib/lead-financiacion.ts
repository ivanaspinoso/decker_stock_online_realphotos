/**
 * El lead que abre la calculadora. Módulo de CLIENTE.
 *
 * La calculadora no se muestra hasta que la persona deja celular, email y
 * nombre —el mismo recorrido que tiene Kavak—. Lo que se carga acá viaja a
 * `/api/contacto/financiacion`, que lo deja en el Google Sheet de Decker.
 *
 * SE PIDE UNA SOLA VEZ. Queda guardado en este navegador y la próxima ficha
 * abre la calculadora directo: pedirle los datos de nuevo a alguien que ya los
 * dio, por cada unidad que mira, es la forma más rápida de que deje de mirar.
 *
 * NO HAY VERIFICACIÓN DEL CELULAR, y es una decisión: el objetivo es captar el
 * contacto, no aprobar un crédito. Un SMS de verificación cuesta plata por lead
 * y es el paso donde más gente abandona. Lo que sí se valida es el FORMATO —un
 * celular argentino de 10 dígitos—, que alcanza para filtrar el "1234". Y el
 * botón "Quiero este plan" abre WhatsApp: si la persona escribe, el número es
 * real.
 */

export interface LeadFinanciacion {
  /** Identifica la fila en el Sheet: el plan elegido después se anota en ella. */
  id: string;
  nombre: string;
  apellido: string;
  /** 10 dígitos: código de área sin 0 y número sin 15. */
  celular: string;
  email: string;
  aceptaWhatsapp: boolean;
}

const CLAVE_LEAD = 'decker:lead-financiacion';
const CLAVE_ORIGEN = 'decker:origen';

export function leerLead(): LeadFinanciacion | null {
  if (typeof window === 'undefined') return null;
  try {
    const crudo = window.localStorage.getItem(CLAVE_LEAD);
    if (!crudo) return null;
    const valor = JSON.parse(crudo) as Partial<LeadFinanciacion>;
    if (typeof valor.id !== 'string' || typeof valor.celular !== 'string') return null;
    return {
      id: valor.id,
      nombre: String(valor.nombre ?? ''),
      apellido: String(valor.apellido ?? ''),
      celular: valor.celular,
      email: String(valor.email ?? ''),
      aceptaWhatsapp: valor.aceptaWhatsapp === true,
    };
  } catch {
    return null;
  }
}

export function guardarLead(lead: LeadFinanciacion): void {
  try {
    window.localStorage.setItem(CLAVE_LEAD, JSON.stringify(lead));
  } catch {
    // Sin almacenamiento la calculadora se abre igual en esta visita; en la
    // próxima ficha se le vuelven a pedir los datos. Molesto, no roto.
  }
}

export function nuevoIdDeLead(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // `randomUUID` sólo existe en contexto seguro (https o localhost).
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

/**
 * Lleva lo que tipeó la persona a los 10 dígitos de un celular argentino, o
 * `null` si no se puede.
 *
 * Acepta las formas en que la gente lo escribe de verdad: con 0 adelante, con
 * 15 en el medio, con +54 9, con espacios y guiones. "0291 15 400-0000",
 * "+54 9 291 400 0000" y "2914000000" dan lo mismo.
 */
export function normalizarCelular(texto: string): string | null {
  let d = texto.replace(/\D/g, '');
  if (d.startsWith('54') && d.length >= 12) d = d.slice(2);
  if (d.startsWith('9') && d.length === 11) d = d.slice(1);
  if (d.startsWith('0')) d = d.slice(1);

  // El 15 va después del código de área, que tiene de 2 a 4 dígitos.
  if (d.length === 12) {
    for (const largoArea of [2, 3, 4]) {
      if (d.slice(largoArea, largoArea + 2) === '15') {
        d = d.slice(0, largoArea) + d.slice(largoArea + 2);
        break;
      }
    }
  }

  return /^[1-9]\d{9}$/.test(d) ? d : null;
}

export function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/**
 * De dónde llegó la persona: las etiquetas `utm_*` del link y el sitio que la
 * mandó. Es lo que dice qué canal trae los leads.
 *
 * Se anota en la PRIMERA página que abre, no en la del formulario: el que
 * llega desde un anuncio a la home y después navega a una ficha ya perdió las
 * `utm` de la URL cuando completa los datos. Primer contacto gana; se pisa
 * sólo si llega otra visita con `utm` nuevas.
 */
export interface Origen {
  fuente: string;
  medio: string;
  campania: string;
  referrer: string;
  paginaDeEntrada: string;
}

export function anotarOrigen(): void {
  try {
    const url = new URL(window.location.href);
    const fuente = url.searchParams.get('utm_source') ?? '';
    const yaHay = window.sessionStorage.getItem(CLAVE_ORIGEN);
    if (yaHay && !fuente) return;

    // El referrer sólo cuenta si es de afuera: navegar dentro del sitio no es
    // un origen.
    const referrer =
      document.referrer && new URL(document.referrer).host !== url.host ? document.referrer : '';

    const origen: Origen = {
      fuente,
      medio: url.searchParams.get('utm_medium') ?? '',
      campania: url.searchParams.get('utm_campaign') ?? '',
      referrer,
      paginaDeEntrada: url.pathname + url.search,
    };
    window.sessionStorage.setItem(CLAVE_ORIGEN, JSON.stringify(origen));
  } catch {
    // Sin origen, el lead llega igual con esas columnas vacías.
  }
}

export function leerOrigen(): Origen | null {
  try {
    const crudo = window.sessionStorage.getItem(CLAVE_ORIGEN);
    return crudo ? (JSON.parse(crudo) as Origen) : null;
  } catch {
    return null;
  }
}
