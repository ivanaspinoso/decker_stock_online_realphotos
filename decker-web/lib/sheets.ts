/**
 * Envío de leads al Google Sheet de Decker. SÓLO SERVIDOR.
 *
 * El Sheet tiene pegado un Apps Script (`scripts/sheets-leads.gs`) publicado
 * como "Aplicación web": recibe un POST con JSON y escribe la fila. Esa URL y
 * el secreto viven en variables de entorno SIN `NEXT_PUBLIC_`: si llegaran al
 * navegador, cualquiera podría llenar el Sheet de basura desde la consola.
 *
 * Igual que `lib/rutasur/contacto.ts`, NUNCA TIRA: un lead que no llegó al
 * Sheet queda en el log; la persona ya está mirando la calculadora y no tiene
 * nada que hacer con ese error.
 */

if (typeof window !== 'undefined') {
  throw new Error('lib/sheets.ts no puede ejecutarse en el navegador.');
}

const TIMEOUT_MS = 10_000;

export async function enviarASheet(datos: Record<string, unknown>): Promise<boolean> {
  const url = process.env.SHEETS_WEBHOOK_URL;
  if (!url) {
    // Pasa en desarrollo sin `.env.local` completo. Se loguea el lead entero
    // para poder ver qué habría llegado.
    console.warn('[sheets] Falta SHEETS_WEBHOOK_URL. Lead no enviado:', datos);
    return false;
  }

  try {
    // `text/plain` y no `application/json`: Apps Script lee el cuerpo crudo
    // de `e.postData.contents` igual, y así no hay preflight de por medio.
    // La respuesta llega después de un 302 a googleusercontent.com, que
    // `fetch` sigue solo.
    const respuesta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...datos, secreto: process.env.SHEETS_WEBHOOK_SECRET ?? '' }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });

    const texto = await respuesta.text();
    let ok = false;
    try {
      ok = (JSON.parse(texto) as { ok?: boolean }).ok === true;
    } catch {
      // Apps Script devuelve una página HTML cuando el script tira o cuando
      // la publicación no es "Cualquier usuario". Se loguea el principio.
    }
    if (!ok) {
      console.error(`[sheets] El Sheet rechazó el lead (${respuesta.status}):`, texto.slice(0, 300));
    }
    return ok;
  } catch (error) {
    console.error('[sheets] Falló el envío al Sheet:', error);
    return false;
  }
}
