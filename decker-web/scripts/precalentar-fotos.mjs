#!/usr/bin/env node
/**
 * Precalienta la caché de imágenes optimizadas. Se corre DESPUÉS de un deploy.
 *
 * EL PROBLEMA QUE RESUELVE
 *
 * Las fotos del stock viven en el server de Decker, no en este repo. Cuando el
 * navegador pide una, Next baja el original de ahí, lo recodifica y lo guarda
 * 30 días. El problema es la PRIMERA vez de cada foto: una grilla del catálogo
 * pide una docena al mismo tiempo, ese server corta las conexiones cuando se le
 * piden muchas juntas, Next contesta 504 y el visitante ve tarjetas sin foto.
 *
 * Después de un deploy la caché arranca vacía, así que ese peor caso le toca
 * justo al primer visitante. Este script se adelanta: pide las fotos ÉL, de a
 * una y con pausa, hasta llenar la caché. Cuando llega el primer visitante ya
 * está todo recodificado y servido desde disco.
 *
 * EL LÍMITE DEL SERVER ES ACUMULADO, NO DE CONCURRENCIA. Esto se midió: a una
 * foto cada 500 ms —sin ninguna concurrencia— el server de Decker sirvió
 * exactamente **100 fotos seguidas** y después dejó de contestar, y siguió
 * bloqueado un minuto largo. O sea que espaciar más no alcanza: hay que PARAR
 * cada tanto y esperar a que se le pase.
 *
 * De eso se ocupan `TANDA` y `DESCANSO_MS`. El precalentado completo tarda
 * varios minutos y está bien: corre después del deploy, sin nadie esperándolo, y
 * lo que compra es que el primer visitante no vea ni un solo 504.
 *
 * USO
 *
 *   node scripts/precalentar-fotos.mjs                      # contra localhost:3000
 *   node scripts/precalentar-fotos.mjs https://decker...    # contra producción
 *
 * Variables:
 *   ANCHOS   anchos a precalentar, separados por coma. Por defecto `640,1080`:
 *            el de una tarjeta en teléfono y el de una en escritorio. Son los
 *            dos que cubren casi todo el tráfico; precalentar los seis de
 *            `deviceSizes` serían seis descargas por unidad y no vale la pena.
 *   PAUSA_MS espera entre pedidos. Por defecto 400.
 *   TANDA    cuántas fotos antes de parar a descansar. Por defecto 80, con
 *            margen sobre las 100 que el server aguanta.
 *   DESCANSO espera entre tandas, en segundos. Por defecto 90.
 *   GALERIAS `1` para precalentar TAMBIÉN las fotos de cada ficha, no sólo la
 *            miniatura del listado. Tarda mucho más —son unas 1500 imágenes en
 *            vez de 243, alrededor de 45 minutos— pero es lo único que deja la
 *            ficha sin un solo 504 en su primera visita. Para un deploy
 *            tranquilo vale la pena; para uno apurado, el escalonado de
 *            `GaleriaUnidad` ya evita que el visitante vea fotos rotas.
 */

const base = (process.argv[2] ?? 'http://localhost:3000').replace(/\/+$/, '');
const anchos = (process.env.ANCHOS ?? '640,1080').split(',').map(Number);
const pausaMs = Number(process.env.PAUSA_MS ?? 400);
const tanda = Number(process.env.TANDA ?? 80);
const conGalerias = process.env.GALERIAS === '1';
const descansoMs = Number(process.env.DESCANSO ?? 90) * 1_000;

const dormir = (ms) => new Promise((listo) => setTimeout(listo, ms));

/**
 * Las fotos de la galería de una ficha, leídas del HTML que el sitio ya sirve.
 *
 * Se saca de la página en vez de pedirle la lista a la API porque así se
 * precalientan EXACTAMENTE las URLs que el navegador va a pedir —mismo ancho,
 * misma calidad—. Una URL que no coincide llena otra entrada de caché y el
 * visitante igual espera la suya.
 */
