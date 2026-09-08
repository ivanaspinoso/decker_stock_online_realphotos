import Image from 'next/image';
import heroImage from '@/public/marca/camiones.png';
import Link from 'next/link';
import BuscadorRapido from '@/components/home/BuscadorRapido';
import NumeroAnimado from '@/components/ui/NumeroAnimado';
import type { Sucursal, SugerenciaUnidad } from '@/lib/types';

/**
 * Hero.
 *
 * Ocupa una pantalla exacta y se divide en dos columnas: el texto a la
 * izquierda y el buscador en una tarjeta a la derecha. El buscador vive DENTRO
 * del hero, no montado sobre el corte de abajo: es la acción principal de la
 * página y tiene que entrar en la primera pantalla, sin scroll.
 *
 * Lo que se sacó y por qué:
 * - La etiqueta de arriba repetía lo que ya dice el subtítulo.
 * - El botón "Explorar unidades" competía con el submit del buscador; ahora es
 *   un enlace secundario, para que haya un solo botón rojo en pantalla.
 * - De la fila de indicadores quedó lo que es un dato verificable (unidades y
 *   agencias); "360° asesoramiento" y la lista de modelos eran texto de relleno.
 *
 * La foto ocupa el fondo completo con un velo oscuro sólido del lado del texto:
 * da presencia sin que el contraste dependa de qué hay en la imagen.
 *
 * Texto tomado del sitio original de Decker.
 */
export default function Hero({
  sucursales,
  sugerencias,
  totalUnidades,
  busquedaInicial,
}: {
  sucursales: Sucursal[];
  sugerencias: SugerenciaUnidad[];
  totalUnidades: number;
  busquedaInicial?: string;
}) {
  return (
    // Una pantalla exacta. `svh` y no `vh`: en mobile la barra del navegador no
    // recorta la banda del buscador. Es `min-h` y no `h` para que en pantallas
    // muy bajas el hero crezca en vez de cortar contenido.
    <section className="oscuro relative flex min-h-svh flex-col overflow-hidden bg-negro-950">
      <div className="absolute inset-0">
        {/* Con el contenido centrado, el camión va al centro: es lo que queda
            detrás del titular y lo que sostiene la composición. */}
        {/* `placeholder="blur"`: es la imagen LCP de la home y pesa ~1,7 MB.
            Mientras baja, el visitante ve la miniatura difusa en vez del negro
            plano, y el velo de abajo ya apoya sobre algo. El blur lo genera el
            build a partir del import estático: no agrega pedidos de red.

            `preload` y no `priority`: desde Next 16 `priority` está deprecado y
            esta es la única candidata a LCP de la home, que es justo el caso
            en el que el <link> en el head vale la pena. */}
        <Image
          src={heroImage}
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-[60%_center] lg:object-center"
          placeholder="blur"
          preload
        />
        {/* El texto ya no vive en una banda lateral: cruza el centro de la foto,
            así que el velo tiene que ser parejo y no direccional. Va un plano
            que garantiza el contraste en cualquier punto, más un vertical que
            oscurece arriba —donde apoya la nav— y abajo, y deja la franja del
            medio un poco más abierta para que el camión se siga leyendo.

            Los porcentajes van en múltiplos de 5 y las opacidades en la escala
            de Tailwind: un `to-78%` o un `/78` no se generan y el velo
            desaparece sin avisar. */}
        <div className="absolute inset-0 bg-negro-950/70" />
        <div className="absolute inset-0 bg-gradient-to-b from-negro-950/50 via-transparent via-45% to-negro-950/50" />
      </div>

      {/* Una sola columna centrada: titular, bajada, buscador y salidas, en ese
          orden de lectura. El padding superior compensa la nav, que va montada
          encima y mide 80px. */}
      <div className="contenedor relative flex flex-1 items-center pb-12 pt-28 sm:pt-32">
        <div className="mx-auto w-full max-w-3xl text-center">
          {/* La frase de marca ES el titular, y no un renglón en el pie.

              Antes acá decía "Elegí tu próxima unidad con respaldo Decker" —una
              promesa correcta pero de nadie— y "Nuestro motor es el trabajo"
              vivía a cuatro mil píxeles de scroll, arriba del footer. Mantener
              una frase de marca no es guardarla: es ponerla donde se lee
              primero. La promesa no se perdió, bajó a la línea de abajo, que es
              donde tiene que estar lo que explica.

              Sin el "Decker Camiones," de adelante: el logo está sesenta píxeles
              más arriba, en la barra. Es la misma construcción que ya usa el pie
              —logo, y debajo la frase—, y repetir el nombre tan cerca de la
              marca lo gasta en vez de reforzarlo.

              Tres escalones de la escala y no tres tamaños inventados: 32 en
              teléfono, 40 en tablet, 52 en monitor. La caja alta, el peso y el
              tracking los pone `titulo-expresivo`. */}
          <h1 className="titulo-expresivo text-3xl text-white sm:text-4xl lg:text-5xl">
            NUESTRO MOTOR ES EL TRABAJO
          </h1>

          {/* gris-200 y no gris-300: centrado, el texto cae sobre la parte más
              clara de la foto y el gris medio no llega a 4.5:1. */}
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-gris-200 sm:text-md">
            Elegí tu
            próxima unidad con respaldo Decker.
          </p>

          {/* El buscador es la acción principal, pero las dos salidas de abajo
              no dependen de él: están siempre visibles, sin tener que abrir ni
              completar nada. */}
          <div className="mx-auto mt-8 max-w-xl">
            <BuscadorRapido
              sucursales={sucursales}
              sugerencias={sugerencias}
              valorInicial={busquedaInicial}
            />

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/catalogo"
                className="centrado-optico inline-flex h-12 items-center justify-center rounded bg-white/10 px-6 text-sm font-medium text-white ring-1 ring-inset ring-white/25 backdrop-blur-sm transition-colors duration-rapido hover:bg-white/20 hover:ring-white/50"
              >
                Explorar unidades
              </Link>
              <Link
                href="/#cotizar"
                className="centrado-optico inline-flex h-12 items-center justify-center rounded bg-white/10 px-6 text-sm font-medium text-white ring-1 ring-inset ring-white/25 backdrop-blur-sm transition-colors duration-rapido hover:bg-white/20 hover:ring-white/50"
              >
                Parte de pago
              </Link>
            </div>
          </div>

          {/**
           * Las dos cifras del stock. Antes eran dos números embebidos en una
           * oración de 13px: información verdadera con formato de nota al pie.
           *
           * Ahora son el dato y su rótulo, con el peso repartido al revés que en
           * el titular —el número manda, el rótulo lo nombra en chico—. Es el
           * único lugar de la home donde un número cuenta al entrar en pantalla:
           * es lo último que se lee del hero y lo que responde "¿tienen stock?".
           */}
         {/* <dl className="mt-8 flex items-center justify-center gap-6 sm:gap-8">
            <div>
              <dd className="dato text-xl font-medium text-white">
                <NumeroAnimado valor={totalUnidades} formato="miles" desdeViewport />
              </dd>
              <dt className="rotulo-dato mt-1 text-gris-300">Unidades publicadas</dt>
            </div>

            <span aria-hidden="true" className="h-8 w-px bg-white/20" />

            <div>
              <dd className="dato text-xl font-medium text-white">
                <NumeroAnimado valor={sucursales.length} desdeViewport />
              </dd>
              <dt className="rotulo-dato mt-1 text-gris-300">Agencias</dt>
            </div>
          </dl> */}
        </div>
      </div>
    </section>
  );
}
