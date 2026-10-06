/**
 * Apps Script del Google Sheet de leads de financiación.
 *
 * ESTE ARCHIVO NO CORRE EN EL SITIO: se copia y se pega dentro del Sheet.
 *
 * Instalación (una sola vez, ~2 minutos):
 *
 *  1. Crear un Google Sheet nuevo (ej. "Decker — Leads financiación").
 *  2. Extensiones → Apps Script. Borrar lo que haya y pegar este archivo entero.
 *  3. Cambiar SECRETO de abajo por una clave larga cualquiera.
 *  4. Implementar → Nueva implementación → tipo "Aplicación web".
 *       - Ejecutar como: Yo
 *       - Quién tiene acceso: Cualquier usuario
 *     Autorizar cuando lo pida (avisa que la app "no está verificada": es
 *     normal, es un script propio. Configuración avanzada → Ir a ...).
 *  5. Copiar la URL que termina en /exec y cargar en `.env.local` (y en las
 *     variables de entorno del hosting):
 *       SHEETS_WEBHOOK_URL=<esa URL>
 *       SHEETS_WEBHOOK_SECRET=<el mismo SECRETO del paso 3>
 *
 * "Cualquier usuario" es necesario para que el servidor del sitio pueda
 * escribir sin loguearse en Google. Lo que impide que cualquiera escriba es el
 * SECRETO, que sólo conoce el servidor.
 *
 * Si se cambia el script después, hay que volver a Implementar → Administrar
 * implementaciones → editar → Versión nueva. Si no, sigue corriendo la vieja.
 */

var SECRETO = 'CAMBIAR-POR-UNA-CLAVE-LARGA';
var HOJA = 'Leads';

var COLUMNAS = [
  'ID', 'Fecha', 'Nombre', 'Apellido', 'Celular', 'Email', 'Acepta WhatsApp',
  'Unidad', 'Link unidad', 'Página', 'Fuente (utm_source)', 'Medio (utm_medium)',
  'Campaña (utm_campaign)', 'Referrer', 'Página de entrada',
  'Pidió plan', 'Fecha plan', 'Modalidad', 'Valor USD', 'Entrega $', 'Plazo', 'Cuota $',
];

function doPost(e) {
  var datos;
  try {
    datos = JSON.parse(e.postData.contents);
  } catch (error) {
    return responder({ ok: false, error: 'json' });
  }
  if (datos.secreto !== SECRETO) return responder({ ok: false, error: 'secreto' });

  // Dos pedidos al mismo tiempo no pueden escribir la misma fila.
  var candado = LockService.getScriptLock();
  candado.waitLock(10000);
  try {
    var hoja = obtenerHoja();
    if (datos.tipo === 'plan') return responder(anotarPlan(hoja, datos));
    return responder(anotarLead(hoja, datos));
  } finally {
    candado.releaseLock();
  }
}

function anotarLead(hoja, d) {
  hoja.appendRow([
    d.id, new Date(), d.nombre, d.apellido,
    // El apóstrofo evita que Sheets lo convierta en número y le coma el +.
    "'" + d.celular, d.email, d.aceptaWhatsapp ? 'Sí' : 'No',
    d.unidad, d.linkUnidad, d.pagina, d.fuente, d.medio, d.campania, d.referrer,
    d.paginaDeEntrada, 'No', '', '', '', '', '', '',
  ]);
  return { ok: true };
}

function anotarPlan(hoja, d) {
  var fila = buscarFila(hoja, d.id);
  if (!fila) return { ok: false, error: 'id inexistente' };
  var desde = COLUMNAS.indexOf('Pidió plan') + 1;
  hoja.getRange(fila, desde, 1, 7).setValues([[
    'Sí', new Date(), d.modalidad, d.valorUsd, d.entregaPesos, d.plazo, d.cuotaPesos,
  ]]);
  // Si eligió un plan de otra unidad que la del lead, se anota la última.
  if (d.unidad) hoja.getRange(fila, COLUMNAS.indexOf('Unidad') + 1).setValue(d.unidad);
  return { ok: true };
}

function buscarFila(hoja, id) {
  var ultima = hoja.getLastRow();
  if (ultima < 2) return 0;
  var ids = hoja.getRange(2, 1, ultima - 1, 1).getValues();
  // De abajo para arriba: el lead que se busca casi siempre es de recién.
  for (var i = ids.length - 1; i >= 0; i--) {
    if (ids[i][0] === id) return i + 2;
  }
  return 0;
}

function obtenerHoja() {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = libro.getSheetByName(HOJA) || libro.insertSheet(HOJA);
  if (hoja.getLastRow() === 0) {
    hoja.appendRow(COLUMNAS);
    hoja.setFrozenRows(1);
    hoja.getRange(1, 1, 1, COLUMNAS.length).setFontWeight('bold');
  }
  return hoja;
}

function responder(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}
