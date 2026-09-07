import Link from 'next/link';
import EncabezadoSeccion from '@/components/ui/EncabezadoSeccion';
import {
  IconoBatea,
  IconoCamion,
  IconoCamioneta,
  IconoFlecha,
  IconoFurgon,
  IconoMedidor,
  IconoSemi,
} from '@/components/ui/Iconos';
import type { Subcatalogo as DatosSubcatalogo, TipoUnidad } from '@/lib/types';

/**
 * Subcatálogo: las puertas de entrada al stock.
 *
 * Mezcla ejes a propósito —dos accesos por estado, dos por tipo y uno por
 * marca— porque así es como se pregunta por un camión. Nadie elige primero una
 * dimensión y después la otra: entra buscando "un 0 km", "un Volvo" o "una
 * batea", y cada una de esas tres frases tiene que ser un solo clic.
 *
 * La jerarquía es la del pedido del cliente, y se lee en el diseño:
 *
 * - 0 km y Usados van primero y llevan el color de su estado —el amarillo de
 *   señalética y el negro—, el mismo que después identifica a la unidad en la
 *   tarjeta y en la ficha. Es la separación que más pesa en la decisión.
 * - Semis y bateas van en neutro: son tipo de unidad, no estado.
 * - Marcas de camiones ocupa su propia banda ancha, porque no es UN acceso sino
 *   tantos como marcas haya en stock.
 * - Autos, camionetas y utilitarios cierran en una línea al pie, sin abrir por
 *   marca ni por estado. Ahí el visitante mira lo que hay; abrirlos sería
 *   ofrecer cinco puertas a cuatro unidades.
 */

const ICONOS_LIVIANOS: Record<string, (props: React.SVGProps<SVGSVGElement>) => React.JSX.Element> =
  {
    'Auto/Camioneta': IconoCamioneta,
    Utilitario: IconoFurgon,
  };

/** Los livianos se nombran como los busca la gente, no como los guarda el dato. */
const NOMBRES_LIVIANOS: Partial<Record<TipoUnidad, string>> = {
  'Auto/Camioneta': 'Autos y camionetas',
  Utilitario: 'Utilitarios',
};

export default function Subcatalogo({ datos }: { datos: DatosSubcatalogo }) {
  const accesos = [
    {
      nombre: '0 km',
      total: datos.ceroKm,
      href: `/catalogo?estado=${encodeURIComponent('0 km')}`,
      Icono: IconoCamion,
      // El amarillo de señalética, el mismo del badge de estado.
      chip: 'bg-amarillo text-negro',
    },
    {
      nombre: 'Usados',
      total: datos.usados,
      href: `/catalogo?estado=${encodeURIComponent('Usado seleccionado')}`,
      // El cuentakilómetros y no un camión: es lo que distingue a un usado.
      Icono: IconoMedidor,
      chip: 'bg-negro text-white',
    },
    {
      nombre: 'Semis',
      total: datos.semis,
      href: '/catalogo?tipo=Semi',
      Icono: IconoSemi,
      chip: 'bg-gris-100 text-negro',
    },
    {
      nombre: 'Bateas',
      total: datos.bateas,
      href: '/catalogo?tipo=Batea',
      Icono: IconoBatea,
      chip: 'bg-gris-100 text-negro',
    },
  ];

  return (
    <section id="subcatalogo" className="seccion scroll-mt-24">
      <div className="contenedor">
        <EncabezadoSeccion
          etiqueta="Subcatálogo"
          titulo="El lugar donde podés encontrar TU camión"
          descripcion="Entrá directo por lo que ya sabés que buscás: si lo querés 0 km o usado, de qué marca, o si lo que necesitás es un semi o una batea."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {accesos.map(({ nombre, total, href, Icono, chip }) => (
            <Link
              key={nombre}
              href={href}
              className="group flex items-center gap-4 rounded-md bg-white p-5 shadow-nivel-1 transition-shadow duration-medio ease-suave hover:shadow-nivel-2"
            >
              <span
                className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-sm ${chip}`}
              >
                <Icono className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="titulo-tarjeta text-negro">{nombre}</h3>
                <p className="dato mt-1 text-sm text-gris-500">
                  {total} {total === 1 ? 'unidad' : 'unidades'}
                </p>
              </div>
              <IconoFlecha className="h-5 w-5 shrink-0 text-gris-300 transition-all duration-medio ease-suave group-hover:translate-x-0.5 group-hover:text-rojo" />
            </Link>
          ))}
        </div>

        {/* Marcas: una banda y no una tarjeta más. Son varios destinos, y
            meterlos en la grilla de arriba obligaría a elegir una marca para
            representarlas a todas. Sólo salen las que tienen camiones: Randon
            está en el stock, pero en bateas y semis. */}
        <div className="mt-4 rounded-md bg-white p-5 shadow-nivel-1 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="titulo-tarjeta text-negro">Marcas de camiones</h3>
              <p className="mt-1 text-sm text-gris-500">
                Elegí la marca y entrás al catálogo con los camiones de esa marca.
              </p>
            </div>
            <ul className="flex flex-wrap gap-2">
              {datos.marcasDeCamiones.map(({ marca, total }) => (
                <li key={marca}>
                  <Link
                    href={`/catalogo?tipo=${encodeURIComponent('Camión')}&marca=${encodeURIComponent(marca)}`}
                    className="centrado-optico inline-flex h-11 items-center gap-2 rounded-sm bg-gris-100 px-4 text-sm font-medium text-negro transition-colors duration-rapido hover:bg-gris-200"
                  >
                    {marca}
                    <span className="dato text-xs text-gris-500">{total}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Autos, camionetas y utilitarios: presentes, pero sin abrir. */}
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          <p className="rotulo-dato text-gris-500">También en el catálogo</p>
          {datos.livianos.map(({ tipo, total }) => {
            const Icono = ICONOS_LIVIANOS[tipo];
            return (
              <Link
                key={tipo}
                href={`/catalogo?tipo=${encodeURIComponent(tipo)}`}
                className="centrado-optico group inline-flex items-center gap-2 text-sm font-medium text-negro hover:text-rojo"
              >
                <Icono className="h-5 w-5 shrink-0 text-gris-500 transition-colors group-hover:text-rojo" />
                {NOMBRES_LIVIANOS[tipo] ?? tipo}
                <span className="dato text-gris-500">{total}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
