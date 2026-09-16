'use client';

import Image, { type ImageProps } from 'next/image';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { IconoCamion } from '@/components/ui/Iconos';

/**
 * Foto de una unidad con su estado de carga.
 *
 * El problema que resuelve: en una ruta con señal mala las fotos entran de a
 * una y de golpe. Un rectángulo gris que aparece y se llena sin aviso se lee
 * como sitio roto; un esqueleto con barrido se lee como "está viniendo".
 *
 * El encuadre y el fondo los pone `.foto-unidad`: mismo 4:3 en la tarjeta, la
 * miniatura y la galería, así el espacio ya está reservado antes de que llegue
 * la imagen y nada salta (CLS 0).
 *
 * Sin JS —o si la foto ya estaba en caché— no hay esqueleto ni desvanecido: se
 * pinta la imagen y punto. Por eso el estado arranca en `inicial` y sólo pasa a
 * `cargando` una vez montado, midiendo antes del pintado.
 */

const usarEfectoDeLayout = typeof window === 'undefined' ? useEffect : useLayoutEffect;

type Estado = 'inicial' | 'cargando' | 'lista' | 'fallo';

/**
 * Cuántas veces se reintenta una foto que no llegó, y cuánto se espera.
 *
 * POR QUÉ HACE FALTA REINTENTAR
 *
 * El server de fotos de Decker corta las conexiones cuando se le piden muchas
 * imágenes al mismo tiempo, y una grilla de catálogo pide una docena de una. El
 * optimizador de Next se cansa de esperarlo y contesta 504; el navegador, ante
 * un 504, **no reintenta nunca**: esa foto queda rota hasta que alguien recargue
 * la página. Con dos reintentos espaciados, el 504 pasa de ser una foto muerta a
 * una foto que tarda tres segundos.
 *
 * POR QUÉ ESPACIADOS Y NO INMEDIATOS
 *
 * Porque el problema ES la concurrencia. Reintentar al toque, con doce fotos a
 * la vez haciendo lo mismo, duplica la avalancha que causó el corte. Los
 * intervalos crecen y el segundo ya cae fuera del pico.
 *
 * POR QUÉ SÓLO DOS
 *
 * Si a los siete segundos el server sigue sin dar una foto, no es un pico de
 * concurrencia: está bloqueado, y seguir pidiendo lo mantiene bloqueado. Ahí
 * queda el cartel de "Foto no disponible", y la próxima visita la encuentra
 * cacheada.
 */
const REINTENTOS = [1_500, 5_000] as const;

