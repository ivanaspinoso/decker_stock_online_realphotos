/**
 * Copia las fotos del stock de Ruta Sur a Vercel Blob.
 *
 *   node --env-file=.env.local scripts/subir-fotos-a-blob.mjs              # miniaturas
 *   node --env-file=.env.local scripts/subir-fotos-a-blob.mjs --galerias   # + fotos de las fichas
 *   node --env-file=.env.local scripts/subir-fotos-a-blob.mjs --simular    # cuenta, no sube
 *   node --env-file=.env.local scripts/subir-fotos-a-blob.mjs --tope 500   # sube 500 como mucho
 *
 * PARA QUÉ EXISTE
 *
 * El server de fotos de Ruta Sur bloquea por IP, y las de Vercel caen primero:
 * el proxy (`app/fotos/[carpeta]/[archivo]/route.ts`) se quedaba sin fotos
 * mientras la misma foto, pedida desde una IP de Argentina, llegaba en 0,2 s.
 * Este script baja las fotos desde ACÁ y las deja en Blob, de donde el proxy
 * las lee primero. Una foto en Blob ya no depende de Ruta Sur.
 *
 * CORRERLO CUANDO ENTRAN UNIDADES NUEVAS. Sube sólo lo que falta: las que ya
 * están en Blob no se vuelven a subir. Lo que no está en Blob igual se ve —el
 * proxy va a Ruta Sur— pero con el riesgo de siempre.
 *
 * EL CUPO DE BLOB (plan Hobby): 2.000 operaciones "avanzadas" por mes, y cada
 * foto subida es una. Pasarse no cobra: CORTA el store 30 días, y ahí el proxy
 * vuelve a depender de Ruta Sur. Por eso `--tope` (1.500 por defecto) y por eso
 * las galerías son opcionales: son varias fotos por unidad y no entran todas en
 * un mes. El tope es POR CORRIDA: el script no sabe cuánto se subió antes este
 * mes. Mirar el uso en vercel.com → Storage → decker-fotos.
 *
 * SIN RÁFAGAS. Las fotos y la API son el mismo server y bloquea por volumen
 * (ver CLAUDE.md, "Las fotos y la API son EL MISMO SERVIDOR"): un pedido por
 * segundo, y si fallan varios seguidos se corta en vez de insistir.
 */

import { list, put } from '@vercel/blob';

const API = (process.env.RUTASUR_API_URL || 'https://xapi.rutasurtrucks.com.ar').replace(/\/$/, '');
const ORIGEN = /^https?:\/\/admin\.usados\.rutasurtrucks\.com\.ar\/uploads\/(thumb|croped)\/([^/]+)$/i;
const EXTENSIONES = /\.(jpe?g|png|webp|gif)$/i;
const PAUSA_MS = 1_000;
const FALLOS_SEGUIDOS_MAX = 3;

const argumentos = process.argv.slice(2);
const conGalerias = argumentos.includes('--galerias');
const simular = argumentos.includes('--simular');
const tope = Number(argumentos[argumentos.indexOf('--tope') + 1]) || 1_500;

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('Falta BLOB_READ_WRITE_TOKEN. Correr con --env-file=.env.local (o `vercel env pull`).');
  process.exitCode = 1;
} else {
  await correr();
}

// ---------------------------------------------------------------------------

