/**
 * Configuración de la conexión a la API de Ruta Sur Trucks.
 *
 * QUÉ ES ESTA API
 *
 * `xapi.rutasurtrucks.com.ar` es el backend que administra el stock de Decker.
 * El dominio dice "Ruta Sur" y no "Decker" porque es la plataforma que usan
 * varias concesionarias; las 281 unidades que devuelve traen
 * `company_email: jdecker@decker.com.ar` y las sucursales de Decker, así que es
 * el stock correcto. Verificado contra datos reales, no supuesto.
 *
 * EL INTERRUPTOR
 *
 * `NEXT_PUBLIC_USE_MOCK_DATA` decide de dónde salen las unidades:
 * - `true`: de los arrays de `lib/data/unidades.ts` (los datos de prueba).
 * - `false`: de la API.
 *
 * Está en `false` sólo si la variable dice exactamente `'false'`. Cualquier
 * otra cosa —vacía, ausente, `'FALSE'` con mayúsculas de más— deja los datos
 * locales. La asimetría es a propósito: un typo en una variable de entorno no
 * puede tener como consecuencia que el catálogo salga a pedirle datos a un
 * server mal configurado y la home quede en la pantalla de error.
 */

/** El interruptor. Ver arriba por qué sólo `'false'` apaga los datos locales. */
export function usaDatosMock(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK_DATA !== 'false';
}

/**
 * La URL base. Nunca hardcodeada en el código que hace los pedidos.
 *
 * El default existe porque esta URL es pública y fija —no es un secreto ni
 * cambia por ambiente—, y sin default un deploy al que se le olvidó la variable
 * deja el sitio sin catálogo. La variable sigue estando para poder apuntar a un
 * staging sin tocar código.
 */
export function urlBase(): string {
  const url = process.env.RUTASUR_API_URL?.trim() || 'https://xapi.rutasurtrucks.com.ar';
  // Sin la barra final: las rutas se concatenan como `/vehiculos` y si la
  // variable viene con barra queda `//vehiculos`, que algunos routers de PHP
  // resuelven y otros contestan 404.
  return url.replace(/\/+$/, '');
}

/**
 * La API key para los endpoints protegidos (`/precios` y los de escritura).
 *
 * HOY NO LA TENEMOS y por eso esto puede devolver `undefined`: los endpoints
 * públicos —todo el catálogo, agencias, banners, contacto— no la necesitan y
 * funcionan igual. Ver `lib/rutasur/clave.ts` para el flujo de obtención.
 *
 * SIN `NEXT_PUBLIC_`, a propósito. Ese prefijo hace que Next inserte el valor
 * dentro del JavaScript que baja el navegador, y ahí la key queda a la vista de
 * cualquiera que abra las herramientas de desarrollo. Si alguna vez llega vacía
 * en un componente cliente, la solución es pedirle los datos a un Route
 * Handler, no publicar la key.
 */
export function apiKey(): string | undefined {
  return process.env.RUTASUR_API_KEY?.trim() || undefined;
}

/** Credenciales para `PUT /key`. Sólo si hay que generar la key al vuelo. */
export function credenciales(): { usuario: string; clave: string } | null {
  const usuario = process.env.RUTASUR_API_USER?.trim();
  const clave = process.env.RUTASUR_API_PASSWORD?.trim();
  if (!usuario || !clave) return null;
  return { usuario, clave };
}

/**
 * Cuánto esperamos antes de cortar, en milisegundos.
 *
 * VEINTE SEGUNDOS Y NO OCHO, y el motivo es una conducta medida de esta API:
 * cuando le pedís un `/vehiculos/{id}` que no existe, no contesta 404 —**se
 * cuelga exactamente 21 segundos y corta la conexión**—. Lo mismo hace cuando
 * te pasás de pedidos seguidos. Con un timeout más corto no podríamos
 * distinguir "no existe" de "tarda", y el caso importa: un favorito guardado de
 * una unidad ya vendida entra justo por ahí (ver `lib/rutasur/vehiculos.ts`).
 *
 * Es más de lo que debería tardar un listado y menos de lo que alguien espera
 * mirando un blanco. El cacheo de abajo hace que casi nadie lo vea.
 */
export const MS_DE_ESPERA = 20_000;

/**
 * Cada cuánto se revalida el catálogo, en segundos.
 *
 * NO ES UNA OPTIMIZACIÓN, ES UN REQUISITO. Probando esta API desde una sola IP,
 * después de unos treinta pedidos seguidos empezó a cortar TODAS las conexiones
 * —incluidas las de endpoints que recién habían andado— y tardó varios minutos
 * en volver. No documenta el límite ni contesta 429: corta.
 *
 * Con `revalidate`, Next sirve el catálogo desde su caché y sale a la API una
 * vez cada cinco minutos, no una vez por visitante. Sin esto, una tarde con
 * tráfico normal nos deja afuera del backend.
 *
 * Cinco minutos es razonable para un stock de camiones, donde una unidad no
 * entra ni se vende en el mismo minuto.
 */
export const SEGUNDOS_DE_REVALIDACION = 300;

/**
 * Cada cuánto se revalidan las FOTOS de una unidad, en segundos. Un día.
 *
 * POR QUÉ MUCHÍSIMO MÁS QUE EL CATÁLOGO, que se revalida cada cinco minutos:
 * porque son dos riesgos distintos.
 *
 * El catálogo es UNA llamada, la misma para todo el sitio. Las fotos son una
 * llamada POR UNIDAD (`/vehiculos/{id}/imagenes`), y hay 239. Con cinco
 * minutos, un buscador recorriendo el catálogo dispara 239 pedidos en el
 * tiempo que tarda en bajar las páginas, y esta API deja de contestar a los
 * treinta y pico. Se midió: alcanzó con visitar doce fichas seguidas para que
 * bloqueara todo.
 *
 * Y el dato lo aguanta: las fotos de una unidad publicada no cambian. Se cargan
 * cuando la unidad entra al stock y se quedan así hasta que se vende. Un día de
 * demora en una foto agregada es invisible; el catálogo caído una hora, no.
 *
 * Si alguna vez hay que ver una foto nueva ya mismo, es un redeploy.
 */
export const SEGUNDOS_DE_REVALIDACION_FOTOS = 24 * 60 * 60;

/**
 * Cuántas unidades por página. NO SUBIRLO: es el tope real del server.
 *
 * `?offset=0&limit=5000` devuelve 100, no 5000. La API acepta cualquier
 * `limit`, contesta 200 y recorta a 100 sin decir nada —ni un `meta`, ni un
 * `total`, ni un header—. Pedir de más no trae de más: sólo hace creer que sí.
 *
 * Y para completar la trampa, `limit` SIN `offset` se ignora por completo y
 * devuelve el listado entero. Las dos conductas juntas hacen que el "traeme
 * todo" más natural del mundo devuelva un tercio del catálogo, en silencio.
 *
 * De recorrer las páginas se ocupa `traerCrudos()` en `vehiculos.ts`.
 */
export const TAMANIO_DE_PAGINA = 100;

/**
 * Cuántas unidades vamos a buscar como máximo, sumando todas las páginas.
 *
 * Es un freno, no una expectativa: hoy el stock son 281. Existe para que un
 * backend que devolviera siempre páginas llenas —por un bug de `offset`, por
 * ejemplo— no deje al servidor pidiendo páginas para siempre. Si alguna vez se
 * alcanza, queda gritado en el log.
 */
export const TOPE_DE_LISTADO = 5_000;
