'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconoCerrar, IconoMenu, IconoWhatsapp } from '@/components/ui/Iconos';
import { linkConsultaGeneral } from '@/lib/whatsapp';

const ENLACES = [
  { href: '/catalogo', texto: 'Stock' },
  { href: '/#financiacion', texto: 'Financiación' },
  { href: '/#cotizar', texto: 'Cotizar usado' },
  { href: '/#agencias', texto: 'Agencias' },
];

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

  const solida = scrolleado || abierto || !sobreHero;

  return (
    <header
      className={`oscuro sticky top-0 z-50 transition-colors duration-300 ease-suave ${
        solida
          ? 'bg-negro-950/95 backdrop-blur-md'
          : // Transparente NO es sin fondo: sobre el hero la nav cae encima del
            // cielo claro de la foto y el texto blanco se pierde. Un degradé
            // corto desde arriba le devuelve el contraste sin tapar la imagen.
            'bg-gradient-to-b from-negro-950/85 via-negro-950/45 to-transparent'
      } ${sobreHero ? '-mb-20' : ''}`}
    >
      <div className="contenedor flex h-20 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3" aria-label="Decker Camiones — Inicio">
          <Image
            src="/marca/LogoDeckerNegativo.png"
            alt=""
            width={131}
            height={135}
            className="h-14 w-auto"
            priority
          />
          {/* Una línea, no dos: el logo ya es un bloque alto y apilar "Stock /
              online" al lado creaba un segundo bloque que competía con él.
              gris-400 y no gris-500 para pasar 4.5:1 sobre el negro. */}
          <span className="hidden border-l border-white/15 pl-3 text-[10px] font-semibold uppercase leading-none tracking-[0.16em] text-gris-400 sm:block">
            Stock online
          </span>
        </Link>

        {/* Enlaces en blanco y semibold, no en gris: sobre el hero compiten con
            una foto, y el gris medio se diluye contra el cielo. */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
          {ENLACES.map((enlace) => (
            <Link
              key={enlace.href}
              href={enlace.href}
              className="rounded-sm px-3.5 py-2 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10 hover:text-white"
            >
              {enlace.texto}
            </Link>
          ))}
          <a
            href={linkConsultaGeneral()}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-4 inline-flex h-11 items-center gap-2 rounded bg-rojo px-6 text-sm font-semibold text-white shadow-[0_2px_12px_rgba(214,0,28,.45)] transition-colors hover:bg-rojo-700"
          >
            <IconoWhatsapp className="h-4 w-4" />
            Consultar
          </a>
        </nav>

        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-sm bg-white/10 text-white ring-1 ring-inset ring-white/25 transition-colors hover:bg-white/20 lg:hidden"
          aria-expanded={abierto}
          aria-controls="menu-mobile"
          aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
        >
          {abierto ? <IconoCerrar className="h-5 w-5" /> : <IconoMenu className="h-5 w-5" />}
        </button>
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
                onClick={() => setAbierto(false)}
                className="border-b border-negro-800 py-4 text-[17px] font-semibold text-white"
              >
                {enlace.texto}
              </Link>
            ))}
            <a
              href={linkConsultaGeneral()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded bg-rojo text-sm font-semibold text-white"
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
