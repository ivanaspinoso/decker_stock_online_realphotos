'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import EstadoBadge from '@/components/ui/EstadoBadge';
import FotoUnidad from '@/components/unidades/FotoUnidad';
import { IconoAmpliar, IconoCerrar, IconoFlecha } from '@/components/ui/Iconos';
import type { EstadoUnidad } from '@/lib/types';

/**
 * Galería de la ficha. Foto grande + miniaturas + vista a pantalla completa.
 *
 * Las miniaturas son botones reales (no divs con onClick) para que funcionen
 * con teclado y anuncien cuál está activa.
 *
 * La foto grande usa el mismo encuadre 4:3 de la tarjeta del catálogo: al
 * abrir una unidad, la imagen crece pero no se re-recorta. Es la misma foto,
 * más grande, y eso es lo que hace que el paso de un lado al otro no se sienta
 * como dos sitios distintos.
 *
 * AMPLIAR NO ES UN LUJO ACÁ. En un usado la foto es el dato: el estado de la
 * chapa, de las cubiertas, de la cabina y del chasis no se escriben en una
 * tabla, se miran. Dentro del 4:3 de la ficha la unidad entra recortada y
 * chica; a pantalla completa se ve entera y sin recorte, que es lo único que
 * permite mirar de verdad lo que se está por comprar.
 */
