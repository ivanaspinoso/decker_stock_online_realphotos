'use client';

import { useState } from 'react';
import Image from 'next/image';
import EstadoBadge from '@/components/ui/EstadoBadge';
import type { EstadoUnidad } from '@/lib/types';

/**
 * Galería de la ficha. Foto grande + miniaturas.
 *
 * Las miniaturas son botones reales (no divs con onClick) para que funcionen
 * con teclado y anuncien cuál está activa.
 */
export default function GaleriaUnidad({
  fotos,
  nombre,
  estado,
}: {
  fotos: string[];
  nombre: string;
  estado: EstadoUnidad;
}) {
  const [activa, setActiva] = useState(0);

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-gris-100 sm:aspect-[16/10]">
        <Image
          src={fotos[activa]}
          alt={`${nombre} — foto ${activa + 1} de ${fotos.length}`}
          fill
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="object-cover"
          priority
        />
        <div className="absolute left-4 top-4">
          <EstadoBadge estado={estado} />
        </div>
      </div>

      {fotos.length > 1 && (
        <div className="mt-3 grid grid-cols-3 gap-3" role="group" aria-label="Fotos de la unidad">
          {fotos.map((foto, indice) => (
            <button
              key={`${foto}-${indice}`}
              type="button"
              onClick={() => setActiva(indice)}
              aria-label={`Ver foto ${indice + 1}`}
              aria-pressed={indice === activa}
              className={`relative aspect-[4/3] overflow-hidden rounded-md transition-all duration-200 ease-suave ${
                indice === activa
                  ? 'ring-2 ring-rojo ring-offset-2'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              <Image src={foto} alt="" fill sizes="180px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-gris-400">
        Imágenes ilustrativas
      </p>
    </div>
  );
}
