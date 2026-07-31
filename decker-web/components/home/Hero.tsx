import Image from 'next/image';
import heroImage from '@/public/marca/nuevaimagenhero2.png';
import Link from 'next/link';
import BuscadorRapido from '@/components/home/BuscadorRapido';
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
        <Image
          src={heroImage}
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-[60%_center] lg:object-center"
          priority
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
          <h1 className="font-display text-[36px] font-semibold leading-[1.02] tracking-[-0.015em] text-white sm:text-[52px] lg:text-[60px]">
            Elegí tu próxima unidad con respaldo Decker.
          </h1>

          {/* gris-200 y no gris-300: centrado, el texto cae sobre la parte más
              clara de la foto y el gris medio no llega a 4.5:1. */}
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-gris-200 sm:text-[17px]">
            Camiones 0 km y usados seleccionados, semis, bateas y utilitarios. Buscá por tipo,
            marca o agencia.
          </p>

          {/* El buscador es la acción principal, pero las dos salidas de abajo
              no dependen de él: están siempre visibles, sin tener que abrir ni
              completar nada. */}
          <div className="mx-auto mt-9 max-w-xl">
            <BuscadorRapido
              sucursales={sucursales}
              sugerencias={sugerencias}
              valorInicial={busquedaInicial}
            />

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/catalogo"
                className="inline-flex h-12 items-center justify-center rounded bg-white/10 px-6 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 backdrop-blur-sm transition-colors hover:bg-white/20 hover:ring-white/50"
              >
                Explorar unidades
              </Link>
              <Link
                href="/#cotizar"
                className="inline-flex h-12 items-center justify-center rounded bg-white/10 px-6 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 backdrop-blur-sm transition-colors hover:bg-white/20 hover:ring-white/50"
              >
                Parte de pago
              </Link>
            </div>
          </div>

          <p className="mt-8 text-[13px] text-gris-200">
            <span className="dato font-semibold text-white">{totalUnidades}</span> unidades
            publicadas en{' '}
            <span className="dato font-semibold text-white">{sucursales.length}</span> agencias
          </p>
        </div>
      </div>
    </section>
  );
}
