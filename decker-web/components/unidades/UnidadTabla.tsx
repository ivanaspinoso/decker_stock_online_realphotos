import Image from 'next/image';
import Link from 'next/link';
import EstadoBadge from '@/components/ui/EstadoBadge';
import { IconoWhatsapp } from '@/components/ui/Iconos';
import { formatearAnio, formatearKm, tieneKilometraje } from '@/lib/format';
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
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-gris-400 lg:hidden">
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
      <div className="overflow-x-auto rounded-md bg-white shadow-tarjeta">
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
                  className={`px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] ${col.clase}`}
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
                className="border-t border-gris-200 transition-colors hover:bg-gris-50"
              >
                <th scope="row" className="px-3 py-3 font-normal">
                  <div className="flex items-center gap-3">
                    <div className="relative hidden h-11 w-16 shrink-0 overflow-hidden rounded-sm bg-gris-100 sm:block">
                      <Image src={unidad.imagen} alt="" fill sizes="64px" className="object-cover" />
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/unidad/${unidad.slug}`}
                        className="block truncate text-[14px] font-semibold text-negro hover:text-rojo"
                      >
                        {unidad.nombre}
                      </Link>
                      <span className="text-[11px] text-gris-400">{unidad.tipo}</span>
                    </div>
                  </div>
                </th>
                <td className="px-3 py-3 text-sm text-gris-600">
                  {nombreDeSucursal(unidad.sucursalId)}
                </td>
                <td className="dato px-3 py-3 text-right text-sm text-negro">
                  {formatearAnio(unidad.anio)}
                </td>
                <td className="dato px-3 py-3 text-right text-sm text-gris-600">
                  {tieneKilometraje(unidad.tipo) ? formatearKm(unidad.km) : (unidad.potencia ?? '—')}
                </td>
                {/* Sin `dato`: la monoespaciada está reservada para datos
                    numéricos. Esto es un estado, no una cifra. */}
                <td className="px-3 py-3 text-right text-sm font-semibold text-negro">
                  {unidad.financiacion}
                </td>
                <td className="px-3 py-3">
                  <EstadoBadge estado={unidad.estado} />
                </td>
                <td className="px-3 py-3">
                  <div className="flex justify-end gap-1.5">
                    <Link
                      href={`/unidad/${unidad.slug}`}
                      className="inline-flex h-8 items-center rounded-sm bg-gris-100 px-3 text-[12px] font-semibold text-negro transition-colors hover:bg-gris-200"
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
                      className="inline-flex h-8 w-8 items-center justify-center rounded-sm bg-rojo text-white transition-colors hover:bg-rojo-700"
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