async function fotosDeLaFicha(slug) {
  try {
    const respuesta = await fetch(`${base}/unidad/${slug}`, {
      signal: AbortSignal.timeout(60_000),
    });
    if (!respuesta.ok) return [];
    const html = await respuesta.text();
    const urls = [...html.matchAll(/\/_next\/image\?url=([^"&]+)&amp;w=(\d+)&amp;q=(\d+)/g)].map(
      (m) => `${base}/_next/image?url=${m[1]}&w=${m[2]}&q=${m[3]}`,
    );
    return [...new Set(urls)];
  } catch {
    return [];
  }
}

async function traerUnidades() {
  const respuesta = await fetch(`${base}/api/unidades`, {
    headers: { Accept: 'application/json' },
  });
  if (!respuesta.ok) {
    throw new Error(
      `${base}/api/unidades contestó ${respuesta.status}. ` +
        '¿Está el sitio levantado y la API respondiendo?',
    );
  }
  const { data } = await respuesta.json();
  return data;
}

/** Pide una URL de `/_next/image` ya armada. */
async function precalentarUrl(destino) {
  try {
    const respuesta = await fetch(destino, {
      headers: { Accept: 'image/avif,image/webp,*/*' },
      signal: AbortSignal.timeout(30_000),
    });
    return respuesta.ok;
  } catch {
    return false;
  }
}


const unidades = await traerUnidades();

// Una entrada por PEDIDO, en una sola lista: así las tandas se cortan por
// cantidad de pedidos, que es lo que el server cuenta, y no por unidad.
const pedidos = unidades.flatMap((unidad) =>
  anchos.map((ancho) => ({
    slug: unidad.slug,
    destino: `${base}/_next/image?url=${encodeURIComponent(unidad.imagen)}&w=${ancho}&q=75`,
    etiqueta: `${ancho}px`,
  })),
);

if (conGalerias) {
  console.log(`Leyendo las galerías de ${unidades.length} fichas…`);
  for (const [indice, unidad] of unidades.entries()) {
    for (const destino of await fotosDeLaFicha(unidad.slug)) {
      pedidos.push({ slug: unidad.slug, destino, etiqueta: 'galería' });
    }
    // Leer el HTML de la ficha es barato —sale del cache de Next— pero igual se
    // espacia: la PRIMERA visita a cada ficha dispara su llamada de fotos a la
    // API, y son 243 fichas.
    await dormir(150);
    if ((indice + 1) % 50 === 0) console.log(`  leídas ${indice + 1}/${unidades.length}…`);
  }
}

const descansos = Math.floor((pedidos.length - 1) / tanda);
const minutos = Math.ceil((pedidos.length * pausaMs + descansos * descansoMs) / 60_000);
console.log(
  `Precalentando ${pedidos.length} imágenes (${unidades.length} unidades × ${anchos.length} ` +
    `anchos), una cada ${pausaMs}ms, con un descanso de ${descansoMs / 1000}s cada ${tanda}. ` +
    `Tiempo estimado: ${minutos} min.`,
);

let listas = 0;
let fallaron = 0;

for (const [indice, pedido] of pedidos.entries()) {
  // El descanso va ANTES de la tanda, no después de fallar: para cuando falla,
  // el server ya está bloqueado y el daño está hecho.
  if (indice > 0 && indice % tanda === 0) {
    console.log(
      `  ${indice}/${pedidos.length} — descansando ${descansoMs / 1000}s para no ` +
        'bloquear el server de fotos…',
    );
    await dormir(descansoMs);
  }

  if (await precalentarUrl(pedido.destino)) {
    listas += 1;
  } else {
    fallaron += 1;
    console.warn(`  falló (${pedido.etiqueta}): ${pedido.slug}`);
  }

  if (indice + 1 < pedidos.length) await dormir(pausaMs);
}

console.log(`\nListas: ${listas}   Fallaron: ${fallaron}`);

if (fallaron > 0) {
  console.log(
    'Las que fallaron se reintentan solas en el navegador (ver FotoUnidad), así que\n' +
      'no queda ninguna tarjeta sin foto para siempre. Pero si fallaron muchas, el\n' +
      'server de fotos se bloqueó: esperá unos minutos y volvé a correr esto —las que\n' +
      'ya están cacheadas no se piden de nuevo—. Subir TANDA o bajar DESCANSO es lo que\n' +
      'lo vuelve a romper. Nunca correr dos de estos en paralelo.',
  );
}

// Un fallo precalentando no tiene que romper un deploy: el sitio anda igual,
// sólo que la primera visita de esas fotos va a tardar.
process.exit(0);
