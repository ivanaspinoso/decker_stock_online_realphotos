import Link from 'next/link';
import {
  IconoBatea,
  IconoCamion,
  IconoCamioneta,
  IconoFlecha,
  IconoFurgon,
  IconoSemi,
} from '@/components/ui/Iconos';
import type { TipoUnidad } from '@/lib/types';

/**
 * Acceso rápido por tipo de unidad, con el stock disponible de cada uno.
 *
 * Los tipos son los del sitio original. Cada tarjeta entra directo a
 * `/catalogo?tipo=…`: el usuario que ya sabe qué necesita no tiene que pasar
 * por el catálogo completo y filtrar a mano.
 */
const ICONOS: Record<TipoUnidad, (props: React.SVGProps<SVGSVGElement>) => JSX.Element> = {
  Camión: IconoCamion,
  Semi: IconoSemi,
  Batea: IconoBatea,
  Utilitario: IconoFurgon,
  'Auto/Camioneta': IconoCamioneta,
};

export default function TiposUnidad({
  conteo,
}: {
  conteo: { tipo: TipoUnidad; total: number }[];
}) {
  return (
    <section className="seccion">
      <div className="contenedor">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="etiqueta text-rojo">Buscar por tipo</p>
            <h2 className="mt-3 font-display text-[28px] font-semibold leading-none tracking-[-0.01em] sm:text-[34px]">
              ¿Qué unidad necesitás?
            </h2>
          </div>
          <p className="text-sm text-gris-500">Entrá directo al catálogo filtrado.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {conteo.map(({ tipo, total }) => {
            const Icono = ICONOS[tipo];
            return (
              <Link
                key={tipo}
                href={`/catalogo?tipo=${encodeURIComponent(tipo)}`}
                className="group flex items-center gap-4 rounded-md bg-white p-5 shadow-tarjeta transition-shadow duration-200 ease-suave hover:shadow-tarjeta-hover"
              >
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-gris-100 transition-colors group-hover:bg-rojo-50">
                  <Icono className="h-6 w-6 text-negro transition-colors group-hover:text-rojo" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[17px] font-semibold leading-none text-negro">{tipo}</h3>
                  <p className="dato mt-1.5 text-[13px] text-gris-500">
                    {total} {total === 1 ? 'unidad' : 'unidades'}
                  </p>
                </div>
                <IconoFlecha className="h-5 w-5 shrink-0 text-gris-300 transition-all duration-200 ease-suave group-hover:translate-x-0.5 group-hover:text-rojo" />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
