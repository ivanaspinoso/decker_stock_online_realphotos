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
 * DE DÓNDE SALE CADA FOTO, en orden:
 *
 * 1. Vercel Blob (`fotos/<carpeta>/<archivo>`), si está. Es lo único que no
 *    depende de ese server.
 * 2. El server de Ruta Sur. Si da una MINIATURA que no estaba en Blob, se
 *    guarda en Blob (después de contestar, con `after`): la tarjeta de una
 *    unidad nueva queda a salvo la primera vez que alguien la ve. Las galerías
 *    las sube sólo `scripts/subir-fotos-a-blob.mjs` (todos los días, desde una
 *    máquina a la que Ruta Sur sí le contesta), que lleva la cuenta del cupo.
 * 3. Si ninguno la dio, 307 a la foto original: el bloqueo suele ser a las IPs
 *    de Vercel, no a las del visitante.
 *
 * NO ES UN PROXY ABIERTO: sólo acepta las dos carpetas de fotos de ese único
 * host y nombres de archivo de imagen. Cualquier otra cosa da 404.
 */

import { put } from '@vercel/blob';
import { after } from 'next/server';

const ORIGEN = 'https://admin.usados.rutasurtrucks.com.ar/uploads';
const BLOB = urlDelStore(process.env.BLOB_READ_WRITE_TOKEN);
const CARPETAS = new Set(['thumb', 'croped']);
const EXTENSIONES = /\.(jpe?g|png|webp|gif)$/i;

/** Una foto publicada no cambia: un año en el CDN y en el navegador. */
const SEGUNDOS_EN_CACHE = 60 * 60 * 24 * 365;

/**
 * Lo que se espera al server antes de darlo por colgado. Cuelga 21 s si no.
 * Pasado el corte el navegador va directo al server (ver el 307 de `GET`), así
 * que es demora que el visitante paga entera: corto. Una foto sana llega en
 * menos de un segundo.
 *
 * Sin reintento acá: lo hace `FotoUnidad` del lado del navegador (a 1,5 s y
 * 5 s). Reintentar en los dos lados multiplicaba las esperas —17 s por intento,
 * casi un minuto hasta mostrar el aviso de "foto no disponible"—.
 */
const TIMEOUT_MS = 4_000;

/** Blob contesta en milisegundos, también con un 404: si tarda, algo anda mal. */
const TIMEOUT_BLOB_MS = 2_000;

/**
 * CORTACIRCUITO: si Ruta Sur no contestó, durante este rato no se le vuelve a
 * preguntar y las fotos que no están en Blob van directo al 307.
 *
 * Sin esto, un bloqueo a Vercel (dura 25-50 min) le cobraba `TIMEOUT_MS` a
 * CADA foto fuera de Blob: una grilla con varias así se veía trabada, foto por
 * foto, cuatro segundos cada una. Con esto paga la espera un solo pedido cada
 * cinco minutos por instancia, y el resto sale al instante. Insistir además
 * alarga el bloqueo.
 *
 * Vive en memoria de la instancia: una instancia nueva arranca confiando y
 * paga una espera para enterarse. No hace falta compartirlo.
 */
