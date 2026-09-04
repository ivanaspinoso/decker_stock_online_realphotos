/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /**
   * Turbopack deduce la raíz del proyecto buscando lockfiles hacia arriba, y en
   * esta máquina encuentra un `package-lock.json` suelto en C:\Users\Lenovo, que
   * está fuera del repo. Se la fijamos a mano: la raíz es esta carpeta.
   */
  turbopack: {
    root: import.meta.dirname,
  },

  images: {
    /**
     * Las fotos del sitio son PNG pesados (el hero solo son ~1,7 MB). Next las
     * recodifica al vuelo: con AVIF primero y WebP de respaldo, el navegador se
     * lleva la más chica que sepa leer en vez del PNG original.
     *
     * El orden importa: Next prueba en orden y sirve el primero que el
     * navegador acepte.
     */
    formats: ['image/avif', 'image/webp'],

    /**
     * Cachea la versión ya optimizada 30 días. El default son 60 segundos, que
     * para un catálogo cuyas fotos no cambian significa recodificar la misma
     * imagen una y otra vez.
     */
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
};

export default nextConfig;
