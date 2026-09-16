/**
 * Esqueleto del catálogo mientras se pide el stock.
 *
 * SE VE. Con los datos de prueba no aparecía nunca —la página se generaba en
 * el build y llegaba armada—, pero con la API real el listado tarda entre 1,6 y
 * 4,9 segundos, medido contra el server, y el catálogo es una ruta dinámica que
 * no se sirve prearmada.
 *
 * Sin este archivo, el default de Next es dejar la pantalla anterior CONGELADA
 * hasta que la nueva esté completa: el visitante toca "Ver catálogo" y no pasa
 * nada durante cinco segundos, que se lee como que el clic no funcionó.
 *
 * POR QUÉ ESQUELETO Y NO UN SPINNER
 *
 * Porque dibuja el tamaño y la posición de lo que viene. Cuando llegan los
 * datos, las tarjetas ocupan el lugar donde ya había un bloque gris y nada
 * salta; un spinner centrado se reemplaza por una grilla y toda la página se
 * reacomoda de golpe.
 *
 * Las proporciones no son inventadas: repiten la banda de encabezado, la barra
 * de filtros y la grilla de tarjetas del catálogo real. Un esqueleto que no
 * coincide con lo que llega es un salto igual, sólo que anunciado.
 */
export default function CargandoCatalogo() {
  return (
    <div aria-hidden="true">
      {/* Banda de encabezado: foto de fondo oscura con título y bajada. */}
      <div className="bg-negro-950">
        <div className="contenedor py-16 sm:py-20">
          <div className="h-9 w-64 rounded bg-white/10 sm:h-11 sm:w-96" />
          <div className="mt-4 h-4 w-full max-w-xl rounded bg-white/10" />
          <div className="mt-2 h-4 w-2/3 max-w-md rounded bg-white/10" />
        </div>
      </div>

      <div className="contenedor py-10">
        {/* Barra de filtros y orden. */}
        <div className="flex flex-wrap gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-11 w-32 rounded bg-gris-100" />
          ))}
        </div>

        {/* La grilla. Seis tarjetas: lo que entra en una pantalla de escritorio
            sin scrollear, que es lo único que hace falta cubrir. */}
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
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
