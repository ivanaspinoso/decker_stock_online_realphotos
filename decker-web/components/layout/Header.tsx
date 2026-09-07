'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconoCerrar, IconoCorazon, IconoMenu, IconoWhatsapp } from '@/components/ui/Iconos';
import { linkConsultaGeneral } from '@/lib/whatsapp';

const ENLACES = [
  { href: '/catalogo', texto: 'Stock' },
  { href: '/#financiacion', texto: 'Financiación' },
  { href: '/#cotizar', texto: 'Cotizar usado' },
  { href: '/#agencias', texto: 'Agencias' },
];

/**
 * Guardadas sale de ENLACES porque no se dibuja igual en los dos lados: en
 * escritorio es un corazón al final de la barra y en el menú mobile sigue
 * siendo una fila de texto como el resto. La ruta queda escrita una sola vez.
 */
const GUARDADAS = { href: '/guardadas', texto: 'Guardadas' };

/** Aire sobre el título al aterrizar: los 80px de la nav más un respiro. */
const AIRE_SOBRE_TITULO = 128;

/**
 * Deja el título de la sección arriba de todo pero despegado de la nav. El
 * salto nativo del ancla alinea el borde de la sección, que arranca con el
 * padding vertical del bloque: se ve una franja vacía en vez del contenido.
 * Devuelve false si el id no existe en la página.
 */
function enfocarSeccion(id: string) {
  const seccion = document.getElementById(id);
  if (!seccion) return false;

  // El encabezado, no la sección: es donde el usuario espera aterrizar. La
  // etiqueta chica va arriba del h2, así que si está es ella la que manda.
  const ancla = seccion.querySelector('.etiqueta, h2') ?? seccion;
  const destino = ancla.getBoundingClientRect().top + window.scrollY - AIRE_SOBRE_TITULO;
  const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.scrollTo({ top: Math.max(0, destino), behavior: suave ? 'smooth' : 'auto' });
  return true;
}

/**
 * Nav sticky.
 *
 * Sobre la home arranca transparente montada sobre el hero y se vuelve sólida
 * al scrollear: el hero gana altura y la navegación no le come una franja
 * negra. En el resto del sitio arranca sólida directamente.
 */
