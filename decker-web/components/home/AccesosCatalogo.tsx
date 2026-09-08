import { IconoBatea, IconoCamion, IconoMedidor, IconoSemi } from '@/components/ui/Iconos';
import type { AccesosCatalogo as Datos, FiltrosCatalogo } from '@/lib/types';

/**
 * Las puertas de entrada al stock. Es la primera mitad de la sección de
 * catálogo de la home; la segunda es la muestra de unidades, que es lo que
 * estos controles filtran.
 *
 * Son BOTONES, no links. Antes cada uno llevaba al catálogo completo: tocar
 * "Semis" en la home sacaba de la home para mostrar una lista que se podía
 * mostrar ahí mismo. Ahora acotan la muestra de abajo en el acto, y volver a
 * tocar el que está activo lo suelta. Irse al catálogo pasó a ser una decisión
 * aparte, en el botón del encabezado, que se lleva puesto el filtro activo.
 *
 * Mezclan ejes a propósito —dos por estado, dos por tipo y uno por marca—
 * porque así es como se pregunta por un camión. Nadie elige primero una
 * dimensión y después la otra: entra buscando "un 0 km", "un Volvo" o "una
 * batea", y cada una de esas tres frases tiene que ser un solo toque.
 *
 * La jerarquía se lee en el diseño:
 *
 * - El amarillo de señalética es SÓLO de 0 km, la misma regla que ya rige en
 *   el badge de estado de cada tarjeta. Es la única excepción de color de la
 *   fila, y se lee como excepción justamente porque las otras tres comparten
 *   un mismo neutro.
 * - Usados, Semis y Bateas van las tres en gris claro con el ícono en negro,
 *   el trazo de la iconografía de specs. Antes Usados iba en negro pleno y
 *   las otras dos en gris: tres tratamientos para cuatro tarjetas se lee como
 *   un error, no como una jerarquía.
 * - Marcas de camiones ocupa su propia banda, porque no es UN acceso sino
 *   tantos como marcas haya en stock.
 *
 * Las cifras son las del STOCK COMPLETO y no las de la muestra: "Usados, 19
 * unidades" es el dato que sirve para decidir si vale la pena tocar. Que abajo
 * se vean seis de esas diecinueve lo aclara el renglón de la muestra.
 *
 * Autos, camionetas y utilitarios NO tienen acceso propio. Siguen en el
 * catálogo y en su filtro por tipo, pero acá serían dos puertas más para
 * nueve unidades, al lado de las que llevan a diecinueve camiones usados.
 */

/**
 * Lo que un acceso le pasa a la sección: por qué acotar y CÓMO SE LLAMA.
 *
 * El nombre viaja con el filtro porque el rótulo de la muestra tiene que decir
 * "Usados" —lo que dice el botón que se tocó— y no "Usado seleccionado", que es
 * el valor del dato. Deducirlo del filtro obligaría a mantener una segunda
 * tabla de nombres al lado de la primera.
 */
export interface Seleccion {
  nombre: string;
  filtro: FiltrosCatalogo;
}

export default function AccesosCatalogo({
  datos,
  seleccionado,
  onFiltrar,
}: {
  datos: Datos;
  /** Nombre del acceso activo, o `null` si se está viendo la selección. */
  seleccionado: string | null;
  onFiltrar: (seleccion: Seleccion | null) => void;
}) {
  const accesos: {
    nombre: string;
    total: number;
    acota: FiltrosCatalogo;
    Icono: (props: React.SVGProps<SVGSVGElement>) => React.JSX.Element;
    chip: string;
  }[] = [
    {
      nombre: '0 km',
      total: datos.ceroKm,
      acota: { estado: '0 km' },
      Icono: IconoCamion,
      // Única excepción de color de la fila: el amarillo es de 0 km y de nada más.
      chip: 'bg-amarillo text-negro',
    },
    {
      nombre: 'Usados',
      total: datos.usados,
      acota: { estado: 'Usado seleccionado' },
      // El cuentakilómetros y no un camión: es lo que distingue a un usado.
      Icono: IconoMedidor,
      chip: 'bg-gris-100 text-negro',
    },
    {
      nombre: 'Semis',
      total: datos.semis,
      acota: { tipo: 'Semi' },
      Icono: IconoSemi,
      chip: 'bg-gris-100 text-negro',
    },
    {
      nombre: 'Bateas',
      total: datos.bateas,
      acota: { tipo: 'Batea' },
      Icono: IconoBatea,
      chip: 'bg-gris-100 text-negro',
    },
  ];

  /** Tocar el acceso activo lo suelta. Es la forma más corta de volver atrás. */
  const alternar = (nombre: string, filtro: FiltrosCatalogo) =>
    onFiltrar(seleccionado === nombre ? null : { nombre, filtro });

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {accesos.map(({ nombre, total, acota, Icono, chip }) => {
          const activo = seleccionado === nombre;
          return (
            <button
              key={nombre}
              type="button"
              aria-pressed={activo}
              onClick={() => alternar(nombre, acota)}
              /* El estado activo va con un anillo y no con un relleno de color:
                 el relleno competiría con el amarillo de 0 km, que ya significa
                 otra cosa. El anillo dice "elegido" sin pisar la señalética. */
              className={`flex items-center gap-4 rounded-md bg-white p-5 text-left shadow-nivel-1 transition-shadow duration-medio ease-suave hover:shadow-nivel-2 ${
                activo ? 'ring-2 ring-inset ring-negro' : ''
              }`}
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
            </button>
          );
        })}
      </div>

      {/* Marcas: una banda y no una tarjeta más. Son varios destinos, y meterlos
          en la grilla de arriba obligaría a elegir una marca para representarlas
          a todas. Sólo salen las que tienen camiones: Randon está en el stock,
          pero en bateas y semis. */}
      <div className="mt-4 rounded-md bg-white p-5 shadow-nivel-1 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="titulo-tarjeta text-negro">Marcas de camiones</h3>
            <p className="mt-1 text-sm text-gris-500">
              Elegí la marca y la selección de abajo queda con los camiones de esa marca.
            </p>
          </div>
          <ul className="flex flex-wrap gap-2">
            {datos.marcasDeCamiones.map(({ marca, total }) => {
              const activo = seleccionado === marca;
              return (
                <li key={marca}>
                  <button
                    type="button"
                    aria-pressed={activo}
                    onClick={() => alternar(marca, { tipo: 'Camión', marca })}
                    className={`centrado-optico inline-flex h-11 items-center gap-2 rounded-sm px-4 text-sm font-medium transition-colors duration-rapido ${
                      activo ? 'bg-negro text-white' : 'bg-gris-100 text-negro hover:bg-gris-200'
                    }`}
                  >
                    {marca}
                    <span
                      className={`dato text-xs ${activo ? 'text-gris-400' : 'text-gris-500'}`}
                    >
                      {total}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
