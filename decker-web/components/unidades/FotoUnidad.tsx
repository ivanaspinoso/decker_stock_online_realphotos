'use client';

import Image, { type ImageProps } from 'next/image';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

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

type Estado = 'inicial' | 'cargando' | 'lista';

export default function FotoUnidad({
  src,
  alt,
  sizes,
  preload,
  className = '',
  claseImagen = '',
  children,
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
}) {
  const [estado, setEstado] = useState<Estado>('inicial');
  const imagen = useRef<HTMLImageElement>(null);

  usarEfectoDeLayout(() => {
    setEstado(imagen.current?.complete ? 'lista' : 'cargando');
  }, [src]);

  const cargando = estado === 'cargando';

  return (
    <div className={`foto-unidad ${className}`}>
      {cargando && <div className="esqueleto absolute inset-0" aria-hidden="true" />}
      <Image
        ref={imagen}
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        preload={preload}
        onLoad={() => setEstado('lista')}
        // Una foto que no llega no puede dejar el esqueleto girando para
        // siempre: queda el fondo gris del marco, que ya es un estado legible.
        onError={() => setEstado('lista')}
        className={`object-cover transition-opacity duration-medio ease-suave ${
          cargando ? 'opacity-0' : 'opacity-100'
        } ${claseImagen}`}
      />
      {children}
    </div>
  );
}
