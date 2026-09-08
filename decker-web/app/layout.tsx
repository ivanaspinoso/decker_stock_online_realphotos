import type { Metadata, Viewport } from 'next';
import { Overpass } from 'next/font/google';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import BarraComparador from '@/components/unidades/BarraComparador';
import { getResumenDeUnidades, getSucursales } from '@/lib/api';
import './globals.css';

/**
 * UNA familia: Overpass. Nada más.
 *
 * Overpass es una reinterpretación libre de la Highway Gothic, la tipografía de
 * la señalética vial norteamericana desde 1948. Para una empresa de camiones el
 * origen no es decorativo: es la letra de los carteles de ruta, que es donde
 * esta gente trabaja. En regular se comporta como una grotesca neutra y se lee
 * como cualquier texto largo; en los pesos altos gana carácter propio y aguanta
 * un titular sin pedir prestada una segunda familia.
 *
 * UNA sola cara, sin excepciones: la diferencia entre un titular, un párrafo
 * y un precio la hace el PESO, nunca otro dibujo.
 * - 800/900 para titulares: h1 de cada página y títulos de sección.
 * - 400/500 para todo lo demás: texto corrido, rótulos, botones, navegación y
 *   datos técnicos.
 *
 * No hay monoespaciada. La hubo —Overpass Mono para precios, km, años y tasas—
 * y se sacó: aunque es de la misma familia, en pantalla se lee como OTRA
 * tipografía, y ver "420 CV" en ancho fijo al lado de "Bahía Blanca" en ancho
 * normal, dentro de la misma tarjeta, rompía la unidad de la página. Lo único
 * que aportaba era alinear columnas de importes, y eso lo hace `tabular-nums`
 * sin cambiar de cara (ver `.dato` en globals.css).
 *
 * Antes el sitio era IBM Plex en tres cortes —Condensed, Sans y Mono, seis
 * archivos estáticos—. Antes de eso, Oswald para títulos e Inter para lectura.
 *
 * Peso de la descarga (subconjunto latin):
 * - IBM Plex: 6 archivos estáticos, ~156 KB.
 * - Overpass + Mono: 2 archivos variables, ~60 KB.
 * - Ahora: UN archivo variable, ~38 KB.
 */

/**
 * El archivo VARIABLE, no cuatro estáticos.
 *
 * Se necesitan 400, 500, 800 y 900. Pedidos como pesos sueltos, Google entrega
 * cuatro archivos que suman ~154 KB; el variable cubre TODO el eje de 100 a 900
 * en un solo archivo de ~38 KB. Cuatro veces menos peso y un pedido de red en
 * lugar de cuatro, que en una conexión de ruta es la diferencia que se nota.
 *
 * Por eso acá no va `weight`: pedirlo es justamente lo que fuerza los estáticos.
 * Los pesos que el sitio no usa no cuestan nada: no son archivos aparte, son
 * posiciones del mismo eje.
 */
const texto = Overpass({
  subsets: ['latin'],
  variable: '--font-overpass',
  display: 'swap',
});

/** Título y descripción tomados del sitio original de Decker. */
export const metadata: Metadata = {
  title: {
    // Era 'Decker ' —con el espacio colgando—: es el título que ve el buscador
    // y el que queda en la pestaña. Ahora dice qué es el sitio.
    default: 'Decker Camiones — Stock online de camiones 0 km y usados',
    template: '%s | Decker Camiones',
  },
  description:
    'Encontrá camiones 0 km, usados, semis, bateas, utilitarios, autos y camionetas. ' +
    'Consultá financiación, entregá tu usado y hablá con un asesor Decker.',
  metadataBase: new URL('https://deckercamiones.com.ar'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    siteName: 'Decker Camiones',
    url: '/',
    // Sin esto, compartir el sitio por WhatsApp —que es el canal por el que
    // entra la consulta— mostraba una tarjeta sin imagen.
    images: [
      {
        url: '/marca/banner.jpg',
        width: 1920,
        height: 1440,
        alt: 'Patio de unidades Decker Camiones',
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#0B0B0C',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  /* El resumen de todo el stock, para el comparador: la lista guardada son
     slugs sueltos y los datos tienen que estar en la página cuando se leen.
     Va en el layout porque comparar cruza páginas —una unidad de la home,
     otra del catálogo, otra de una ficha—. */
  const [unidades, sucursales] = await Promise.all([
    getResumenDeUnidades(),
    getSucursales(),
  ]);

  return (
    // `data-scroll-behavior="smooth"` lo pide Next 16: globals.css pone
    // `scroll-behavior: smooth` en el html, y sin este atributo el router
    // anima también el salto al tope en cada cambio de ruta —se ve como si la
    // página nueva entrara scrolleando—. Con el atributo, el suave queda para
    // los anclas internos y la navegación salta directo.
    <html
      lang="es-AR"
      data-scroll-behavior="smooth"
      className={texto.variable}
    >
      <body className="flex min-h-screen flex-col font-sans">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50
                     focus:rounded focus:bg-rojo focus:px-4 focus:py-2 focus:text-sm
                     focus:font-medium focus:text-white"
        >
          Saltar al contenido
        </a>
        <Header />
        <main id="contenido" className="flex-1">
          {children}
        </main>
        <Footer />
        <BarraComparador unidades={unidades} sucursales={sucursales} />
      </body>
    </html>
  );
}
