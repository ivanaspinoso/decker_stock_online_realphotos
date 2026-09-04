import type { MetadataRoute } from 'next';
import { getSlugsDeUnidades } from '@/lib/api';

/**
 * Sitemap de las rutas reales del sitio: home, catálogo y la ficha de cada
 * unidad publicada.
 *
 * Las fichas salen de la misma función que usa `generateStaticParams`, así que
 * el sitemap no se puede desincronizar del stock: si entra una unidad nueva,
 * aparece acá sola en el próximo build.
 */
const SITIO = 'https://deckercamiones.com.ar';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const slugs = await getSlugsDeUnidades();

  const fichas: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${SITIO}/unidad/${slug}`,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [
    {
      url: SITIO,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      // El stock cambia más seguido que el resto del sitio.
      url: `${SITIO}/catalogo`,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...fichas,
  ];
}
