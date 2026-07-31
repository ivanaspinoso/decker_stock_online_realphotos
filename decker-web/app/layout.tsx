import type { Metadata, Viewport } from 'next';
import { Oswald, Inter, IBM_Plex_Mono } from 'next/font/google';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import './globals.css';

/**
 * Tres familias, tres funciones:
 * - Oswald: títulos. Condensada, industrial.
 * - Inter: texto de lectura.
 * - IBM Plex Mono: TODO dato técnico (precios, km, años, tasas). Le da lenguaje
 *   de ficha técnica a los números; no es decoración.
 */
const display = Oswald({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

/** Título y descripción tomados del sitio original de Decker. */
export const metadata: Metadata = {
  title: {
    default: 'Decker Stock Online | Camiones, semis y utilitarios',
    template: '%s | Decker Camiones',
  },
  description:
    'Encontrá camiones 0 km, usados, semis, bateas, utilitarios, autos y camionetas. ' +
    'Consultá financiación, entregá tu usado y hablá con un asesor Decker.',
  metadataBase: new URL('https://deckercamiones.com.ar'),
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    siteName: 'Decker Camiones',
  },
};

export const viewport: Viewport = {
  themeColor: '#0B0B0C',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="flex min-h-screen flex-col font-sans">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50
                     focus:rounded focus:bg-rojo focus:px-4 focus:py-2 focus:text-sm
                     focus:font-semibold focus:text-white"
        >
          Saltar al contenido
        </a>
        <Header />
        <main id="contenido" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
