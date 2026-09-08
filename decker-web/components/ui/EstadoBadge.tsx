import type { EstadoUnidad } from '@/lib/types';

/**
 * El amarillo industrial está reservado para 0 km: es lo que el comprador
 * escanea primero. El resto va en neutro para no competir con él.
 */
const ESTILOS: Record<EstadoUnidad, string> = {
  '0 km': 'bg-amarillo text-negro',
  'Usado seleccionado': 'bg-negro text-white',
  Disponible: 'bg-white text-negro ring-1 ring-inset ring-gris-300',
  'Línea actual': 'bg-white text-negro ring-1 ring-inset ring-gris-300',
};

export default function EstadoBadge({
  estado,
  className = '',
}: {
  estado: EstadoUnidad;
  className?: string;
}) {
  return (
    <span
      /* `whitespace-nowrap`: la píldora tiene alto fijo y el texto centrado en
         una línea. En una columna angosta —la del comparador en un teléfono—
         "Usado seleccionado" se partía en dos renglones y el segundo se salía
         de la caja negra. El badge no se parte: si no entra, se corta la
         columna, no la palabra. */
      className={`centrado-optico inline-flex h-5 items-center whitespace-nowrap rounded-sm px-2.5 text-2xs font-medium leading-none tracking-[0.04em] ${ESTILOS[estado]} ${className}`}
    >
      {estado}
    </span>
  );
}