// Sin `process.exit()` en ningún lado: en Windows, con conexiones de `fetch`
// todavía abiertas, Node aborta con "Assertion failed ... async.c".
async function correr() {
  console.log('Leyendo lo que ya está en Blob…');
  const enBlob = await yaSubidas();
  console.log(`  ${enBlob.size} fotos.\n`);

  console.log('Leyendo el stock…');
  const unidades = coleccion(await pedirJson(`${API}/vehiculos`));
  console.log(`  ${unidades.length} unidades.\n`);

  /** Lo que hay que subir, en orden: primero todas las miniaturas (son las del catálogo). */
  const pendientes = [];
  const anotar = (url) => {
    const foto = deRutaSur(url);
    if (foto && !enBlob.has(foto.ruta) && !pendientes.some((p) => p.ruta === foto.ruta)) {
      pendientes.push(foto);
    }
  };
  for (const unidad of unidades) anotar(unidad.vehicle_thumbnail_url);
  const miniaturas = pendientes.length;
  console.log(`Miniaturas que faltan: ${miniaturas}`);

  if (conGalerias) {
    console.log('\nLeyendo galerías (una unidad por segundo)…');
    for (const [i, unidad] of unidades.entries()) {
      if (pendientes.length >= tope) break;
      await espera(PAUSA_MS);
      try {
        const imagenes = coleccion(await pedirJson(`${API}/vehiculos/${unidad.vehicle_id}/imagenes`));
        for (const imagen of imagenes) {
          if (Number(imagen.image_private) !== 1) anotar(imagen.image_url);
        }
      } catch (error) {
        console.log(`\n  unidad ${unidad.vehicle_id}: ${error.message}`);
      }
      process.stdout.write(`\r  ${i + 1}/${unidades.length}`);
    }
    console.log(`\nFotos de galería que faltan: ${pendientes.length - miniaturas}`);
  }

  const aSubir = pendientes.slice(0, tope);
  console.log(
    `\nA subir: ${aSubir.length}${pendientes.length > tope ? ` (de ${pendientes.length}; el resto queda para la próxima)` : ''}`,
  );
  if (simular || aSubir.length === 0) return;

  let subidas = 0;
  let fallosSeguidos = 0;
  for (const foto of aSubir) {
    await espera(PAUSA_MS);
    try {
      const res = await fetch(foto.origen, { signal: AbortSignal.timeout(20_000) });
      const tipo = res.headers.get('content-type') ?? '';
      if (!res.ok || !tipo.startsWith('image/')) throw new Error(`HTTP ${res.status} ${tipo}`);
      await put(foto.ruta, Buffer.from(await res.arrayBuffer()), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: tipo,
        cacheControlMaxAge: 60 * 60 * 24 * 365,
      });
      subidas++;
      fallosSeguidos = 0;
      process.stdout.write(`\r  ${subidas}/${aSubir.length} subidas`);
    } catch (error) {
      console.log(`\n  ${foto.ruta}: ${error.message}`);
      if (++fallosSeguidos >= FALLOS_SEGUIDOS_MAX) {
        console.log(
          `\n${FALLOS_SEGUIDOS_MAX} fallos seguidos: Ruta Sur probablemente bloqueó esta IP (dura 25-50 min).\n` +
            'Se corta acá. Volver a correr más tarde: retoma desde lo que falta.',
        );
        break;
      }
    }
  }
  console.log(`\n\nListo: ${subidas} fotos subidas a Blob.`);
}

/** Las rutas ya subidas (`fotos/thumb/<archivo>`). Cada página de `list` es una operación avanzada. */
async function yaSubidas() {
  const rutas = new Set();
  let cursor;
  do {
    const pagina = await list({ prefix: 'fotos/', limit: 1_000, cursor });
    for (const blob of pagina.blobs) rutas.add(blob.pathname);
    cursor = pagina.hasMore ? pagina.cursor : undefined;
  } while (cursor);
  return rutas;
}

/**
 * Una URL de foto de la API → dónde va en Blob y de dónde se baja. Mismo
 * criterio que `urlDeFoto()` en `lib/rutasur/mapeo.ts`: los nombres traen
 * espacios sin escapar, y si alguno viene codificado se decodifica antes.
 */
function deRutaSur(url) {
  const coincide = typeof url === 'string' ? ORIGEN.exec(url.trim()) : null;
  if (!coincide) return null;
  const carpeta = coincide[1].toLowerCase();
  let nombre = coincide[2];
  if (nombre.includes('%')) {
    try {
      nombre = decodeURIComponent(nombre);
    } catch {}
  }
  if (!EXTENSIONES.test(nombre)) return null;
  return {
    ruta: `fotos/${carpeta}/${nombre}`,
    origen: `https://admin.usados.rutasurtrucks.com.ar/uploads/${carpeta}/${encodeURIComponent(nombre)}`,
  };
}

async function pedirJson(url) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
  const texto = await res.text();
  // Esta API contesta con el cuerpo vacío cuando no hay nada (ver `cliente.ts`).
  return texto.trim() ? JSON.parse(texto) : [];
}

function coleccion(cuerpo) {
  if (Array.isArray(cuerpo)) return cuerpo;
  if (Array.isArray(cuerpo?.data)) return cuerpo.data;
  return Object.values(cuerpo ?? {}).find(Array.isArray) ?? [];
}
