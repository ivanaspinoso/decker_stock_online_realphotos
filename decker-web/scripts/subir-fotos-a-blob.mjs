/**
 * Copia las fotos del stock de Ruta Sur a Vercel Blob.
 *
 *   node --env-file=.env.local scripts/subir-fotos-a-blob.mjs              # lo que falte
 *   node --env-file=.env.local scripts/subir-fotos-a-blob.mjs --simular    # cuenta, no sube
 *   node --env-file=.env.local scripts/subir-fotos-a-blob.mjs --tope 100   # 100 como mucho
 *
 * CORRE SOLO TODOS LOS DÍAS (tarea programada de Windows "Decker - fotos a
 * Blob", ver CLAUDE.md). No hace falta acordarse de correrlo.
 *
 * PARA QUÉ EXISTE
 *
 * El server de fotos de Ruta Sur bloquea por IP, y las de Vercel caen primero:
 * el proxy (`app/fotos/[carpeta]/[archivo]/route.ts`) se quedaba sin fotos
 * mientras la misma foto, pedida desde una IP de Argentina, llegaba en 0,2 s.
 * Este script baja las fotos desde ACÁ y las deja en Blob, de donde el proxy
 * las lee primero. Una foto en Blob ya no depende de Ruta Sur.
 *
 * El proxy también guarda en Blob cada foto que consigue. Este script cubre lo
 * que el proxy no puede: los días en que Ruta Sur no le contesta a Vercel.
 *
 * QUÉ SUBE, en orden: las miniaturas que falten (son las del catálogo) y
 * después las galerías de las unidades que todavía no están completas. Una
 * galería completa queda anotada en `.cache/fotos-blob.json` y no se vuelve a
 * pedir: así una corrida diaria le pide a Ruta Sur sólo las unidades nuevas,
 * no las 245.
 *
 * EL CUPO DE BLOB (plan Hobby): 2.000 subidas por mes. Pasarse no cobra: CORTA
 * el store 30 días, y ahí el proxy vuelve a depender de Ruta Sur. El script
 * cuenta lo que sube en el mes (en el mismo `.cache/fotos-blob.json`) y no pasa
 * de `TOPE_DEL_MES`: el resto del cupo queda para lo que sube el proxy. Lo que
 * no entra queda para el mes siguiente.
 *
 * SIN RÁFAGAS. Las fotos y la API son el mismo server y bloquea por volumen
 * (ver CLAUDE.md, "Las fotos y la API son EL MISMO SERVIDOR"): un pedido por
 * segundo, y si fallan varios seguidos se corta en vez de insistir.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { list, put } from '@vercel/blob';

const API = (process.env.RUTASUR_API_URL || 'https://xapi.rutasurtrucks.com.ar').replace(/\/$/, '');
const ORIGEN = /^https?:\/\/admin\.usados\.rutasurtrucks\.com\.ar\/uploads\/(thumb|croped)\/([^/]+)$/i;
const EXTENSIONES = /\.(jpe?g|png|webp|gif)$/i;
const PAUSA_MS = 1_000;
const FALLOS_SEGUIDOS_MAX = 3;
/** De las 2.000 del mes; las otras 500 quedan para el proxy. */
const TOPE_DEL_MES = 1_500;
const ARCHIVO_DE_ESTADO = join(dirname(fileURLToPath(import.meta.url)), '..', '.cache', 'fotos-blob.json');

const argumentos = process.argv.slice(2);
const simular = argumentos.includes('--simular');
const topeManual = argumentos.includes('--tope') ? Number(argumentos[argumentos.indexOf('--tope') + 1]) : Infinity;

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

