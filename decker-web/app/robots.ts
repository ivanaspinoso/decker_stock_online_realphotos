import type { MetadataRoute } from 'next';

/**
 * Sin este archivo Next no publica ningún robots.txt y cada buscador decide por
 * su cuenta qué rastrear.
 *
 * El único bloqueo es el catálogo con filtros en la URL: `/catalogo?tipo=…&marca=…`
 * genera cientos de combinaciones que devuelven el mismo stock ordenado de otra
 * forma. Se indexa `/catalogo` una vez y las variantes quedan afuera.
 */
const SITIO = 'https://deckercamiones.com.ar';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/catalogo?',
    },
    sitemap: `${SITIO}/sitemap.xml`,
  };
}
