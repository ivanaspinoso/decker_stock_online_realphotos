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
        {/* El fondo es el video en loop, no la foto del camión.

            Va como <video> nativo y no por next/image —Next no optimiza video—,
            así que sale tal cual está en /public y el peso es responsabilidad
            nuestra: el archivo se recomprimió de 8,9 MB a 2,2 MB (h264 CRF 28)
            y se le sacó la pista de audio, que pesaba 128 kbps y no se oía
            nunca porque el autoplay obliga a `muted`. Lleva `+faststart`: el
            índice va al principio y el navegador arranca mientras baja, en vez
            de esperar el archivo entero.

            Los tres atributos no son decorativos, son los que hacen que
            arranque solo: `muted` + `playsInline` es lo único que los
            navegadores móviles aceptan para autoplay (sin `playsInline`, iOS lo
            abre a pantalla completa), `loop` lo encadena y `autoPlay` lo
            dispara.

            La foto queda abajo, de piso, y NO como `poster`: el atributo toma
            la ruta cruda de /public y bajaría el PNG entero —1,7 MB— salteando
            el optimizado de next/image. Con el <Image> debajo, el navegador
            baja la versión chica en formato moderno y muestra su blur mientras
            llega; el video la tapa cuando tiene cuadros. Sigue siendo la
            candidata a LCP de la home, así que conserva su `preload`.

            `aria-hidden` y sin controles: es fondo, no contenido. */}
        <Image
          src={heroImage}
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-[80%_center] lg:object-center"
          placeholder="blur"
          preload
        />
        {/* El recorte horizontal es el problema entero del fondo en teléfono.
            El cuadro es 16:9 y la pantalla es 9:19,5: `object-cover` escala por
            altura y de los 1280 px de ancho quedan visibles 390, o sea el 26%.
            Elegir mal ese 26% es lo que hacía que el hero fuera pasto y asfalto.

            El camión no está quieto: se aleja, y su centro corre del 58% al 82%
            del cuadro entre el primer segundo y el último. Por eso el 80% no es
            "más a la derecha" a ojo, es el valor que deja la ventana en 59-85 y
            atrapa la unidad en TODO el clip y no solo en el cuadro que uno mira
            cuando lo elige. Con el 60% que había —heredado del encuadre de la
            foto, que era otra imagen— la ventana caía en 44-70: pasto, ruta, y
            el camión entero afuera.

            De `lg` para arriba no hace falta: ahí entra casi el cuadro completo
            y el centro es el encuadre del camarógrafo, que siempre gana. */}
        <video
          className="absolute inset-0 h-full w-full object-cover object-[80%_center] lg:object-center"
          src="/marca/videohero.mp4"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
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
              teléfono, 40 en tablet, 52 en monitor. La caja alta viene del texto
              y el tracking lo pone `titulo-expresivo`.

              `font-medium` pisa el 900 que trae `titulo-expresivo`, y solo acá.
              El 900 se dibujó para sostener el titular sobre fondo
              plano; sobre el video, con el velo oscuro debajo, la letra ya tiene
              todo el contraste que necesita y el peso alto queda de más. En 500
              la caja alta se lee más abierta y el trazo fino la vuelve un rótulo
              en vez de un grito.

              Es un override local a propósito: los títulos de sección siguen en
              900 y el sistema no se toca. Overpass es variable, así que cualquier
              peso sale del mismo archivo: cambiar 500 por 300 o 700 no agrega ni
              un byte de descarga. */}
          <h1 className="titulo-expresivo text-3xl font-medium text-white sm:text-4xl lg:text-5xl">
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
