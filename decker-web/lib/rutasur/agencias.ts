import { exigirColeccion, pedir } from '@/lib/rutasur/cliente';
import { mapearWhatsappDeAgencias } from '@/lib/rutasur/mapeo';
import type { AgenciaApi } from '@/lib/rutasur/tipos';
import type { IdSucursal } from '@/lib/types';

/**
 * Las concesionarias, desde la API.
 *
 * QUÉ SE TOMA DE ACÁ Y QUÉ NO
 *
 * El listado de sucursales del sitio —nombre, dirección, localidad,
 * coordenadas del mapa— SIGUE saliendo de `lib/data/sucursales.ts`, y no es por
 * pereza: la API manda `company_lat` y `company_long` VACÍOS en las once
 * agencias, así que no alcanza para centrar un mapa. Además los nombres de la
 * API vienen con numeración interna ("BAHIA BLANCA II.", "QUEQUEN I.") que no
 * es para publicar.
 *
 * Lo que sí conviene tomar de la API es el TELÉFONO, que es el dato que cambia
 * y que, cuando cambia, cambia en el backend y no en nuestro repositorio.
 */

const RUTAS = {
  listado: '/agencias',
} as const;

/**
 * Los otros dos endpoints de agencias existen y andan, pero no están acá:
 * `GET /agencias/{id}` (el detalle de una) y `GET /agencias/telefonos` (los
 * números por área: ventas, repuestos, taller, seguro). Ninguna pantalla los
 * muestra hoy —las agencias se listan enteras y cada una deriva al WhatsApp de
 * su asesor— y una función que nadie llama envejece sin que nadie se entere de
 * que dejó de funcionar. Cuando haya una sección de contacto por área, se
 * agregan acá: son cuatro líneas cada una.
 */

/** Las once concesionarias, crudas. */
async function traerAgencias(): Promise<AgenciaApi[]> {
  const cuerpo = await pedir(RUTAS.listado);
  return exigirColeccion(cuerpo) as AgenciaApi[];
}

/**
 * El WhatsApp real de cada sucursal del sitio, según la API.
 *
 * Devuelve sólo las que mapean a una de las cinco sucursales publicadas y
 * tienen un número cargado. Quien lo use tiene que quedarse con el número de
 * `lib/data/sucursales.ts` para las que no estén: por eso devuelve un `Map` y
 * no un objeto completo.
 *
 * Si la llamada falla, devuelve un mapa vacío en vez de propagar el error. Un
 * WhatsApp desactualizado es un problema; que no cargue la página de agencias
 * porque la API está caída es peor, y el número de respaldo ya está en el repo.
 */
export async function traerWhatsappPorSucursal(): Promise<Map<IdSucursal, string>> {
  try {
    return mapearWhatsappDeAgencias(await traerAgencias());
  } catch (error) {
    console.error('[rutasur] No se pudieron traer los WhatsApp de las agencias:', error);
    return new Map();
  }
}
