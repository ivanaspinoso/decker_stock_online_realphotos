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
      className={`inline-flex items-center rounded-sm px-2.5 py-1 text-[10px] font-bold uppercase leading-none tracking-[0.1em] ${ESTILOS[estado]} ${className}`}
    >
      {estado}
    </span>
  );
}