export default function FotoUnidad({
  src,
  alt,
  sizes,
  preload,
  className = '',
  claseImagen = '',
  children,
  onTermino,
}: {
  src: ImageProps['src'];
  alt: string;
  sizes: string;
  /** Sólo para la imagen LCP de la página: la mete como <link> en el head. */
  preload?: boolean;
  /** Clases del marco: bordes redondeados, encuadre distinto al 4:3 por defecto. */
  className?: string;
  /** Clases de la imagen: el zoom suave de la tarjeta, por ejemplo. */
  claseImagen?: string;
  /** Lo que va encima de la foto: badges, velo, contador de fotos. */
  children?: React.ReactNode;
  /**
   * Avisa cuando la foto terminó (bien o mal).
   *
   * Lo usa la galería para no pedir las miniaturas hasta que la foto grande
   * haya llegado: el server de fotos de Decker se bloquea por volumen, y una
   * ficha que pide once imágenes de una es lo que produce los 504. Ver
   * `miniaturasVisibles` en `GaleriaUnidad`.
   */
  onTermino?: () => void;
}) {
  const [estado, setEstado] = useState<Estado>('inicial');
  const [intento, setIntento] = useState(0);
  const imagen = useRef<HTMLImageElement>(null);

  usarEfectoDeLayout(() => {
    setEstado(imagen.current?.complete ? 'lista' : 'cargando');
  }, [src]);

  // Al cambiar de foto se arranca de cero: los reintentos son de ESTA foto.
  useEffect(() => {
    setIntento(0);
  }, [src]);

  const cargando = estado === 'cargando';
  const fallo = estado === 'fallo';

  /**
   * Una foto que no llegó vuelve a pedirse, espaciado.
   *
   * El `key` con el número de intento es lo que hace que pase algo: React
   * desmonta el `<img>` y monta uno nuevo, y el navegador vuelve a pedir la
   * misma URL. Si en vez de eso le agregáramos un parámetro al `src` para
   * "romper la caché", cada reintento sería una VARIANTE NUEVA para el
   * optimizador de Next —otra descarga del original desde el server de Decker—,
   * que es exactamente la carga que estamos tratando de no generar.
   */
  const reintentar = () => {
    if (intento >= REINTENTOS.length) {
      setEstado('fallo');
      return;
    }
    const espera = REINTENTOS[intento];
    setEstado('cargando');
    setTimeout(() => setIntento((previo) => previo + 1), espera);
  };

  return (
    <div className={`foto-unidad ${className}`}>
      {cargando && <div className="esqueleto absolute inset-0" aria-hidden="true" />}
      <Image
        // El intento va en la `key`: remonta el <img> y dispara el pedido de
        // nuevo. Ver `reintentar()`.
        key={intento}
        ref={imagen}
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        preload={preload}
        onLoad={() => {
          setEstado('lista');
          onTermino?.();
        }}
        /**
         * UNA FOTO QUE NO LLEGA SE REINTENTA, Y RECIÉN DESPUÉS SE ESCONDE.
         *
         * Pasa de verdad y no es teórico: el server de fotos de Decker corta
         * las conexiones cuando se le piden muchas al mismo tiempo, el
         * optimizador de Next contesta 504 y el navegador **no reintenta solo**.
         * Sin esto, una tarjeta del catálogo queda sin foto hasta que alguien
         * recargue.
         *
         * Agotados los reintentos queda el fondo gris del marco, que ya es un
         * estado legible. Antes esto ponía `lista`, que apagaba el esqueleto
         * pero dejaba el `<img>` roto a la vista: el navegador dibuja ahí su
         * ícono de imagen partida con el texto alternativo al lado, que es peor
         * que un rectángulo gris.
         */
        onError={() => {
          reintentar();
          // Se avisa igual: si esta foto no llega, la galería no puede quedarse
          // esperándola para siempre sin mostrar nunca las miniaturas.
          if (intento >= REINTENTOS.length) onTermino?.();
        }}
        className={`object-cover transition-opacity duration-medio ease-suave ${
          cargando || fallo ? 'opacity-0' : 'opacity-100'
        } ${claseImagen}`}
      />

      {/* LA FOTO QUE NO LLEGÓ SE ANUNCIA, NO SE DEJA EN GRIS.
          
          Agotados los reintentos quedaba el fondo del marco pelado. Es legible
          en el sentido de que no muestra un ícono roto, pero se lee como sitio
          fallado: el visitante no sabe si la foto está viniendo, si la unidad no
          tiene, o si algo se rompió, y en la duda asume lo peor.
          
          Un ícono y tres palabras cambian eso. No arreglan la foto —eso depende
          del server de Decker, ver "Las fotos" en CLAUDE.md— pero convierten una
          falla en un estado previsto, que es la diferencia entre "está roto" y
          "esta unidad no tiene foto ahora".
          
          `aria-hidden` porque el `alt` de la imagen ya dice de qué unidad se
          trata: un lector de pantalla no necesita oír dos veces lo mismo. */}
      {fallo && (
        <div
          aria-hidden="true"
          className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-gris-100 text-gris-400"
        >
          <IconoCamion className="h-7 w-7" />
          <span className="text-[11px] font-medium tracking-wide">Foto no disponible</span>
        </div>
      )}

      {children}
    </div>
  );
}
