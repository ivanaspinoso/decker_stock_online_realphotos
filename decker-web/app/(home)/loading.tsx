/**
 * Esqueleto de la home mientras se pide el stock.
 *
 * POR QUÉ HACE FALTA, medido y no supuesto: el listado completo de la API tarda
 * entre 1,6 y 4,9 segundos. La home es una ruta dinámica —lee `searchParams`
 * para el buscador— así que no se sirve prearmada: cada vez que la caché de
 * cinco minutos vence, el visitante que llega primero espera eso.
 *
 * Sin este archivo, esa espera es una pestaña EN BLANCO. Con datos locales el
 * problema no existía porque la respuesta era instantánea; con la API es la
 * primera impresión del sitio.
 *
 * POR QUÉ VIVE EN `app/(home)/` Y NO EN `app/`.
 *
 * Un `loading.tsx` en la raíz cubre por herencia TODAS las rutas que no tengan
 * el suyo, y eso rompía la ficha: su límite de Suspense hace que el envase de
 * la página salga por la red antes de terminar de renderizar, y una vez que
 * salió, el código de respuesta ya está mandado. El `notFound()` de una unidad
 * vendida dibujaba "no encontramos esta unidad" con un **200 OK** —un soft 404,
 * que es lo que hace que Google no saque del índice las URLs de camiones que ya
 * no existen—.
 *
 * `(home)` es un grupo de rutas: no cambia la URL —la home sigue siendo `/`—
 * pero acota este esqueleto a la home y a nada más. El catálogo tiene el suyo
 * en `app/catalogo/loading.tsx`; la ficha no tiene, a propósito, y ahí está
 * explicado por qué.
 *
 * POR QUÉ ESQUELETO Y NO UN SPINNER
 *
 * Porque dibuja el tamaño y la posición de lo que viene. Cuando llegan los
 * datos, cada bloque gris se reemplaza por su contenido y nada salta; un
 * spinner centrado se reemplaza por una página entera y todo se reacomoda de
 * golpe.
 *
 * Las proporciones repiten el hero oscuro a pantalla casi completa y la grilla
 * de destacadas, que es lo único que se ve sin scrollear. Lo de más abajo no se
 * dibuja: un esqueleto de cinco secciones que nadie llega a ver cuesta lo mismo
 * que las tres que sí.
 */
export default function CargandoHome() {
  return (
    <div aria-hidden="true">
      {/* El hero: fondo oscuro, título grande, bajada y la barra del buscador. */}
      <div className="bg-negro-950">
        <div className="contenedor flex min-h-[70vh] flex-col justify-center py-20">
          <div className="h-10 w-3/4 max-w-2xl rounded bg-white/10 sm:h-14" />
          <div className="mt-4 h-10 w-1/2 max-w-xl rounded bg-white/10 sm:h-14" />
          <div className="mt-6 h-4 w-full max-w-lg rounded bg-white/10" />
          {/* La barra del buscador, que es el elemento con el que más gente
              interactúa: si no está dibujada, el hero se ve corto y después
              crece. */}
          <div className="mt-10 h-14 w-full max-w-2xl rounded bg-white/10" />
        </div>
      </div>

      {/* La grilla de destacadas. Tres tarjetas: lo que entra en una fila. */}
      <div className="contenedor py-16 sm:py-20">
        <div className="h-8 w-56 rounded bg-gris-100" />
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="overflow-hidden rounded-lg bg-white shadow-nivel-1">
              {/* 4:3, la misma proporción que la foto de la tarjeta real. */}
              <div className="aspect-[4/3] w-full bg-gris-100" />
              <div className="p-5">
                <div className="h-5 w-3/4 rounded bg-gris-100" />
                <div className="mt-3 h-4 w-1/2 rounded bg-gris-100" />
                <div className="mt-6 h-6 w-2/5 rounded bg-gris-100" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* El lector de pantalla no ve nada de lo de arriba (`aria-hidden`): para
          eso está esta línea, que es lo único que se anuncia. */}
      <p className="sr-only" role="status">
        Cargando el stock…
      </p>
    </div>
  );
}
