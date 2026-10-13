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
     * SIN OPTIMIZADOR DE IMÁGENES. Cada <Image> sirve el archivo tal cual.
     *
     * POR QUÉ: en Vercel el optimizador (`/_next/image`) tiene cupo mensual, y
     * el plan del sitio lo agotó. Pasado el cupo, Vercel contesta
     * `402 Payment Required` (`OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED`) a
     * TODAS las imágenes —también a las del propio repo—, y encima con
     * `Cache-Control: immutable` de un año: el navegador se guarda el error.
     *
     * Lo que lo consumía eran las fotos del stock: ~245 unidades, cada una con
     * su galería, por cada ancho que se pidiera. Y no ganaba nada: esas fotos ya
     * vienen chicas del server de Ruta Sur (la miniatura de `/uploads/thumb/`
     * pesa ~16 KB, la de `/uploads/croped/` ~60 KB).
     *
     * Las fotos propias del sitio (`public/marca/`) están guardadas ya
     * comprimidas en WebP. Si se agrega una nueva, comprimirla antes de
     * subirla: acá nadie la va a achicar.
     *
     * Efecto secundario bueno: ahora cada visitante baja las fotos del stock
     * directo del server de Ruta Sur, desde su propia IP. Antes las pedía todas
     * el servidor de Vercel desde unas pocas IPs, que es justo lo que hacía
     * saltar el límite de volumen de ese server (ver CLAUDE.md, "Las fotos").
     *
     * Para volver a optimizar hace falta un plan con cupo (Vercel Pro) o un
     * `loader` contra otro CDN. Sacar esta línea sin eso trae el 402 de vuelta.
     */
    unoptimized: true,

  },
};

export default nextConfig;
