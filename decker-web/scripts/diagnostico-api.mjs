/**
 * Diagnóstico de la API de Ruta Sur, de una sola pasada.
 *
 *   node scripts/diagnostico-api.mjs
 *
 * PARA QUÉ EXISTE
 *
 * Cada vez que algo no anda del lado de Ruta Sur —los formularios devolviendo
 * 500, los precios sin aparecer— hay que probar las mismas ocho cosas en el
 * mismo orden para saber de qué lado está el problema. Hacerlo a mano con
 * `curl` lleva diez minutos y es fácil olvidarse de una.
 *
 * Y hay un detalle que lo vuelve necesario: esta API BLOQUEA POR IP cuando se
 * le piden muchas cosas seguidas, entre veinticinco y cincuenta minutos. Así
 * que las pruebas tienen que ir espaciadas y en un solo intento ordenado; un
 * script que reintenta en bucle mantiene el bloqueo en vez de esperarlo.
 *
 * QUIÉN LO PUEDE CORRER
 *
 * Cualquiera, incluido Eduardo. Si a él le da 200 donde a nosotros nos da 500,
 * el problema es de nuestra IP y no de su backend —que es justo la única
 * hipótesis que no se puede descartar desde una sola máquina—.
 *
 * Las credenciales salen de `.env.local` y no se imprimen nunca.
 */

import { readFileSync } from 'node:fs';

const BASE = 'https://xapi.rutasurtrucks.com.ar';
const PAUSA_MS = 20_000;

const entorno = leerEnv();
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function probar(titulo, ruta, opciones = {}) {
  process.stdout.write(`  ${titulo.padEnd(42)}`);
  try {
    const r = await fetch(`${BASE}${ruta}`, {
      method: opciones.metodo ?? 'GET',
      headers: { Accept: 'application/json', ...(opciones.cabeceras ?? {}) },
      ...(opciones.cuerpo
        ? { body: JSON.stringify(opciones.cuerpo), headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...(opciones.cabeceras ?? {}),
          } }
        : {}),
      signal: AbortSignal.timeout(30_000),
    });
    const texto = await r.text();
    console.log(`${r.status}  ${texto.replace(/\s+/g, ' ').slice(0, 90)}`);
    return { estado: r.status, texto };
  } catch (error) {
    // `000` es la convención de curl para "no hubo respuesta". Acá significa
    // casi siempre que la IP está bloqueada, no que el server esté caído.
    console.log(`000  ${error.name === 'TimeoutError' ? 'sin respuesta (IP bloqueada?)' : error.message}`);
    return { estado: 0, texto: '' };
  }
}

console.log(`\nDiagnóstico de ${BASE}\n${new Date().toLocaleString('es-AR')}\n`);

console.log('LECTURA (deberían dar 200)');
const vivo = await probar('GET /up', '/up');
if (vivo.estado !== 200) {
  console.log(
    '\n  La API no contesta. Casi seguro es el bloqueo por IP: dura entre 25 y\n' +
      '  50 minutos y se va solo. NO reintentar en bucle, eso lo mantiene.\n',
  );
  process.exit(0);
}
await espera(PAUSA_MS);
await probar('GET /agencias', '/agencias');
await espera(PAUSA_MS);
await probar('GET /vehiculos?limit=1', '/vehiculos?offset=0&limit=1');

console.log('\nESCRITURA (422 con cuerpo vacío, 200 con datos)');
await espera(PAUSA_MS);
await probar('POST /servicios/contacto  vacío', '/servicios/contacto', {
  metodo: 'POST',
  cuerpo: {},
});
await espera(PAUSA_MS);
await probar('POST /servicios/contacto  con dato', '/servicios/contacto', {
  metodo: 'POST',
  cuerpo: { tipo_contacto: 'WhatsApp' },
});

console.log('\nPROTEGIDO');
await espera(PAUSA_MS);
await probar('GET /precios sin key (debería dar 403)', '/precios');

if (!entorno.RUTASUR_API_USER || !entorno.RUTASUR_API_PASSWORD) {
  console.log('\n  Sin credenciales en .env.local: no se puede probar la key.\n');
  process.exit(0);
}

await espera(PAUSA_MS);
const clave = await probar('PUT /key con las credenciales', '/key', {
  metodo: 'PUT',
  cabeceras: { user: entorno.RUTASUR_API_USER, pass: entorno.RUTASUR_API_PASSWORD },
});

const token = (() => {
  try {
    const d = JSON.parse(clave.texto);
    return d.token || d.key || d.api_key || '';
  } catch {
    return '';
  }
})();

if (!token) {
  console.log('\n  No vino token. Revisar el usuario y la contraseña.\n');
  process.exit(0);
}
console.log(`  token recibido: ${token.length} caracteres`);

await espera(PAUSA_MS);
const precios = await probar('GET /precios CON key', '/precios', {
  cabeceras: { 'X-API-KEY': token },
});

if (precios.estado === 200) {
  // Lo único que de verdad interesa acá es la FORMA: qué campos trae cada fila,
  // para terminar `mapearPrecios`. Los valores no hacen falta.
  try {
    const d = JSON.parse(precios.texto);
    const lista = Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : null;
    console.log(`\n  forma: ${lista ? `lista de ${lista.length}` : `objeto con ${Object.keys(d).join(', ')}`}`);
    if (lista?.length) console.log(`  campos de una fila: ${Object.keys(lista[0]).join(', ')}`);
  } catch {
    console.log('\n  la respuesta no es JSON.');
  }
}
console.log('');

function leerEnv() {
  try {
    return Object.fromEntries(
      readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
        .split('\n')
        .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
        .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
    );
  } catch {
    return {};
  }
}
