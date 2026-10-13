import type { Metadata } from 'next';

/**
 * El dominio público del sitio, en UN lugar.
 *
 * Es el que contesta de verdad: `www.deckercamiones.com`. Antes estaba escrito
 * a mano como `deckercamiones.com.ar` en el layout, el sitemap, robots y la
 * ficha —un dominio donde el sitio NO está—, así que el canonical, el `og:url`,
 * el sitemap y la imagen de previsualización apuntaban todos a la nada: los
 * links compartidos por WhatsApp salían sin foto.
 *
 * Si el sitio se muda de dominio, se cambia acá y nada más.
 */
export const URL_SITIO = 'https://www.deckercamiones.com';

/**
 * Lo común de la tarjeta al compartir.
 *
 * Next mezcla `openGraph` de forma SUPERFICIAL: si una página define el suyo,
 * reemplaza entero el del layout —imagen incluida—. Por eso cada página arma el
 * suyo a partir de esta base y le agrega su `url`, en vez de confiar en
 * heredarlo.
 *
 * La imagen es `og.jpg`: la foto del patio recortada a 1200x630 —la medida que
 * piden WhatsApp, Facebook y LinkedIn—, oscurecida, con el logo encima, 71 KB.
 */
export const OPEN_GRAPH_BASE = {
  type: 'website',
  locale: 'es_AR',
  siteName: 'Decker Camiones',
  images: [
    {
      url: '/marca/og.jpg',
      width: 1200,
      height: 630,
      alt: 'Decker Camiones — patio de unidades',
    },
  ],
} satisfies Metadata['openGraph'];

/**
 * Canonical y `og:url` propios de una página.
 *
 * CADA PÁGINA TIENE EL SUYO. El layout tenía `canonical: '/'` y lo heredaban
 * todas, fichas incluidas: le decía a Google que las 200 y pico unidades eran
 * copias de la home, y que indexara sólo la home.
 *
 * La ruta va relativa: `metadataBase` del layout la vuelve absoluta.
 */
export function urlPropia(ruta: string): Pick<Metadata, 'alternates'> & {
  openGraph: NonNullable<Metadata['openGraph']>;
} {
  return {
    alternates: { canonical: ruta },
    openGraph: { ...OPEN_GRAPH_BASE, url: ruta },
  };
}
