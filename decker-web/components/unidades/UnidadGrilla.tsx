import UnidadCard from '@/components/unidades/UnidadCard';
import type { Unidad } from '@/lib/types';

export default function UnidadGrilla({
  unidades,
  columnas = 3,
  animar = false,
}: {
  unidades: Unidad[];
  columnas?: 2 | 3;
  /**
   * Escalona la entrada de las tarjetas. Lo prende el catálogo, donde el
   * listado se rearma al tocar un filtro y hace falta que se note que respondió.
   * En la home las tarjetas ya están cuando la sección aparece: animarlas ahí
   * sería el mismo efecto sin nada que anunciar.
   */
  animar?: boolean;
}) {
  const clase =
    columnas === 2
      ? 'grid gap-4 sm:grid-cols-2'
      : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className={clase}>
      {unidades.map((unidad, indice) => (
        <UnidadCard key={unidad.slug} unidad={unidad} indice={animar ? indice : undefined} />
      ))}
    </div>
  );
}
