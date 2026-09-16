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
     * Las fotos del stock viven en el servidor de la API, no en este repo.
     *
     * Sin este permiso, `next/image` rechaza toda URL externa y el catálogo
     * entero queda sin fotos. El host es el único que devuelve la API —tanto
     * las miniaturas de `/uploads/thumb/` como las de `/uploads/croped/`— y se
     * lista explícito, no con un comodín: un `hostname: '**'` convierte al
     * optimizador de imágenes en un proxy abierto que cualquiera puede usar
     * para servir archivos ajenos a costa nuestra.
     *
     * `rutasurtrucks.com.ar` va aparte porque de ahí salen los íconos de
     * categoría (`type_image`).
     */
    remotePatterns: [
      { protocol: 'https', hostname: 'admin.usados.rutasurtrucks.com.ar', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'rutasurtrucks.com.ar', pathname: '/categorias/**' },
    ],

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
     * MENOS ANCHOS = MENOS PEDIDOS AL SERVER DE FOTOS.
     *
     * Next descarga el original una vez por cada combinación de ancho y calidad
     * que algún navegador llegue a pedir. Con la lista que trae por defecto
     * —ocho `deviceSizes` y ocho `imageSizes`— el mismo camión se puede bajar
     * del server de Decker una docena de veces.
     *
     * Y ese server corta las conexiones cuando se le pide de más: medido, una
     * sola carga del catálogo alcanza para que empiece a dejar fotos sin
     * responder, y las que no llegan se ven rotas.
     *
     * Estos seis anchos cubren las pantallas reales sin dejar a nadie con una
     * foto estirada: 640 y 828 para teléfonos, 1080 y 1280 para tablets y
     * notebooks, 1920 y 2560 para monitores grandes y pantallas retina. Los
     * `imageSizes` son para las miniaturas de la galería, que miden 180px.
     */
    deviceSizes: [640, 828, 1080, 1280, 1920, 2560],
    imageSizes: [128, 256, 384],

    /**
     * Cachea la versión ya optimizada 30 días. El default son 60 segundos, que
     * para un catálogo cuyas fotos no cambian significa recodificar la misma
     * imagen una y otra vez.
     */
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
};

export default nextConfig;