const PAUSA_TRAS_FALLA_MS = 5 * 60_000;
let rutaSurCaidaHasta = 0;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ carpeta: string; archivo: string }> },
) {
  const { carpeta, archivo } = await params;
  const nombre = decodificar(archivo);

  if (!CARPETAS.has(carpeta) || !nombre || nombre.includes('/') || !EXTENSIONES.test(nombre)) {
    return new Response('No encontrada', { status: 404 });
  }

  const ruta = `${carpeta}/${encodeURIComponent(nombre)}`;
  const url = `${ORIGEN}/${ruta}`;
  const deBlob = BLOB ? await pedirFoto(`${BLOB}/fotos/${ruta}`, TIMEOUT_BLOB_MS) : 'falla';
  const respuesta = typeof deBlob === 'object' ? deBlob : await pedirARutaSur(url);

  // Sólo si Blob dijo "no está" (404). Si Blob falló por otra cosa, la foto
  // puede estar igual, y subirla de nuevo gasta cupo de balde.
  //
  // SÓLO MINIATURAS. Acá no hay cómo contar las subidas del mes, y pasarse del
  // cupo de Blob lo corta 30 días para TODO el sitio. Miniaturas son una por
  // unidad nueva: pocas por mes, el margen sobra. Galerías son ~10 por unidad
  // y las sube el script, que sí cuenta.
  if (carpeta === 'thumb' && deBlob === 'falta' && typeof respuesta === 'object') {
    after(() => guardarEnBlob(`fotos/${carpeta}/${nombre}`, respuesta));
  }

  if (typeof respuesta !== 'object') {
    // SI NO LA CONSEGUIMOS, QUE LA PIDA EL NAVEGADOR.
    //
    // El server de Ruta Sur bloquea por IP, y las IPs de Vercel son pocas y
    // compartidas: todas las fotos sin caché salen de ellas, así que son las
    // primeras en quedar bloqueadas. Medido (oct 2026): desde Vercel `iad1`
    // cada foto colgaba hasta el corte, mientras la misma foto pedida desde una
    // IP de Argentina llegaba en 0,2 s. Con un 503 acá esas tarjetas quedaban
    // con "Foto no disponible" aunque la foto estuviera a un pedido de distancia.
    //
    // `no-store`: la redirección no se cachea, ni en el CDN ni en el navegador.
    // La próxima visita vuelve a pasar por el proxy y, si el server ya contesta,
    // la foto queda guardada acá.
    return new Response(null, {
      status: 307,
      headers: { Location: url, 'Cache-Control': 'no-store' },
    });
  }

  return new Response(respuesta.cuerpo, {
    headers: {
      'Content-Type': respuesta.tipo,
      'Cache-Control': `public, max-age=${SEGUNDOS_EN_CACHE}, s-maxage=${SEGUNDOS_EN_CACHE}, immutable`,
    },
  });
}

type Foto = { cuerpo: ArrayBuffer; tipo: string };

/** `pedirFoto` contra Ruta Sur, con el cortacircuito. Un 404 no lo dispara: el server contestó. */
async function pedirARutaSur(url: string): Promise<Foto | 'falta' | 'falla'> {
  if (Date.now() < rutaSurCaidaHasta) return 'falla';
  const resultado = await pedirFoto(url, TIMEOUT_MS);
  if (resultado === 'falla') rutaSurCaidaHasta = Date.now() + PAUSA_TRAS_FALLA_MS;
  return resultado;
}

/** La foto, `'falta'` si el server contestó 404, o `'falla'` por cualquier otra cosa. */
async function pedirFoto(url: string, timeoutMs: number): Promise<Foto | 'falta' | 'falla'> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      // Sólo se cachean las respuestas 200: un 503 no queda guardado.
      next: { revalidate: SEGUNDOS_EN_CACHE },
    });
    const tipo = res.headers.get('content-type') ?? '';
    if (res.status === 404) return 'falta';
    if (!res.ok || !tipo.startsWith('image/')) return 'falla';
    return { cuerpo: await res.arrayBuffer(), tipo };
  } catch {
    return 'falla';
  }
}

/**
 * Cada subida gasta cupo de Blob (2.000 por mes en Hobby; pasarse corta el
 * store 30 días). Se sube una sola vez: después la foto sale de Blob o del CDN. Si falla no pasa nada:
 * la foto ya se le dio al visitante, y la próxima vez se vuelve a intentar.
 */
async function guardarEnBlob(ruta: string, foto: Foto): Promise<void> {
  try {
    await put(ruta, Buffer.from(foto.cuerpo), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: foto.tipo,
      cacheControlMaxAge: SEGUNDOS_EN_CACHE,
    });
  } catch (error) {
    console.error(`[fotos] No se pudo guardar ${ruta} en Blob:`, error);
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

/**
 * La URL pública del store, sacada del token: `vercel_blob_rw_<storeId>_<secreto>`
 * → `https://<storeid>.public.blob.vercel-storage.com`. Así no hay una segunda
 * variable de entorno que mantener sincronizada con el token.
 *
 * Sin token (desarrollo sin `vercel env pull`) devuelve `null` y el proxy va
 * directo a Ruta Sur, como antes de que existiera el store.
 */
function urlDelStore(token: string | undefined): string | null {
  const storeId = token?.match(/^vercel_blob_rw_([a-z0-9]+)_/i)?.[1];
  return storeId ? `https://${storeId.toLowerCase()}.public.blob.vercel-storage.com` : null;
}
