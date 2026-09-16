import { getCatalogoCompleto } from '@/lib/api';
import { ErrorDeApi } from '@/lib/rutasur/errores';

/**
 * `GET /api/unidades` — el stock, para quien lo necesite desde el navegador.
 *
 * POR QUÉ EXISTE ESTA RUTA
 *
 * Porque la API key de Ruta Sur no puede salir del servidor. Si un componente
 * cliente le pidiera los datos a la API directamente, tendría que llevarla en
 * el JavaScript que baja el navegador, donde la lee cualquiera con las
 * herramientas de desarrollo abiertas. Con esta ruta en el medio, el recorrido
 * es:
 *
 *   navegador → /api/unidades (mismo origen, sin key)
 *               → Ruta Sur (con la key, desde Node)
 *
 * El navegador nunca ve la key ni sabe dónde vive la API. Vale igual hoy, que
 * los endpoints del catálogo son públicos: el día que se enchufe `/precios`
 * —que sí es protegido— el camino ya está hecho y no hay que mover nada.
 *
 * QUIÉN LA USA HOY: nadie, y está bien. Todas las pantallas se arman en el
 * servidor y reciben las unidades por props, que es más rápido y no necesita
 * este salto. La ruta está disponible para lo que hoy no existe: un filtro que
 * pida al vuelo, un scroll infinito, un buscador que no quiera mandar el índice
 * entero al cliente.
 *
 * FORMATO: se devuelven unidades ya traducidas al tipo `Unidad` (camelCase), NO
 * el JSON crudo de la API. Quien consuma esta ruta no tiene que saber que del
 * otro lado hay un `vehicle_thumbnail_url`, ni repetir el mapeo.
 *
 * Los Route Handlers no se cachean por defecto en Next 16. Está bien así: el
 * cacheo real lo hace el `fetch` contra la API, que sí lleva `revalidate` (ver
 * `lib/rutasur/config.ts`). Cachear también acá sumaría una segunda ventana de
 * datos viejos, desfasada de la primera y más difícil de razonar.
 */
export async function GET() {
  try {
    const unidades = await getCatalogoCompleto();
    return Response.json({ data: unidades });
  } catch (error) {
    // El mensaje del error puede nombrar la URL de la API, el endpoint o el
    // motivo del 403. Nada de eso sale al navegador: va al log del servidor,
    // que es donde alguien lo va a leer.
    console.error('[api/unidades]', error);

    const esDeApi = error instanceof ErrorDeApi;
    return Response.json(
      {
        error: esDeApi ? error.mensajeParaElUsuario : 'No se pudo obtener el stock.',
        // Le sirve a quien consuma la ruta para decidir si reintenta. Ante un
        // 429 es `false` a propósito: esta API pide no reintentar automático.
        reintentable: esDeApi ? error.valeReintentar : false,
      },
      // 502: el problema no es el pedido del navegador, es que el servicio de
      // atrás no contestó bien. 504 si además se pasó del tiempo de espera.
      { status: esDeApi && error.causa === 'timeout' ? 504 : 502 },
    );
  }
}
