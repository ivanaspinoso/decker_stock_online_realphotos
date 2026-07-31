import Image from 'next/image';
import Link from 'next/link';
import { SUCURSALES } from '@/lib/data/sucursales';
import { linkWhatsapp } from '@/lib/whatsapp';

export default function Footer() {
  const anio = new Date().getFullYear();

  return (
    <footer className="oscuro bg-negro-950 text-gris-400">
      <div className="contenedor grid gap-12 py-16 lg:grid-cols-[1.1fr_0.7fr_1.4fr]">
        <div>
          <Image
            src="/marca/LogoDeckerNegativo.png"
            alt="Decker Camiones"
            width={131}
            height={135}
            className="h-14 w-auto"
          />
          <p className="mt-5 font-display text-2xl font-semibold leading-tight tracking-[-0.01em] text-white">
            Nuestro motor es el trabajo
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-gris-400">
            Camiones 0 km, usados, semis, bateas, utilitarios, autos y camionetas.
          </p>
        </div>

        <nav aria-label="Enlaces del sitio">
          <p className="etiqueta text-gris-400">Sitio</p>
          <ul className="mt-5 space-y-3 text-sm">
            {[
              { href: '/catalogo', texto: 'Stock' },
              { href: '/#destacadas', texto: 'Unidades seleccionadas' },
              { href: '/#financiacion', texto: 'Financiación' },
              { href: '/#cotizar', texto: 'Cotizar usado' },
              { href: '/#agencias', texto: 'Agencias' },
            ].map((enlace) => (
              <li key={enlace.href}>
                <Link href={enlace.href} className="transition-colors hover:text-white">
                  {enlace.texto}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="etiqueta text-gris-400">Agencias</p>
          <ul className="mt-5 grid gap-5 sm:grid-cols-2">
            {SUCURSALES.map((sucursal) => (
              <li key={sucursal.id} className="text-sm">
                <p className="font-semibold text-white">{sucursal.nombre}</p>
                <p className="mt-0.5 text-gris-400">{sucursal.direccion}</p>
                <a
                  href={linkWhatsapp(
                    sucursal.asesor.whatsapp,
                    `Hola Decker, quiero consultar con la agencia de ${sucursal.nombre}.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dato mt-1.5 inline-block text-xs text-amarillo transition-opacity hover:opacity-70"
                >
                  +{sucursal.asesor.whatsapp}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-negro-800">
        <div className="contenedor flex flex-col gap-2 py-6 text-xs text-gris-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {anio} Decker Camiones. Todos los derechos reservados.</p>
          <p className="max-w-xl sm:text-right">
            Precios y disponibilidad orientativos, sujetos a modificación sin previo aviso.
            Las imágenes son ilustrativas.
          </p>
        </div>
      </div>
    </footer>
  );
}