export default function GaleriaUnidad({
  fotos,
  nombre,
  estado,
}: {
  fotos: string[];
  nombre: string;
  estado: EstadoUnidad;
}) {
  const [activa, setActiva] = useState(0);
  const [ampliada, setAmpliada] = useState(false);
  const disparador = useRef<HTMLButtonElement>(null);
  const ventana = useRef<HTMLDivElement>(null);

  /**
   * Cuándo se abrió, para ignorar el "click fantasma" del toque que la abrió.
   *
   * ES EL BUG POR EL QUE ESTO NO ANDABA EN EL TELÉFONO, y sólo ahí.
   *
   * Un navegador táctil, después de un toque, sintetiza un `click` y lo
   * entrega a lo que haya quedado DEBAJO DEL DEDO en ese momento. Para
   * entonces la ventana ya se montó, y debajo del dedo —en el medio de la
   * pantalla— está el fondo de la foto, que cierra al tocarlo. Resultado: el
   * mismo toque abría y cerraba, y desde afuera parecía que el botón no hacía
   * nada.
   *
   * Con mouse no pasa: `mousedown`, `mouseup` y `click` salen del mismo
   * elemento antes de que React pinte nada. Por eso pasaba todas las pruebas
   * de escritorio.
   *
   * 350ms alcanzan para tapar el click sintetizado —llega a los ~300ms como
   * mucho— y son menos de lo que tarda una persona en decidir cerrar.
   */
  const abiertaDesde = useRef(0);

  const abrir = () => {
    abiertaDesde.current = Date.now();
    setAmpliada(true);
  };

  /** Cierra sólo si el click no es el fantasma del toque que abrió. */
  const cerrarSiNoEsFantasma = () => {
    if (Date.now() - abiertaDesde.current < 350) return;
    setAmpliada(false);
  };

  const hayVarias = fotos.length > 1;

  /* Dan la vuelta: de la última se pasa a la primera. En una galería de tres
     fotos, toparse con un botón muerto al final es peor que volver al inicio. */
  const siguiente = useCallback(
    () => setActiva((i) => (i + 1) % fotos.length),
    [fotos.length],
  );
  const anterior = useCallback(
    () => setActiva((i) => (i - 1 + fotos.length) % fotos.length),
    [fotos.length],
  );

  useEffect(() => {
    if (!ampliada) return;

    // La página de atrás no scrollea mientras la foto está abierta.
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ventana.current?.focus();

    /* Las flechas mueven la foto y Escape cierra: es lo que hace cualquiera
       que abrió una imagen a pantalla completa alguna vez, y sin eso hay que
       ir a buscar los botones con el mouse. */
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAmpliada(false);
      if (!hayVarias) return;
      if (evento.key === 'ArrowRight') siguiente();
      if (evento.key === 'ArrowLeft') anterior();
    };
    document.addEventListener('keydown', alTeclear);

    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = overflowPrevio;
      // Al cerrar, el foco vuelve a la foto que se tocó para abrir.
      disparador.current?.focus();
    };
  }, [ampliada, hayVarias, siguiente, anterior]);

  /**
   * Arrastre lateral para cambiar de foto en el teléfono.
   *
   * Es el gesto que la gente prueba primero con una foto abierta, antes que
   * buscar una flecha. Los 50px de umbral evitan que un scroll torcido o un
   * toque con el pulgar apoyado cambien la imagen sin querer.
   */
  const inicioX = useRef<number | null>(null);

  const alSoltar = (evento: React.TouchEvent) => {
    if (inicioX.current === null || !hayVarias) return;
    const recorrido = evento.changedTouches[0].clientX - inicioX.current;
    if (Math.abs(recorrido) > 50) (recorrido < 0 ? siguiente : anterior)();
    inicioX.current = null;
  };

  return (
    <div>
      {/**
       * La foto grande es un BOTÓN, no una imagen suelta.
       *
       * Que sea un botón de verdad es lo que la vuelve alcanzable con el
       * teclado y lo que le da nombre para un lector de pantalla. Y el ícono de
       * ampliar está SIEMPRE dibujado, no sólo al pasar el mouse: en un
       * teléfono no hay hover, y una foto que se abre pero no lo anuncia es una
       * función que existe para el que ya sabe que está.
       */}
      <button
        ref={disparador}
        type="button"
        onClick={abrir}
        aria-label={`Ampliar foto ${activa + 1} de ${fotos.length} de ${nombre}`}
        className="group relative block w-full cursor-zoom-in rounded-lg"
      >
        {/* `key`: al cambiar de foto el bloque se rearma y corre el fundido de
            entrada. 180ms, apenas un pestañeo: es un acuse de que la miniatura
            respondió, no una transición de presentación. */}
        <FotoUnidad
          key={activa}
          src={fotos[activa]}
          alt={`${nombre} — foto ${activa + 1} de ${fotos.length}`}
          sizes="(max-width: 1024px) 100vw, 60vw"
          preload={activa === 0}
          className="animate-aparecer rounded-lg"
        >
          <div className="velo-foto" />
          <div className="absolute left-4 top-4">
            <EstadoBadge estado={estado} />
          </div>

          {/* Arriba a la derecha, sobre el velo. Crece un poco con el cursor
              —la única parte de hover, y es decoración: el ícono ya está. */}
          <span
            aria-hidden="true"
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-sm bg-negro/70 text-white backdrop-blur-sm transition-transform duration-rapido ease-suave group-hover:scale-110"
          >
            <IconoAmpliar className="h-4 w-4" />
          </span>

          {hayVarias && (
            // Sobre el velo: dice en qué foto está parado sin depender de que
            // las miniaturas entren en pantalla.
            <span className="centrado-optico dato absolute bottom-4 right-4 inline-flex h-5 items-center rounded-sm bg-negro/70 px-2 text-2xs font-medium text-white backdrop-blur-sm">
              {activa + 1} / {fotos.length}
            </span>
          )}
        </FotoUnidad>
      </button>

      {hayVarias && (
        <div className="mt-3 grid grid-cols-3 gap-3" role="group" aria-label="Fotos de la unidad">
          {fotos.map((foto, indice) => (
            <button
              key={`${foto}-${indice}`}
              type="button"
              onClick={() => setActiva(indice)}
              aria-label={`Ver foto ${indice + 1}`}
              aria-pressed={indice === activa}
              /* El estado activo es un anillo, no un cambio de opacidad: en el
                 teléfono no hay hover que lo confirme, así que la miniatura
                 elegida tiene que verse elegida sola.

                 El anillo es NEGRO y no rojo. El rojo es el color del foco en
                 todo el sitio: si la miniatura activa lo usara, la foto que se
                 está viendo y la que el teclado tiene marcada se dibujarían
                 igual. El negro es lo que el sistema ya usa para "esta es la
                 opción puesta". */
              className={`relative rounded-md transition-opacity duration-rapido ease-suave ${
                indice === activa
                  ? 'ring-2 ring-negro ring-offset-2'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              <FotoUnidad src={foto} alt="" sizes="180px" className="rounded-md" />
            </button>
          ))}
        </div>
      )}

      <p className="rotulo-dato mt-3">Imágenes ilustrativas</p>

      {ampliada &&
        createPortal(
          /**
           * La foto a pantalla completa.
           *
           * Fondo negro casi opaco y `object-contain`: acá la foto se ve
           * ENTERA, sin el recorte 4:3 de la ficha. Es el único lugar del sitio
           * donde la imagen manda sobre la caja y no al revés —recortarla otra
           * vez sería no haberla abierto—.
           *
           * `dvh` y no `vh`: en el teléfono, `vh` mide la pantalla con la barra
           * del navegador escondida, así que la foto y sus controles se salían
           * por abajo. Es el mismo criterio que las otras ventanas del sitio.
           */
          <div
            ref={ventana}
            role="dialog"
            aria-modal="true"
            aria-label={`${nombre} — foto ${activa + 1} de ${fotos.length}`}
            tabIndex={-1}
            onTouchStart={(evento) => {
              inicioX.current = evento.touches[0].clientX;
            }}
            onTouchEnd={alSoltar}
            /* Negro OPACO, sin transparencia.
               Arrancó en `/97` —que ni siquiera está en la escala de Tailwind y
               por lo tanto no se generaba— y después en `/95`, y con los dos se
               seguía leyendo la página por detrás de la foto. No es sólo
               prolijidad: acá se viene a mirar el estado de la chapa y de las
               cubiertas, y cualquier cosa que se transparente atrás compite con
               eso. El negro pleno es además lo que usa cualquier visor de fotos
               por la misma razón. */
            className="animate-velo fixed inset-0 z-[80] flex h-[100dvh] flex-col bg-negro-950 outline-none"
          >
            {/* Barra de arriba: qué foto es y cómo salir. Sobre negro, así que
                lleva `oscuro` —el foco del teclado va en amarillo—. */}
            <div className="oscuro flex shrink-0 items-center justify-between gap-4 px-4 py-3">
              <p className="dato text-sm font-medium text-white">
                {activa + 1} / {fotos.length}
                <span className="ml-3 font-normal text-gris-400">{nombre}</span>
              </p>
              <button
                type="button"
                /* También protegida: el ícono de ampliar está arriba a la
                   derecha de la foto y la X queda casi en el mismo punto, así
                   que el click fantasma del toque que abrió puede caer justo
                   acá. */
                onClick={cerrarSiNoEsFantasma}
                aria-label="Cerrar la foto"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-gris-300 transition-colors duration-rapido hover:bg-white/10 hover:text-white"
              >
                <IconoCerrar className="h-5 w-5" />
              </button>
            </div>

            {/* El velo también cierra: tocar fuera de la foto es la salida que
                todo el mundo prueba. El `contain` deja franjas negras a los
                lados, y esas franjas son "fuera".

                Va por `cerrarSiNoEsFantasma` y no directo: es justo el punto
                donde caía el click sintetizado del toque que abría la ventana
                —ver el comentario de `abiertaDesde` arriba—. */}
            <div
              className="relative min-h-0 flex-1"
              onClick={cerrarSiNoEsFantasma}
            >
              <Image
                key={activa}
                src={fotos[activa]}
                alt={`${nombre} — foto ${activa + 1} de ${fotos.length}`}
                fill
                sizes="100vw"
                className="animate-aparecer object-contain"
                // La imagen la tocás para verla, no para cerrar.
                onClick={(evento) => evento.stopPropagation()}
              />
            </div>

            {hayVarias && (
              <div className="oscuro flex shrink-0 items-center justify-center gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                {/* Los dos controles miden 48px y van al centro, al alcance del
                    pulgar. En el teléfono además se puede arrastrar la foto. */}
                <button
                  type="button"
                  onClick={anterior}
                  aria-label="Foto anterior"
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors duration-rapido hover:bg-white/20"
                >
                  <IconoFlecha className="h-5 w-5 rotate-180" />
                </button>

                {/* Puntos: dicen cuántas hay y en cuál está, sin leer el
                    número. En una galería de tres es más rápido que la cifra. */}
                <ul className="flex items-center gap-2" aria-hidden="true">
                  {fotos.map((foto, indice) => (
                    <li
                      key={`punto-${foto}-${indice}`}
                      className={`h-1.5 rounded-full transition-all duration-medio ease-suave ${
                        indice === activa ? 'w-6 bg-white' : 'w-1.5 bg-white/35'
                      }`}
                    />
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={siguiente}
                  aria-label="Foto siguiente"
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors duration-rapido hover:bg-white/20"
                >
                  <IconoFlecha className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