export default function Header() {
  const [abierto, setAbierto] = useState(false);
  const [scrolleado, setScrolleado] = useState(false);
  const pathname = usePathname();
  const sobreHero = pathname === '/';

  useEffect(() => setAbierto(false), [pathname]);

  useEffect(() => {
    const alScrollear = () => setScrolleado(window.scrollY > 24);
    alScrollear();
    window.addEventListener('scroll', alScrollear, { passive: true });
    return () => window.removeEventListener('scroll', alScrollear);
  }, []);

  useEffect(() => {
    document.body.style.overflow = abierto ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [abierto]);

  // Llegada desde otra página (/catalogo → /#agencias) o recarga con hash: el
  // navegador ya hizo su salto al borde de la sección, así que se reubica una
  // vez montado, cuando el layout de la sección ya está medido.
  useEffect(() => {
    if (!sobreHero) return;
    const id = window.location.hash.slice(1);
    if (!id) return;
    const tarea = window.setTimeout(() => enfocarSeccion(id), 0);
    return () => window.clearTimeout(tarea);
  }, [sobreHero, pathname]);

  const alClickEnlace = (evento: MouseEvent<HTMLAnchorElement>, href: string) => {
    setAbierto(false);

    // Sólo los anclas de la home se ubican a mano; el resto navega normal y
    // el efecto de arriba se encarga al aterrizar.
    if (!sobreHero || !href.startsWith('/#')) return;
    if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.button !== 0) return;

    evento.preventDefault();
    // Diferido un tick: con el menú mobile abierto el body está en
    // `overflow: hidden` y el scroll no llegaría a aplicarse.
    window.setTimeout(() => {
      if (enfocarSeccion(href.slice(2))) window.history.replaceState(null, '', href);
    }, 0);
  };

  /**
   * Dos estados distintos, y por eso dos banderas.
   *
   * `solida` es el FONDO: sobre el hero la nav arranca transparente para no
   * comerle una franja negra a la foto; en el resto del sitio arranca opaca
   * desde el primer píxel, porque abajo no hay foto que mostrar.
   *
   * `compacta` es la ALTURA, y depende sólo del scroll. Antes iba atada a
   * `solida`, así que en /catalogo la barra nacía ya achicada a 64px mientras
   * el header seguía reservando 80: esos 16px de diferencia eran la franja gris
   * que aparecía entre la nav y el banner.
   */
  const solida = scrolleado || abierto || !sobreHero;
  const compacta = scrolleado || abierto;
  const enGuardadas = pathname === GUARDADAS.href;

  return (
    /**
     * La nav va MONTADA sobre el contenido en todo el sitio, no sólo sobre el
     * hero: la caja mide 80px y el margen negativo se los devuelve, así que no
     * reserva lugar en el flujo. Cada página se despeja sola con su padding
     * superior.
     *
     * Es lo que permite que la barra de adentro se achique de 80 a 64 sin mover
     * nada: si el header ocupara lugar, esos 16px se los sacaría al contenido de
     * abajo justo mientras el usuario scrollea —el salto de layout que hace que
     * un sitio se sienta armado a las apuradas—.
     */
    <header className="oscuro sticky top-0 z-50 -mb-20 h-20">
      <div
        className={`transition-[height,background-color,border-color] duration-medio ease-suave ${
          compacta ? 'h-16' : 'h-20'
        } ${
          solida
            ? // Al bajar: opaca y con una línea de cierre. La página se siente
              // "en curso" en vez de recién abierta.
              'border-b border-white/10 bg-negro-950/95 backdrop-blur-md'
            : // Transparente NO es sin fondo: sobre el hero la nav cae encima del
              // cielo claro de la foto y el texto blanco se pierde. Un degradé
              // corto desde arriba le devuelve el contraste sin tapar la imagen.
              'border-b border-transparent '
        }`}
      >
        <div className="contenedor flex h-full items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3" aria-label="Decker Camiones — Inicio">
            <Image
              src="/marca/LogoDeckerNegativo.png"
              alt=""
              width={131}
              height={135}
              className={`w-auto transition-[height] duration-medio ease-suave ${
                compacta ? 'h-10' : 'h-14'
              }`}
              /* El logo entra en la primera pantalla pero no es el LCP: `eager` lo
                 saca de la carga diferida sin ocupar un preload del head, que es
                 para la foto grande de cada página. */
              loading="eager"
            />
            {/* Una línea, no dos: el logo ya es un bloque alto y apilar "Stock /
                online" al lado creaba un segundo bloque que competía con él.
                gris-400 y no gris-500 para pasar 4.5:1 sobre el negro. */}
           
          </Link>

          {/* Enlaces en blanco y semibold, no en gris: sobre el hero compiten con
              una foto, y el gris medio se diluye contra el cielo. */}
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
            {ENLACES.map((enlace) => (
              <Link
                key={enlace.href}
                href={enlace.href}
                onClick={(evento) => alClickEnlace(evento, enlace.href)}
                className="rounded-sm px-3.5 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white"
              >
                {enlace.texto}
              </Link>
            ))}

            <a
              href={linkConsultaGeneral()}
              target="_blank"
              rel="noopener noreferrer"
              className="centrado-optico ml-4 inline-flex h-11 items-center gap-2 rounded bg-rojo px-6 text-sm font-medium text-white shadow-[0_2px_12px_rgba(214,0,28,.45)] transition-colors hover:bg-rojo-700"
            >
              <IconoWhatsapp className="h-4 w-4" />
              Consultar
            </a>

            {/* Guardadas, ÚLTIMO de todo y contra el borde derecho de la barra.
                Es un ícono y no la palabra porque no es una sección del sitio:
                es el estado de quien mira —lo que se fue guardando—, y ese
                acceso se reconoce antes por la forma que por el rótulo.

                Sin caja ni anillo: al lado del botón rojo, un segundo bloque
                sólido pelearía por el mismo lugar en la jerarquía. Le queda el
                hover de los enlaces de texto, así que se sigue leyendo como
                parte de la nav.

                44px de lado: es un blanco táctil entero aunque el dibujo mida
                20, que es lo que pide un ícono suelto sin etiqueta al lado. */}
            <Link
              href={GUARDADAS.href}
              aria-label={GUARDADAS.texto}
              title={GUARDADAS.texto}
              aria-current={enGuardadas ? 'page' : undefined}
              /* Destino del vuelo que sale del corazón de cada tarjeta. Ver
                 `lib/vuelo.ts`: el atributo es todo el acoplamiento que hay
                 entre las dos puntas. */
              data-destino="favoritos"
              className={`ml-2 inline-flex h-11 w-11 items-center justify-center rounded-sm transition-colors hover:bg-white/10 hover:text-white ${
                enGuardadas ? 'text-white' : 'text-white/90'
              }`}
            >
              {/* Relleno cuando ya estás en la página: es el mismo lenguaje que
                  el corazón de la tarjeta —vacío es "podés", lleno es "ya"—. */}
              <IconoCorazon relleno={enGuardadas} className="h-5 w-5" />
            </Link>
          </nav>

          <div className="flex items-center gap-2 lg:hidden">
            {/* El corazón también vive en la barra de teléfono, no sólo dentro
                del menú desplegado. Dos razones, y la segunda manda: es el
                acceso a lo guardado sin abrir nada, y es el DESTINO visible que
                necesita el vuelo del corazón de la tarjeta. Metido en el menú
                cerrado no se puede señalar, y en mobile —que es donde va a
                estar el grueso del tráfico— el feedback caería siempre al
                cartel de respaldo.

                Sin caja ni anillo, al revés que el botón de menú: son dos
                controles pegados y sólo uno abre algo. */}
            <Link
              href={GUARDADAS.href}
              aria-label={GUARDADAS.texto}
              title={GUARDADAS.texto}
              aria-current={enGuardadas ? 'page' : undefined}
              data-destino="favoritos"
              className={`inline-flex h-11 w-11 items-center justify-center rounded-sm transition-colors hover:bg-white/10 ${
                enGuardadas ? 'text-white' : 'text-white/90'
              }`}
            >
              <IconoCorazon relleno={enGuardadas} className="h-5 w-5" />
            </Link>

            <button
              type="button"
              onClick={() => setAbierto((v) => !v)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-sm bg-white/10 text-white ring-1 ring-inset ring-white/25 transition-colors hover:bg-white/20"
              aria-expanded={abierto}
              aria-controls="menu-mobile"
              aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
            >
              {abierto ? <IconoCerrar className="h-5 w-5" /> : <IconoMenu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {abierto && (
        <div
          id="menu-mobile"
          className="animate-aparecer border-t border-negro-800 bg-negro-950 lg:hidden"
        >
          <nav className="contenedor flex flex-col py-3" aria-label="Principal (mobile)">
            {ENLACES.map((enlace) => (
              <Link
                key={enlace.href}
                href={enlace.href}
                onClick={(evento) => alClickEnlace(evento, enlace.href)}
                className="border-b border-negro-800 py-4 text-md font-medium text-white"
              >
                {enlace.texto}
              </Link>
            ))}

            {/* En el menú desplegado el corazón solo no aporta: la lista es de
                texto y una fila con un dibujo suelto se lee como un error. Acá
                el ícono ACOMPAÑA a la palabra, y va último, que es el orden que
                tiene en la barra de escritorio. */}
            <Link
              href={GUARDADAS.href}
              aria-current={enGuardadas ? 'page' : undefined}
              className="flex items-center gap-3 border-b border-negro-800 py-4 text-md font-medium text-white"
            >
              <IconoCorazon relleno={enGuardadas} className="h-5 w-5 shrink-0" />
              {GUARDADAS.texto}
            </Link>

            <a
              href={linkConsultaGeneral()}
              target="_blank"
              rel="noopener noreferrer"
              className="centrado-optico mt-5 inline-flex h-12 items-center justify-center gap-2 rounded bg-rojo text-sm font-medium text-white"
            >
              <IconoWhatsapp className="h-4 w-4" />
              Consultar por WhatsApp
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
