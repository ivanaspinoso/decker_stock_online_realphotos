import UnidadCard from '@/components/unidades/UnidadCard';
import type { Unidad } from '@/lib/types';

export default function UnidadGrilla({
  unidades,
  columnas = 3,
}: {
  unidades: Unidad[];
  columnas?: 2 | 3;
}) {
  const clase =
    columnas === 2
      ? 'grid gap-4 sm:grid-cols-2'
      : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className={clase}>
      {unidades.map((unidad) => (
        <UnidadCard key={unidad.slug} unidad={unidad} />
      ))}
    </div>
  );
}
