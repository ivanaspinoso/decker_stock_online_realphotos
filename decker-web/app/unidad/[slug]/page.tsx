import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import GaleriaUnidad from '@/components/unidades/GaleriaUnidad';
import UnidadGrilla from '@/components/unidades/UnidadGrilla';
import CalculadoraFinanciacion from '@/components/financiacion/CalculadoraFinanciacion';
import EstadoBadge from '@/components/ui/EstadoBadge';
import EncabezadoSeccion from '@/components/ui/EncabezadoSeccion';
import { IconoPin, IconoWhatsapp } from '@/components/ui/Iconos';
import {
  getParametrosFinanciacion,
  getSlugsDeUnidades,
  getSucursalPorId,
  getUnidadPorSlug,
  getUnidadesRelacionadas,
} from '@/lib/api';
import { formatearAnio, formatearKm, formatearPrecio, tieneKilometraje } from '@/lib/format';
import { linkConsultaUnidad, linkWhatsapp } from '@/lib/whatsapp';
import type { Unidad } from '@/lib/types';

interface Props {
  params: { slug: string };
}

/** Todas las fichas se generan estáticas en el build. */
export async function generateStaticParams() {
  const slugs = await getSlugsDeUnidades();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const unidad = await getUnidadPorSlug(params.slug);
  if (!unidad) return { title: 'Unidad no encontrada' };

  const sucursal = await getSucursalPorId(unidad.sucursalId);

  return {
    title: unidad.nombre,
    description: `${unidad.nombre} · ${unidad.estado} · ${sucursal?.nombre ?? ''}. ${unidad.descripcion}`,
    openGraph: {
      title: `${unidad.nombre} | Decker Camiones`,
      description: unidad.descripcion,
      images: [{ url: unidad.imagen }],
    },
  };
}