console.log(`\n=== ${new Date().toLocaleString('es-AR')} ===`);
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('Falta BLOB_READ_WRITE_TOKEN. Correr con --env-file=.env.local (o `vercel env pull`).');
  process.exitCode = 1;
} else {
  try {
    await correr();
  } catch (error) {
    console.error('Falló:', error.message);
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------

// Sin `process.exit()` en ningún lado: en Windows, con conexiones de `fetch`
// todavía abiertas, Node aborta con "Assertion failed ... async.c".
async function correr() {
  const estado = await leerEstado();
  const quedan = Math.min(TOPE_DEL_MES - estado.subidasDelMes, topeManual);
  console.log(`Subidas este mes: ${estado.subidasDelMes} de ${TOPE_DEL_MES}.`);
  if (quedan <= 0) {
    console.log('Cupo del mes usado. El mes que viene sigue.');
    return;
  }

  const enBlob = await yaSubidas();
  const unidades = coleccion(await pedirJson(`${API}/vehiculos`));
  console.log(`En Blob: ${enBlob.size} fotos. Stock: ${unidades.length} unidades.`);

  // Las unidades que salieron del stock se olvidan: el archivo no crece para siempre.
  const enStock = new Set(unidades.map((u) => u.vehicle_id));
  estado.galeriasCompletas = estado.galeriasCompletas.filter((id) => enStock.has(id));

  /** Lo que hay que subir, en orden: primero todas las miniaturas. */
  const pendientes = [];
  const anotar = (url) => {
    const foto = deRutaSur(url);
    if (!foto || enBlob.has(foto.ruta)) return null;
    if (!pendientes.some((p) => p.ruta === foto.ruta)) pendientes.push(foto);
    return foto.ruta;
  };
  for (const unidad of unidades) anotar(unidad.vehicle_thumbnail_url);
  console.log(`Miniaturas que faltan: ${pendientes.length}`);

  /** Unidad → las fotos de su galería que faltan. Vacío = ya está completa. */
  const faltanDeGaleria = new Map();
  const sinRevisar = unidades.filter((u) => !estado.galeriasCompletas.includes(u.vehicle_id));
  console.log(`Galerías sin completar: ${sinRevisar.length}`);
  for (const unidad of sinRevisar) {
    if (pendientes.length >= quedan) break;
    await espera(PAUSA_MS);
    try {
      const imagenes = coleccion(await pedirJson(`${API}/vehiculos/${unidad.vehicle_id}/imagenes`));
      const faltan = imagenes
        .filter((imagen) => Number(imagen.image_private) !== 1)
        .map((imagen) => anotar(imagen.image_url))
        .filter(Boolean);
      faltanDeGaleria.set(unidad.vehicle_id, new Set(faltan));
    } catch (error) {
      console.log(`  unidad ${unidad.vehicle_id}: ${error.message}`);
    }
  }

  const aSubir = pendientes.slice(0, quedan);
  console.log(
    `A subir: ${aSubir.length}${pendientes.length > quedan ? ` (de ${pendientes.length}; el resto, en la próxima corrida)` : ''}`,
  );

  const subidas = new Set();
  if (!simular) {
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
        subidas.add(foto.ruta);
        fallosSeguidos = 0;
      } catch (error) {
        console.log(`  ${foto.ruta}: ${error.message}`);
        if (++fallosSeguidos >= FALLOS_SEGUIDOS_MAX) {
          console.log(
            `${FALLOS_SEGUIDOS_MAX} fallos seguidos: Ruta Sur probablemente bloqueó esta IP (dura 25-50 min).\n` +
              'Se corta acá; la próxima corrida retoma desde lo que falta.',
          );
          break;
        }
      }
    }
  }

  // Completa = se leyó su galería y no le falta nada, o lo que faltaba se subió.
  for (const [id, faltan] of faltanDeGaleria) {
    if ([...faltan].every((ruta) => subidas.has(ruta)) && !estado.galeriasCompletas.includes(id)) {
      estado.galeriasCompletas.push(id);
    }
  }
  estado.subidasDelMes += subidas.size;
  if (!simular) await guardarEstado(estado);

  console.log(
    `Listo: ${subidas.size} subidas. Galerías completas: ${estado.galeriasCompletas.length} de ${unidades.length}.`,
  );
}

async function leerEstado() {
  const mes = new Date().toISOString().slice(0, 7);
  let guardado = {};
  try {
    guardado = JSON.parse(await readFile(ARCHIVO_DE_ESTADO, 'utf8'));
  } catch {}
  return {
    mes,
    subidasDelMes: guardado.mes === mes ? (guardado.subidasDelMes ?? 0) : 0,
    galeriasCompletas: guardado.galeriasCompletas ?? [],
  };
}

async function guardarEstado(estado) {
  await mkdir(dirname(ARCHIVO_DE_ESTADO), { recursive: true });
  await writeFile(ARCHIVO_DE_ESTADO, JSON.stringify(estado, null, 2));
}

/** Las rutas ya subidas (`fotos/thumb/<archivo>`). Cada página de `list` gasta una operación. */
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
