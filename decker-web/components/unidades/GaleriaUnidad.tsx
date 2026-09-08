'use client';

import { useState } from 'react';
import EstadoBadge from '@/components/ui/EstadoBadge';
import FotoUnidad from '@/components/unidades/FotoUnidad';
import type { EstadoUnidad } from '@/lib/types';

/**
 * Galería de la ficha. Foto grande + miniaturas.
 *
 * Las miniaturas son botones reales (no divs con onClick) para que funcionen
 * con teclado y anuncien cuál está activa.
 *
 * La foto grande usa el mismo encuadre 4:3 de la tarjeta del catálogo: al
 * abrir una unidad, la imagen crece pero no se re-recorta. Es la misma foto,
 * más grande, y eso es lo que hace que el paso de un lado al otro no se sienta
 * como dos sitios distintos.
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
      {/* `key`: al cambiar de foto el bloque se rearma y corre el fundido de
          entrada. 180ms, apenas un pestañeo: es un acuse de que la miniatura
          respondió, no una transición de presentación. */}
      <FotoUnidad
        key={activa}
        src={fotos[activa]}
        alt={`${nombre} — foto ${activa + 1} de ${fotos.length}`}
        sizes="(max-width: 1024px) 100vw, 60vw"
        preload={activa === 0}
        className="animate-aparecer rounded-lg"
      >
        <div className="velo-foto" />
        <div className="absolute left-4 top-4">
          <EstadoBadge estado={estado} />
        </div>
        {fotos.length > 1 && (
          // Sobre el velo: dice en qué foto está parado sin depender de que las
          // miniaturas entren en pantalla.
          <span className="centrado-optico dato absolute bottom-4 right-4 inline-flex h-5 items-center rounded-sm bg-negro/70 px-2 text-2xs font-medium text-white backdrop-blur-sm">
            {activa + 1} / {fotos.length}
          </span>
        )}
      </FotoUnidad>

      {fotos.length > 1 && (
        <div className="mt-3 grid grid-cols-3 gap-3" role="group" aria-label="Fotos de la unidad">
          {fotos.map((foto, indice) => (
            <button
              key={`${foto}-${indice}`}
              type="button"
              onClick={() => setActiva(indice)}
              aria-label={`Ver foto ${indice + 1}`}
              aria-pressed={indice === activa}
              /* El estado activo es un anillo, no un cambio de opacidad: en el
                 teléfono no hay hover que lo confirme, así que la miniatura
                 elegida tiene que verse elegida sola. */
              className={`relative rounded-md transition-opacity duration-rapido ease-suave ${
                indice === activa
                  ? 'ring-2 ring-rojo ring-offset-2'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              <FotoUnidad src={foto} alt="" sizes="180px" className="rounded-md" />
            </button>
          ))}
        </div>
      )}

      <p className="rotulo-dato mt-3">Imágenes ilustrativas</p>
    </div>
  );
}