export default async function FichaUnidad({ params }: Props) {
  const unidad = await getUnidadPorSlug(params.slug);
  if (!unidad) notFound();

  const [sucursal, parametros, relacionadas] = await Promise.all([
    getSucursalPorId(unidad.sucursalId),
    getParametrosFinanciacion(),
    getUnidadesRelacionadas(unidad.slug),
  ]);

  const especificaciones = armarEspecificaciones(unidad);

  return (
    <>
      <nav aria-label="Miga de pan">
        <div className="contenedor flex items-center gap-2 py-4 text-[13px] text-gris-500">
          <Link href="/" className="transition-colors hover:text-negro">
            Inicio
          </Link>
          <span aria-hidden="true" className="text-gris-300">
            /
          </span>
          <Link href="/catalogo" className="transition-colors hover:text-negro">
            Stock
          </Link>
          <span aria-hidden="true" className="text-gris-300">
            /
          </span>
          <span className="truncate text-negro">{unidad.nombre}</span>
        </div>
      </nav>

      {/* Tres bloques con orden distinto por breakpoint.

          En mobile: galería → tarjeta de decisión → ficha y descripción. Si la
          tarjeta va al final —que es lo que pasa si sigue el orden de columnas
          de desktop—, el precio y el botón de WhatsApp quedan a más de una
          pantalla y media de scroll.

          En desktop la tarjeta se corre a la columna derecha y ocupa las dos
          filas, quedando sticky al costado. */}
      <div className="contenedor grid gap-10 py-10 lg:grid-cols-[1.3fr_1fr] lg:gap-x-14 lg:gap-y-12 lg:py-14">
        <div className="order-1 lg:order-none lg:col-start-1 lg:row-start-1">
          <GaleriaUnidad fotos={unidad.galeria} nombre={unidad.nombre} estado={unidad.estado} />
        </div>

        <div className="order-3 lg:order-none lg:col-start-1 lg:row-start-2">
          <section>
            <h2 className="font-display text-[26px] font-semibold leading-none tracking-[-0.01em]">
              Ficha técnica
            </h2>
            <dl className="mt-6 grid gap-x-10 sm:grid-cols-2">
              {especificaciones.map((spec) => (
                <div
                  key={spec.etiqueta}
                  className="flex items-baseline justify-between gap-4 border-b border-gris-200 py-3.5"
                >
                  <dt className="text-sm text-gris-500">{spec.etiqueta}</dt>
                  <dd className="dato text-right text-sm font-semibold text-negro">
                    {spec.valor}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-[26px] font-semibold leading-none tracking-[-0.01em]">
              Descripción
            </h2>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-gris-600">
              {unidad.descripcion}
            </p>
          </section>
        </div>

        {/* Columna de decisión: precio, contacto y sucursal, siempre a mano.
            En mobile va segunda, justo debajo de la galería. */}
        <div className="order-2 lg:order-none lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-lg bg-white p-6 shadow-tarjeta sm:p-7">
            <div className="flex flex-wrap items-center gap-2.5">
              <EstadoBadge estado={unidad.estado} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gris-400">
                {unidad.marca} · {unidad.tipo}
              </span>
            </div>

            <h1 className="mt-4 font-display text-[34px] font-semibold leading-[1.05] tracking-[-0.015em] sm:text-[40px]">
              {unidad.nombre}
            </h1>

           

            <dl className="mt-6 flex gap-10">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gris-400">
                  Año
                </dt>
                <dd className="dato mt-1 text-lg font-semibold">{formatearAnio(unidad.anio)}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gris-400">
                  {tieneKilometraje(unidad.tipo) ? 'Kilómetros' : 'Configuración'}
                </dt>
                <dd className="dato mt-1 text-lg font-semibold">
                  {tieneKilometraje(unidad.tipo)
                    ? formatearKm(unidad.km)
                    : (unidad.potencia ?? '—')}
                </dd>
              </div>
            </dl>

            <a
              href={linkConsultaUnidad(unidad)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded bg-rojo text-[15px] font-semibold text-white transition-colors hover:bg-rojo-700 active:translate-y-px"
            >
              <IconoWhatsapp className="h-5 w-5" />
              Consultar por WhatsApp
            </a>
            <a
              href="#financiar-unidad"
              className="mt-2.5 inline-flex h-12 w-full items-center justify-center rounded bg-gris-100 text-[15px] font-semibold text-negro transition-colors hover:bg-gris-200"
            >
              Simular financiación
            </a>
          </div>

          {sucursal && (
            <div className="mt-4 rounded-lg bg-white p-6 shadow-tarjeta">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gris-400">
                Disponible en
              </p>
              <div className="mt-3 flex items-start gap-3">
                <IconoPin className="mt-0.5 h-5 w-5 shrink-0 text-rojo" />
                <div>
                  <p className="text-[17px] font-semibold leading-tight">{sucursal.nombre}</p>
                  <p className="mt-1 text-sm text-gris-600">{sucursal.direccion}</p>
                  <p className="text-[13px] text-gris-400">
                    {sucursal.localidad}, {sucursal.provincia}
                  </p>
                </div>
              </div>
              <a
                href={linkWhatsapp(
                  sucursal.asesor.whatsapp,
                  `Hola Decker, quiero coordinar una visita para ver ${unidad.nombre} en ${sucursal.nombre}.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded bg-gris-100 text-sm font-semibold text-negro transition-colors hover:bg-gris-200"
              >
                <IconoWhatsapp className="h-4 w-4 text-[#1FA855]" />
                Coordinar visita
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Sin fondo propio: el formulario blanco y el panel negro que van adentro
          ya se separan solos del lienzo gris. */}
      <section id="financiar-unidad" className="seccion scroll-mt-24">
        <div className="contenedor">
          <EncabezadoSeccion
            etiqueta="Financiación"
            titulo="Simulá esta unidad"
            descripcion={
              unidad.precio !== null
                ? 'Arranca con el precio publicado y la entrega sugerida. Cambiá lo que necesites y mandale la simulación al asesor de la sucursal.'
                : 'Esta unidad no tiene precio publicado: cargá el valor que te pase el asesor y simulá la operación.'
            }
          />
          <CalculadoraFinanciacion parametros={parametros} unidad={unidad} />
        </div>
      </section>

      {relacionadas.length > 0 && (
        <section className="seccion">
          <div className="contenedor">
            <EncabezadoSeccion
              etiqueta="También te puede servir"
              titulo="Unidades similares"
              accion={
                <Link
                  href="/catalogo"
                  className="inline-flex h-11 items-center rounded bg-gris-100 px-5 text-sm font-semibold text-negro transition-colors hover:bg-gris-200"
                >
                  Ver stock
                </Link>
              }
            />
            <UnidadGrilla unidades={relacionadas} />
          </div>
        </section>
      )}
    </>
  );
}

/** Sólo se listan los campos cargados: nada de filas con "—" por defecto. */
function armarEspecificaciones(unidad: Unidad): { etiqueta: string; valor: string }[] {
  const filas: { etiqueta: string; valor: string | undefined }[] = [
    { etiqueta: 'Marca', valor: unidad.marca },
    { etiqueta: 'Modelo', valor: unidad.modelo },
    { etiqueta: 'Tipo', valor: unidad.tipo },
    { etiqueta: 'Estado', valor: unidad.estado },
    { etiqueta: 'Año', valor: unidad.anio !== null ? String(unidad.anio) : undefined },
    {
      etiqueta: 'Kilómetros',
      valor:
        tieneKilometraje(unidad.tipo) && unidad.km !== null ? formatearKm(unidad.km) : undefined,
    },
    { etiqueta: 'Potencia / uso', valor: unidad.potencia },
    { etiqueta: 'Financiación', valor: unidad.financiacion },
  ];

  return filas.filter((fila): fila is { etiqueta: string; valor: string } => Boolean(fila.valor));
}
