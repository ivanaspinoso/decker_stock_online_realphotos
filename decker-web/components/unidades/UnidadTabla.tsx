import FotoUnidad from '@/components/unidades/FotoUnidad';
import Link from 'next/link';
import EstadoBadge from '@/components/ui/EstadoBadge';
import BotonComparar from '@/components/unidades/BotonComparar';
import { IconoWhatsapp } from '@/components/ui/Iconos';
import {
  esCifra,
  formatearAnio,
  formatearKm,
  formatearPrecio,
  tieneKilometraje,
} from '@/lib/format';
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
        Deslizá la tabla para ver precio, sucursal, año, km y financiación →
      </p>
      {/* El encabezado va `top-0` y no `top-20`: `overflow-x-auto` convierte a
          este div en contenedor de scroll, así que el `sticky` se mide contra
          él y no contra la página. Con un offset, el encabezado se clavaba 80px
          por debajo del borde de la tabla y tapaba la primera fila. En `top-0`
          queda donde corresponde.

          Un encabezado que acompañe el scroll de la página exigiría sacar el
          contenedor de scroll, y sin él la tabla se desborda de la tarjeta en
          vez de scrollear. */}
      {/* 1000px y padding de 12: con la columna de precio sumada y el cuerpo un
          punto más grande, a 1080 y con padding de 16 la tabla se pasaba del
          ancho útil de un monitor de 1440 —el sidebar de filtros se lleva 312—
          y la columna de acciones quedaba fuera de la pantalla. Los 12px por
          lado son lo que devuelve esos 72 sin apretar las celdas. */}
      <div className="overflow-x-auto rounded-md bg-white shadow-nivel-1">
        <table className="w-full min-w-[1000px] border-collapse text-left">
          <caption className="sr-only">
            Listado de unidades con estado, precio, sucursal, año, kilómetros y financiación
          </caption>
          <thead className="sticky top-0 z-10">
            <tr className="bg-negro text-white">
              {/* Sin columna "Marca": la marca ya encabeza el nombre de cada
                  unidad ("Volvo FM 420", "Batea Randon"). Repetirla costaba
                  ~90px y empujaba la columna de acciones fuera del ancho. */}
              {[
                { texto: 'Comparar', clase: 'rounded-tl-md' },
                { texto: 'Unidad', clase: '' },
                // El precio va SEGUNDO, pegado al nombre y antes que todo lo
                // demás: es la columna con la que se descarta, y en una tabla
                // que scrollea en horizontal la que se descarta tiene que
                // entrar en el primer ancho de pantalla.
                { texto: 'Precio', clase: 'text-right' },
                { texto: 'Sucursal', clase: '' },
                { texto: 'Año', clase: 'text-right' },
                { texto: 'Km / uso', clase: 'text-right' },
                { texto: 'Financiación', clase: 'text-right' },
                // Sin columna "Estado": el badge se mudó adentro de la celda de
                // la unidad, debajo del nombre. Era una columna entera de 170px
                // —"Usado seleccionado" no se parte— para un dato que identifica
                // a la unidad, no que se compare entre filas, y esos 170px eran
                // los que dejaban la columna de acciones fuera de la pantalla en
                // un monitor de 1440 con el panel de filtros al costado.
                { texto: 'Acción', clase: 'rounded-tr-md text-right' },
              ].map((col) => (
                <th
                  key={col.texto}
                  scope="col"
                  className={`px-3 py-4 text-2xs font-medium tracking-[0.05em] ${col.clase}`}
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
                {/* La casilla va sola: el rótulo lo pone el encabezado de la
                    columna una vez, en vez de repetir la palabra en las
                    treinta y seis filas de una tabla que ya scrollea. */}
                <td className="px-3 py-4">
                  <BotonComparar slug={unidad.slug} nombre={unidad.nombre} soloCasilla />
                </td>
                <th scope="row" className="px-3 py-4 font-normal">
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
                      {/* Tipo y estado juntos, en el mismo renglón bajo el
                          nombre: los dos dicen QUÉ es esta unidad, y el estado
                          se lee mejor pegado a ella que en una columna al otro
                          extremo de una tabla de mil píxeles. */}
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-2xs text-gris-500">{unidad.tipo}</span>
                        <EstadoBadge estado={unidad.estado} />
                      </div>
                    </div>
                  </div>
                </th>
                {/* Con precio, en negro y con `dato` para que la columna de
                    importes se alinee dígito con dígito. Sin precio, gris:
                    "Consultar" no es una cifra y no tiene que competir con las
                    que sí lo son al recorrer la columna. */}
                <td
                  className={`px-3 py-4 text-right text-sm ${
                    unidad.precio !== null ? 'dato font-medium text-negro' : 'text-gris-500'
                  }`}
                >
                  {formatearPrecio(unidad.precio)}
                </td>
                <td className="px-3 py-4 text-sm text-gris-600">
                  {nombreDeSucursal(unidad.sucursalId)}
                </td>
                {/* "Consultar" cuando el año no está cargado: ahí no hay
                    cifra que alinear. */}
                <td
                  className={`px-3 py-4 text-right text-sm text-negro ${
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
                      className={`px-3 py-4 text-right text-sm text-gris-600 ${
                        esCifra(valor) ? 'dato' : ''
                      }`}
                    >
                      {valor}
                    </td>
                  );
                })()}
                {/* Sin `dato`: la monoespaciada está reservada para datos
                    numéricos. Esto es un estado, no una cifra. */}
                <td className="px-3 py-4 text-right text-sm font-medium text-negro">
                  {unidad.financiacion}
                </td>
                <td className="px-3 py-4">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/unidad/${unidad.slug}`}
                      className="centrado-optico inline-flex h-11 items-center rounded-sm bg-gris-100 px-3 text-sm font-medium text-negro transition-colors duration-rapido hover:bg-gris-200"
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
