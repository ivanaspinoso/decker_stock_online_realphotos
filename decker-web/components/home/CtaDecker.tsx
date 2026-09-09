import Image from 'next/image';
import Link from 'next/link';
import bannerImage from '@/public/marca/banner.jpg';
import { IconoWhatsapp } from '@/components/ui/Iconos';
import { linkConsultaGeneral } from '@/lib/whatsapp';

/**
 * Cierre de marca con las dos salidas generales: hablar con un asesor o ver el
 * stock completo.
 *
 * Va DESPUÉS de las destacadas, no arriba del footer: es el momento en que el
 * visitante ya miró unidades y necesita un próximo paso, y de paso corta la
 * corrida de secciones claras que sigue (compra segura, financiación, cotizar,
 * agencias).
 *
 * La aérea del patio va de fondo, revelada del lado derecho. El texto y los
 * botones se quedan en la mitad izquierda, sobre negro casi sólido: es la única
 * forma de usarla de fondo sin que el velo necesario para leer encima la deje
 * irreconocible —la toma tiene techos de camión blancos, que son lo más claro
 * de toda la página—.
 */
export default function CtaDecker() {
  return (
    <section className="oscuro relative overflow-hidden bg-negro-950">
      {/* La foto NO se fue: queda de piso abajo del video.

          Es el fallback real, y no un `poster`. Un `poster` toma la ruta cruda
          de /public y serviría el JPG entero —826 KB— salteándose el optimizado
          de next/image; así el navegador baja la versión chica y en el formato
          moderno, con su blur mientras llega. El video pinta encima cuando
          tiene cuadros, y si no llega a reproducirse —datos ahorrados, códec
          rechazado, el usuario que pide menos movimiento— abajo queda la foto
          que había, no un rectángulo negro.

          Sin `preload`: esta sección vive bien abajo del scroll y no puede
          pelearle el ancho de banda al video del hero, que sí es lo primero que
          se ve. Los navegadores ya difieren la carga de un autoplay que está
          fuera de pantalla. */}
      <Image
        src={bannerImage}
        alt=""
        fill
        sizes="100vw"
        className="object-cover object-center"
        placeholder="blur"
      />

      {/* Cenital de patio, en loop y muda. El encuadre es parejo —no hay un
          sujeto que perder en el recorte, como sí pasa en el hero— así que va
          centrada en todos los tamaños.

          `muted` + `playsInline` son los que habilitan el autoplay en mobile;
          `aria-hidden` porque es fondo, no contenido. */}
      <video
        className="absolute inset-0 h-full w-full object-cover object-center"
        src="/marca/video2.mp4"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
      />

      {/* Desktop: direccional, opaco bajo el texto y abierto sobre el patio.
          Mobile: plano, porque ahí el texto cruza todo el ancho. */}
      <div className="absolute inset-0 hidden bg-gradient-to-r from-negro-950 from-35% via-negro-950/85 via-60% to-negro-950/25 lg:block" />
      <div className="absolute inset-0 bg-negro-950/85 lg:hidden" />

      <div className="contenedor relative py-16 sm:py-20">
        <div className="max-w-2xl">
          <p className="etiqueta text-amarillo">Decker Camiones</p>
          <h2 className="mt-3 font-display text-3xl font-extrabold leading-[1.05] tracking-[-0.01em] text-white sm:text-4xl">
            Stock, financiación y asesoramiento en un solo lugar.
          </h2>
          <p className="mt-4 text-base text-gris-200">
            Camiones 0 km y usados seleccionados, semis, bateas y utilitarios. 
          </p>

          {/* Los botones bajan al bloque de texto: a la derecha quedaban sobre
              la foto, y el botón de contorno blanco ahí no se lee. */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={linkConsultaGeneral()}
              target="_blank"
              rel="noopener noreferrer"
              className="centrado-optico inline-flex h-[52px] items-center justify-center gap-2.5 rounded bg-rojo px-7 text-base font-medium text-white transition-colors hover:bg-rojo-700"
            >
              <IconoWhatsapp className="h-5 w-5" />
              Hablar con un asesor
            </a>
            <Link
              href="/catalogo"
              className="centrado-optico inline-flex h-[52px] items-center justify-center rounded px-7 text-base font-medium text-white ring-1 ring-inset ring-white/25 transition-colors hover:bg-white/10 hover:ring-white/50"
            >
              Ver stock
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
