import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BotonCompartir from '@/components/unidades/BotonCompartir';
import BotonFavorito from '@/components/unidades/BotonFavorito';
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
import { esCifra, formatearAnio, formatearKm, tieneKilometraje } from '@/lib/format';
import { linkConsultaUnidad, linkWhatsapp } from '@/lib/whatsapp';
import type { Unidad } from '@/lib/types';

interface Props {
  // Promise desde Next 15. `generateStaticParams` sigue devolviendo objetos
  // planos: el cambio es sólo en lo que recibe la página.
  params: Promise<{ slug: string }>;
}

/** Todas las fichas se generan estáticas en el build. */
export async function generateStaticParams() {
  const slugs = await getSlugsDeUnidades();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const unidad = await getUnidadPorSlug(slug);
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
  const { slug } = await params;
  const unidad = await getUnidadPorSlug(slug);
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
        <div className="contenedor flex items-center gap-2 pb-4 pt-24 text-sm text-gris-500">
          {/* `-my-1 py-1`: los enlaces de la miga medían 20px de alto, abajo de
              los 24 que pide WCAG 2.5.8. El margen negativo devuelve el espacio,
              así que crece el área tocable y la fila se ve igual. */}
          <Link href="/" className="-my-1 py-1 transition-colors hover:text-negro">
            Inicio
          </Link>
          {/* gris-300 sobre el lienzo daba 1.4:1: la barra se veía como un
              renglón vacío entre los dos enlaces. gris-500 la deja legible sin
              que compite con el nombre de la unidad, que es lo que manda acá. */}
          <span aria-hidden="true" className="text-gris-500">
            /
          </span>
          <Link href="/catalogo" className="-my-1 py-1 transition-colors hover:text-negro">
            Stock
          </Link>
          {/* gris-300 sobre el lienzo daba 1.4:1: la barra se veía como un
              renglón vacío entre los dos enlaces. gris-500 la deja legible sin
              que compite con el nombre de la unidad, que es lo que manda acá. */}
          <span aria-hidden="true" className="text-gris-500">
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
      <div className="contenedor grid gap-12 py-12 lg:grid-cols-[1.3fr_1fr] lg:gap-x-16 lg:gap-y-16 lg:py-16">
        <div className="order-1 lg:order-none lg:col-start-1 lg:row-start-1">
          <GaleriaUnidad fotos={unidad.galeria} nombre={unidad.nombre} estado={unidad.estado} />
        </div>

        <div className="order-3 lg:order-none lg:col-start-1 lg:row-start-2">
          {/**
           * Ficha técnica.
           *
           * Es el elemento más distintivo del sitio y acá se lleva hasta el
           * final: superficie propia, cabecera con la referencia de la unidad,
           * rótulos en versalitas y valores en mono alineados a la derecha.
           * Con `tabular-nums`, los años y los kilómetros caen uno debajo del
           * otro dígito por dígito, que es lo que hace que se lean como una
           * planilla de fábrica y no como texto suelto.
           *
           * La guía punteada no es adorno: en el teléfono, con las filas a lo
           * ancho de la pantalla, es lo que evita perder el renglón entre el
           * rótulo y el número.
           */}
          <section>
            <h2 className="font-display text-2xl font-extrabold">Ficha técnica</h2>

            <div className="mt-8 rounded-md bg-white p-8 shadow-nivel-1 sm:p-10">
              <div className="flex items-baseline justify-between gap-4 border-b-2 border-negro pb-3">
                <p className="etiqueta text-negro">Especificaciones</p>
                <p className="text-2xs text-gris-500">Ref · {unidad.slug}</p>
              </div>

              <dl className="sm:grid sm:grid-cols-2 sm:gap-x-16">
                {especificaciones.map((spec) => (
                  <div key={spec.etiqueta} className="ficha-fila">
                    <dt className="rotulo-dato shrink-0">{spec.etiqueta}</dt>
                    <span aria-hidden="true" className="ficha-guia" />
                    {/* Mono SÓLO para cifras: ver `esCifra`. "Volvo" o
                        "Disponible" en ancho fijo se leen como otra tipografía.
                        La alineación a la derecha se mantiene en los dos casos,
                        que es lo que sostiene la columna. */}
                    <dd
                      className={`shrink-0 text-right text-sm font-medium text-negro ${
                        esCifra(spec.valor) ? 'dato-columna' : ''
                      }`}
                    >
                      {spec.valor}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          <section className="mt-16">
            <h2 className="font-display text-2xl font-extrabold">Descripción</h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-gris-600">
              {unidad.descripcion}
            </p>
          </section>
        </div>

        {/* Columna de decisión: precio, contacto y sucursal, siempre a mano.
            En mobile va segunda, justo debajo de la galería. */}
        <div className="order-2 lg:order-none lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-24 lg:self-start">
          {/* Nivel 2 de elevación, un escalón por encima del resto de la
              página: es la columna con la que se decide, y tiene que leerse
              como que está apoyada más arriba que la ficha. */}
          <div className="rounded-lg bg-white p-8 shadow-nivel-2 sm:p-10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <EstadoBadge estado={unidad.estado} />
                <span className="rotulo-dato">
                  {unidad.marca} · {unidad.tipo}
                </span>
              </div>
              {/* Guardar está arriba, a la altura del nombre: es una decisión
                  que se toma al leer la unidad, no después de bajar hasta los
                  botones de contacto. */}
              <BotonFavorito
                slug={unidad.slug}
                nombre={unidad.nombre}
                variante="superficie"
                className="-mr-1 -mt-1 shrink-0"
              />
            </div>

            <h1 className="titulo-expresivo mt-4 text-3xl sm:text-4xl">
              {unidad.nombre}
            </h1>

            <dl className="mt-6 flex gap-8">
              {/* Los dos valores caen en palabra más seguido de lo que parece:
                  "Consultar" cuando el dato no está cargado, y la configuración
                  —"Carga pesada"— en un semi o una batea, que no llevan
                  kilometraje. Por eso el ancho fijo se decide por el valor y no
                  por la fila. */}
              <div>
                <dt className="rotulo-dato">Año</dt>
                <dd
                  className={`mt-1 text-lg font-medium ${
                    esCifra(formatearAnio(unidad.anio)) ? 'dato' : ''
                  }`}
                >
                  {formatearAnio(unidad.anio)}
                </dd>
              </div>
              <div>
                <dt className="rotulo-dato">
                  {tieneKilometraje(unidad.tipo) ? 'Kilómetros' : 'Configuración'}
                </dt>
                {(() => {
                  const valor = tieneKilometraje(unidad.tipo)
                    ? formatearKm(unidad.km)
                    : (unidad.potencia ?? '—');
                  return (
                    <dd className={`mt-1 text-lg font-medium ${esCifra(valor) ? 'dato' : ''}`}>
                      {valor}
                    </dd>
                  );
                })()}
              </div>
            </dl>

            <a
              href={linkConsultaUnidad(unidad)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded bg-rojo text-base font-medium text-negro transition-colors duration-rapido hover:bg-rojo-700 active:translate-y-px"
            >
              <IconoWhatsapp className="h-5 w-5" />
              Consultar por WhatsApp
            </a>
            <a
              href="#financiar-unidad"
              className="mt-2 inline-flex h-12 w-full items-center justify-center rounded bg-gris-100 text-base font-medium text-negro transition-colors duration-rapido hover:bg-gris-200"
            >
              Simular financiación
            </a>

            <BotonCompartir
              titulo={`${unidad.nombre} | Decker Camiones`}
              descripcion={unidad.descripcion}
              ruta={`/unidad/${unidad.slug}`}
              className="mt-2"
            />
          </div>

          {sucursal && (
            <div className="mt-6 rounded-lg bg-white p-8 shadow-nivel-1">
              <p className="rotulo-dato">Disponible en</p>
              <div className="mt-3 flex items-start gap-3">
                <IconoPin className="mt-0.5 h-5 w-5 shrink-0 text-rojo-800" />
                <div>
                  <p className="text-md font-medium leading-tight">{sucursal.nombre}</p>
                  <p className="mt-1 text-sm text-gris-600">{sucursal.direccion}</p>
                  <p className="text-sm text-gris-500">
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
                className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded bg-gris-100 text-sm font-medium text-negro transition-colors duration-rapido hover:bg-gris-200"
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
                  className="inline-flex h-11 items-center rounded bg-gris-100 px-6 text-sm font-medium text-negro transition-colors duration-rapido hover:bg-gris-200"
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
