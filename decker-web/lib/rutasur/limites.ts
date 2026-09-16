/**
 * Los topes que impone la API de Ruta Sur, en un archivo sin dependencias.
 *
 * POR QUÉ ESTÁN ACÁ Y NO EN `contacto.ts`, QUE ES QUIEN LOS USA
 *
 * Porque el formulario también los necesita: tiene que avisarle al visitante
 * que no puede subir una quinta foto ANTES de que la elija, no después de que
 * la API la rechace. Y `contacto.ts` es código de servidor —importa el cliente
 * HTTP, que tiene una guarda para no entrar nunca en el bundle del navegador—
 * así que un componente cliente no puede leer nada de ahí.
 *
 * Este archivo no importa nada y no exporta más que números y expresiones:
 * lo pueden leer los dos lados sin arrastrar código de servidor al navegador.
 *
 * Los valores salen de la documentación de la API, no de una suposición.
 */

/** Fotos del usado que acepta `POST /contactos/vender`: `fileSource1` … `4`. */
export const MAXIMO_DE_FOTOS = 4;

/** Formatos de imagen que acepta la API. El MIME tiene que coincidir con el contenido. */
export const FORMATOS_DE_FOTO = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Peso máximo de cada foto YA DECODIFICADA, en bytes. */
export const PESO_MAXIMO_DE_FOTO = 10 * 1024 * 1024;

/**
 * Largo máximo de cada Data URL Base64, en caracteres.
 *
 * No es lo mismo que `PESO_MAXIMO_DE_FOTO`: Base64 infla el archivo un tercio,
 * así que 10 MB de foto son unos 14 millones de caracteres. La API mide esto y
 * el navegador mide aquello; hay que respetar los dos.
 */
export const LARGO_MAXIMO_DE_DATA_URL = 14_000_000;

/** Un Data URL de imagen con un formato que la API acepta. */
export const DATA_URL_DE_IMAGEN = /^data:image\/(jpeg|jpg|png|webp);base64,/i;

/** Topes de largo por campo, en caracteres. Salen de la documentación. */
export const LARGOS = {
  nombre: 150,
  email: 255,
  telefono: 100,
  marca: 150,
  localidad: 150,
  mensaje: 5000,
  agencia: 150,
  vehiculo: 255,
  observaciones: 5000,
} as const;
