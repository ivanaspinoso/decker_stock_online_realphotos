import Image from 'next/image';
import Link from 'next/link';
import EstadoBadge from '@/components/ui/EstadoBadge';
import {
  IconoCalendario,
  IconoCamion,
  IconoCheck,
  IconoMedidor,
  IconoPin,
  IconoPotencia,
  IconoWhatsapp,
} from '@/components/ui/Iconos';
import { formatearAnio, formatearKm, tieneKilometraje } from '@/lib/format';
import { linkConsultaUnidad, nombreDeSucursal } from '@/lib/whatsapp';
import type { Unidad } from '@/lib/types';

/**
 * Tarjeta de la vista grilla.
 *
 * Muestra la ficha COMPLETA sin abrir la unidad: los mismos campos que publicaba
 * el sitio original (marca, sucursal, estado, potencia/uso, financiación y
 * descripción) más los que se agregaron después (modelo, año, km y precio). Los
 * campos que todavía no están cargados se muestran igual, como "Consultar": el
 * comprador tiene que ver que el dato existe y hay que pedirlo, no que falta.
 *
 * La superficie es una sola —foto y contenido sin línea divisoria— y la
 * separación con el fondo la da la elevación, no un marco de 1px.
 */
export default function UnidadCard({ unidad }: { unidad: Unidad }) {
  // Semis y bateas no llevan cuentakilómetros: ahí la fila no aplica.
  const muestraKm = tieneKilometraje(unidad.tipo);

  const especificaciones = [
    { Icono: IconoCamion, etiqueta: 'Marca', valor: unidad.marca },
    { Icono: IconoCamion, etiqueta: 'Modelo', valor: unidad.modelo },
    { Icono: IconoCalendario, etiqueta: 'Año', valor: formatearAnio(unidad.anio) },
    ...(muestraKm
      ? [{ Icono: IconoMedidor, etiqueta: 'Kilómetros', valor: formatearKm(unidad.km) }]
      : []),
    {
      Icono: IconoPotencia,
      etiqueta: 'Potencia / Uso',
      valor: unidad.potencia ?? 'Consultar',
    },
    { Icono: IconoPin, etiqueta: 'Sucursal', valor: nombreDeSucursal(unidad.sucursalId) },
  ];

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-md bg-white shadow-tarjeta transition-shadow duration-200 ease-suave hover:shadow-tarjeta-hover">
      <div className="relative aspect-[4/3] overflow-hidden bg-gris-100">
        <Image
          src={unidad.imagen}
          alt={`${unidad.nombre} — ${unidad.estado}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 ease-suave group-hover:scale-[1.03]"
        />
        <div className="absolute left-3 top-3">
          <EstadoBadge estado={unidad.estado} />
        </div>
        {/* Tipo sobre la foto, como en el sitio original. */}
        <div className="absolute right-3 top-3">
          <span className="inline-flex items-center rounded-sm bg-negro/85 px-2.5 py-1 text-[10px] font-bold uppercase leading-none tracking-[0.1em] text-white backdrop-blur-sm">
            {unidad.tipo}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gris-400">
          {unidad.marca} · {unidad.tipo}
        </p>

        <h3 className="mt-1.5 text-[17px] font-semibold leading-snug text-negro">
          <Link
            href={`/unidad/${unidad.slug}`}
            className="after:absolute after:inset-0 group-hover:text-rojo"
          >
            {unidad.nombre}
          </Link>
        </h3>

        <p className="mt-2 text-[13px] leading-relaxed text-gris-500">{unidad.descripcion}</p>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-gris-200 pt-4">
          {especificaciones.map((spec) => (
            <div key={spec.etiqueta}>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gris-400">
                {spec.etiqueta}
              </dt>
              <dd className="mt-0.5 flex items-center gap-1.5">
                <spec.Icono className="h-4 w-4 shrink-0 text-gris-400" />
                <span className="dato text-[13px] font-medium text-negro">{spec.valor}</span>
              </dd>
            </div>
          ))}
        </dl>

        {/* Badges del sitio original. */}
        <ul className="mt-4 flex flex-wrap gap-2">
          <li
            className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-[11px] font-semibold leading-none ${
              unidad.financiacion === 'Disponible'
                ? 'bg-amarillo-50 text-negro ring-1 ring-inset ring-amarillo'
                : 'bg-gris-100 text-gris-600 ring-1 ring-inset ring-gris-200'
            }`}
          >
            <IconoCheck className="h-3.5 w-3.5" />
            Financiación: {unidad.financiacion}
          </li>
          <li className="inline-flex items-center gap-1.5 rounded-sm bg-gris-100 px-2.5 py-1.5 text-[11px] font-semibold leading-none text-gris-600 ring-1 ring-inset ring-gris-200">
            <IconoWhatsapp className="h-3.5 w-3.5" />
            Consulta online
          </li>
        </ul>

        {/* La tarjeta no muestra precio: en la grilla se compara por unidad,
            estado y ubicación, y el precio se ve en la ficha o en la vista
            lista, que es la pensada para comparar importes. */}
        <div className="mt-auto pt-5">
          {/* z-10 para quedar por encima del overlay del link de la tarjeta. */}
          <div className="relative z-10 flex flex-col gap-2">
            <div className="flex gap-2">
              <Link
                href={`/unidad/${unidad.slug}`}
                className="inline-flex h-10 flex-1 items-center justify-center rounded-sm bg-gris-100 text-[13px] font-semibold text-negro transition-colors hover:bg-gris-200"
              >
                Ver ficha
              </Link>
              <a
                href={linkConsultaUnidad(unidad)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-sm bg-rojo text-[13px] font-semibold text-white transition-colors hover:bg-rojo-700"
                aria-label={`Consultar por ${unidad.nombre} por WhatsApp`}
              >
                <IconoWhatsapp className="h-4 w-4" />
                Consultar
              </a>
            </div>
            <Link
              href="/#financiacion"
              className="inline-flex h-10 items-center justify-center rounded-sm text-[13px] font-semibold text-negro ring-1 ring-inset ring-gris-300 transition-colors hover:bg-gris-100"
            >
              Simular financiación
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
