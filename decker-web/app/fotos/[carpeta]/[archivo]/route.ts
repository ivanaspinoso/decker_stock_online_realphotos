/**
 * Las fotos del stock, servidas desde nuestro dominio y cacheadas por Vercel.
 *
 * `/fotos/thumb/<archivo>`  → `admin.usados.rutasurtrucks.com.ar/uploads/thumb/<archivo>`
 * `/fotos/croped/<archivo>` → `admin.usados.rutasurtrucks.com.ar/uploads/croped/<archivo>`
 *
 * POR QUÉ EXISTE
 *
 * El server de fotos de Ruta Sur es inestable: devuelve 503 o deja el pedido
 * colgado, sobre todo después de una ráfaga (ver CLAUDE.md, "Las fotos"). Con
 * las fotos pedidas directo desde el navegador, cada visita le pegaba otra vez
 * y una página del catálogo podía quedar con dos tercios de tarjetas grises.
 *
 * Acá cada foto se baja de ese server UNA vez y después sale de caché, en dos
 * capas:
 *
 * 1. La caché de datos de Next (`revalidate` del fetch): es compartida entre
 *    todas las regiones de Vercel, así que el server de Ruta Sur ve un solo
 *    pedido por foto cada `SEGUNDOS_EN_CACHE`, no uno por región.
 * 2. El CDN de Vercel (`s-maxage` de la respuesta): un pedido que ya salió de
 *    acá ni siquiera ejecuta esta función.
 *
 * NO es el optimizador de imágenes (`/_next/image`), que es lo que agotó el
 * cupo y daba 402: acá no se recodifica nada, se reenvía el JPEG tal cual. Las
 * fotos ya vienen chicas (~16 KB la miniatura, ~60 KB la de galería).
 *
 * NO ES UN PROXY ABIERTO: sólo acepta las dos carpetas de fotos de ese único
 * host y nombres de archivo de imagen. Cualquier otra cosa da 404.
 */

const ORIGEN = 'https://admin.usados.rutasurtrucks.com.ar/uploads';
const CARPETAS = new Set(['thumb', 'croped']);
const EXTENSIONES = /\.(jpe?g|png|webp|gif)$/i;

/** Una foto publicada no cambia: un año en el CDN y en el navegador. */
const SEGUNDOS_EN_CACHE = 60 * 60 * 24 * 365;

/**
 * Lo que se espera al server antes de darlo por colgado. Cuelga 21 s si no.
 *
 * Sin reintento acá: lo hace `FotoUnidad` del lado del navegador (a 1,5 s y
 * 5 s). Reintentar en los dos lados multiplicaba las esperas —17 s por intento,
 * casi un minuto hasta mostrar el aviso de "foto no disponible"—.
 */
const TIMEOUT_MS = 6_000;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ carpeta: string; archivo: string }> },
) {
  const { carpeta, archivo } = await params;
  const nombre = decodificar(archivo);

  if (!CARPETAS.has(carpeta) || !nombre || nombre.includes('/') || !EXTENSIONES.test(nombre)) {
    return new Response('No encontrada', { status: 404 });
  }

  const url = `${ORIGEN}/${carpeta}/${encodeURIComponent(nombre)}`;
  const respuesta = await pedirFoto(url);

  if (!respuesta) {
    // `no-store`: un fallo no se cachea, ni en el CDN ni en el navegador. Así el
    // reintento de `FotoUnidad` vuelve a intentar de verdad.
    return new Response('Foto no disponible', {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  return new Response(respuesta.cuerpo, {
    headers: {
      'Content-Type': respuesta.tipo,
      'Cache-Control': `public, max-age=${SEGUNDOS_EN_CACHE}, s-maxage=${SEGUNDOS_EN_CACHE}, immutable`,
    },
  });
}

async function pedirFoto(url: string): Promise<{ cuerpo: ArrayBuffer; tipo: string } | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // Sólo se cachean las respuestas 200: un 503 no queda guardado.
      next: { revalidate: SEGUNDOS_EN_CACHE },
    });
    const tipo = res.headers.get('content-type') ?? '';
    if (!res.ok || !tipo.startsWith('image/')) return null;
    return { cuerpo: await res.arrayBuffer(), tipo };
  } catch {
    return null;
  }
}

/** Los nombres traen espacios ("WhatsApp Image ..."): pueden llegar codificados o no. */
function decodificar(segmento: string): string | null {
  try {
    return decodeURIComponent(segmento);
  } catch {
    return null;
  }
}
