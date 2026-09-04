import FotoUnidad from '@/components/unidades/FotoUnidad';
import Link from 'next/link';
import EstadoBadge from '@/components/ui/EstadoBadge';
import { IconoWhatsapp } from '@/components/ui/Iconos';
import { esCifra, formatearAnio, formatearKm, tieneKilometraje } from '@/lib/format';
import { linkConsultaUnidad, nombreDeSucursal } from '@/lib/whatsapp';
import type { Unidad } from '@/lib/types';

/**
 * Vista lista: tabla densa para comparar muchas unidades a la vez.
 *
 * Es la única parte del sitio donde la densidad gana sobre el aire, porque es
 * exactamente para lo que se usa. En pantallas chicas la tabla scrollea en
 * horizontal en vez de esconder columnas: preferible deslizar a perder datos.
 */
export default function UnidadTabla({ unidades }: { unidades: Unidad[] }) {
  return (
    <>
      <p className="rotulo-dato mb-3 block lg:hidden">
        Deslizá la tabla para ver año, km y financiación →
      </p>
      {/* El encabezado va `top-0` y no `top-20`: `overflow-x-auto` convierte a
          este div en contenedor de scroll, así que el `sticky` se mide contra
          él y no contra la página. Con un offset, el encabezado se clavaba 80px
          por debajo del borde de la tabla y tapaba la primera fila. En `top-0`
          queda donde corresponde.

          Un encabezado que acompañe el scroll de la página exigiría sacar el
          contenedor de scroll, y sin él la tabla se desborda de la tarjeta en
          vez de scrollear. */}
      <div className="overflow-x-auto rounded-md bg-white shadow-nivel-1">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <caption className="sr-only">
            Listado de unidades con sucursal, año, kilómetros, financiación y estado
          </caption>
          <thead className="sticky top-0 z-10">
            <tr className="bg-negro text-white">
              {/* Sin columna "Marca": la marca ya encabeza el nombre de cada
                  unidad ("Volvo FM 420", "Batea Randon"). Repetirla costaba
                  ~90px y empujaba la columna de acciones fuera del ancho. */}
              {[
                { texto: 'Unidad', clase: 'rounded-tl-md' },
                { texto: 'Sucursal', clase: '' },
                { texto: 'Año', clase: 'text-right' },
                { texto: 'Km / uso', clase: 'text-right' },
                { texto: 'Financiación', clase: 'text-right' },
                { texto: 'Estado', clase: '' },
                { texto: 'Acción', clase: 'rounded-tr-md text-right' },
              ].map((col) => (
                <th
                  key={col.texto}
                  scope="col"
                  className={`px-4 py-4 text-2xs font-medium tracking-[0.05em] ${col.clase}`}
                >
                  {col.texto}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {unidades.map((unidad) => (
              <tr
                key={unidad.slug}
                className="border-t border-gris-200 transition-colors duration-rapido hover:bg-gris-50"
              >
                <th scope="row" className="px-4 py-4 font-normal">
                  <div className="flex items-center gap-3">
                    {/* Mismo 4:3 y mismo esqueleto de carga que la tarjeta y la
                        galería: la miniatura de la tabla es la misma foto en
                        chico, no otro recorte. */}
                    <FotoUnidad
                      src={unidad.imagen}
                      alt=""
                      sizes="64px"
                      className="hidden w-16 shrink-0 rounded-sm sm:block"
                    />
                    <div className="min-w-0">
                      <Link
                        href={`/unidad/${unidad.slug}`}
                        className="block truncate text-sm font-medium text-negro hover:text-rojo"
                      >
                        {unidad.nombre}
                      </Link>
                      <span className="text-2xs text-gris-500">{unidad.tipo}</span>
                    </div>
                  </div>
                </th>
                <td className="px-4 py-4 text-sm text-gris-600">
                  {nombreDeSucursal(unidad.sucursalId)}
                </td>
                {/* "Consultar" cuando el año no está cargado: ahí no hay
                    cifra que alinear. */}
                <td
                  className={`px-4 py-4 text-right text-sm text-negro ${
                    esCifra(formatearAnio(unidad.anio)) ? 'dato' : ''
                  }`}
                >
                  {formatearAnio(unidad.anio)}
                </td>
                {/* La columna alterna cifra y palabra según el tipo: un camión
                    trae kilómetros, un semi trae su configuración. El ancho fijo
                    se decide por el valor, no por la columna. */}
                {(() => {
                  const valor = tieneKilometraje(unidad.tipo)
                    ? formatearKm(unidad.km)
                    : (unidad.potencia ?? '—');
                  return (
                    <td
                      className={`px-4 py-4 text-right text-sm text-gris-600 ${
                        esCifra(valor) ? 'dato' : ''
                      }`}
                    >
                      {valor}
                    </td>
                  );
                })()}
                {/* Sin `dato`: la monoespaciada está reservada para datos
                    numéricos. Esto es un estado, no una cifra. */}
                <td className="px-4 py-4 text-right text-sm font-medium text-negro">
                  {unidad.financiacion}
                </td>
                <td className="px-4 py-4">
                  <EstadoBadge estado={unidad.estado} />
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/unidad/${unidad.slug}`}
                      className="inline-flex h-11 items-center rounded-sm bg-gris-100 px-3 text-sm font-medium text-negro transition-colors duration-rapido hover:bg-gris-200"
                    >
                      Ficha
                    </Link>
                    {/* Sólo el ícono: con el rótulo, la columna empujaba la
                        tabla más allá del ancho disponible y obligaba a
                        scrollear en horizontal también en desktop. El destino
                        queda claro por el ícono y por el `aria-label`. */}
                    <a
                      href={linkConsultaUnidad(unidad)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-sm bg-rojo text-white transition-colors duration-rapido hover:bg-rojo-700"
                      aria-label={`Consultar por ${unidad.nombre} por WhatsApp`}
                      title="Consultar por WhatsApp"
                    >
                      <IconoWhatsapp className="h-4 w-4" />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
