import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BotonCompartir from '@/components/unidades/BotonCompartir';
import BotonComparar from '@/components/unidades/BotonComparar';
import BotonFavorito from '@/components/unidades/BotonFavorito';
import GaleriaUnidad from '@/components/unidades/GaleriaUnidad';
import Migas from '@/components/ui/Migas';
import RegistrarVisita from '@/components/unidades/RegistrarVisita';
import UnidadGrilla from '@/components/unidades/UnidadGrilla';
import CalculadoraFinanciacion from '@/components/financiacion/CalculadoraFinanciacion';
import EstadoBadge from '@/components/ui/EstadoBadge';
import EncabezadoSeccion from '@/components/ui/EncabezadoSeccion';
import {
  IconoCalendario,
  IconoMedidor,
  IconoPin,
  IconoPotencia,
  IconoWhatsapp,
} from '@/components/ui/Iconos';
import {
  getParametrosFinanciacion,
  getSlugsDeUnidades,
  getSucursalPorId,
  getUnidadPorSlug,
  getUnidadesRelacionadas,
} from '@/lib/api';
import {
  esCifra,
  formatearAnio,
  formatearKm,
  formatearPrecio,
  tieneKilometraje,
} from '@/lib/format';
import { linkConsultaUnidad, linkWhatsapp } from '@/lib/whatsapp';
import type { Sucursal, Unidad } from '@/lib/types';

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

/**
 * Ficha de una unidad.
 *
 * Es la pantalla donde más tiempo se queda alguien que de verdad está por
 * comprar, así que el orden no es de diseño: es el orden en que se evalúa una
 * compra. Primero se MIRA (galería), después se identifica y se ve cuánto sale
 * (nombre, precio, estado), después se pregunta (WhatsApp), después se escanea
 * lo básico (franja de specs), y recién al final se lee el detalle (ficha
 * técnica y descripción) —que es lo que se mira cuando la unidad ya interesa—.
 *
 * En desktop la columna de decisión se corre al costado y queda pegada al
 * scroll: se puede leer toda la ficha técnica sin perder de vista el precio ni
 * el botón de consulta. En mobile cae entera debajo de la galería, que es lo
 * mismo en una sola columna.
 */
export default async function FichaUnidad({ params }: Props) {
  const { slug } = await params;
  const unidad = await getUnidadPorSlug(slug);
  if (!unidad) notFound();

  const [sucursal, parametros, relacionadas] = await Promise.all([
    getSucursalPorId(unidad.sucursalId),
    getParametrosFinanciacion(),
    getUnidadesRelacionadas(unidad.slug),
  ]);

  const especificaciones = armarEspecificaciones(unidad, sucursal);
  const esenciales = armarEsenciales(unidad, sucursal);

  return (
    <>
      <RegistrarVisita slug={unidad.slug} />

      {/* Cuatro niveles, con la MARCA en el medio: quien llega por un link
          compartido cae en una unidad suelta y necesita una salida más corta
          que "todo el stock". "Volvo" lo lleva a los camiones Volvo, que es
          el vecindario de lo que estaba mirando. */}
      <Migas
        base="https://deckercamiones.com.ar"
        niveles={[
          { texto: 'Inicio', href: '/' },
          { texto: 'Stock', href: '/catalogo' },
          {
            texto: unidad.marca,
            href: `/catalogo?marca=${encodeURIComponent(unidad.marca)}`,
          },
          { texto: unidad.nombre },
        ]}
      />

      {/* Tres bloques con orden distinto por breakpoint.

          En mobile: galería → bloque de decisión → specs, ficha y descripción.
          Si la tarjeta de decisión va al final —que es lo que pasa si sigue el
          orden de columnas de desktop—, el precio y el botón de WhatsApp quedan
          a más de una pantalla y media de scroll.

          En desktop la tarjeta se corre a la columna derecha y ocupa las dos
          filas, quedando sticky al costado. */}
      <div className="contenedor grid gap-10 py-10 lg:grid-cols-[1.35fr_1fr] lg:gap-x-16 lg:gap-y-14 lg:py-14">
        {/* 1. LA GALERÍA. Es lo más grande de la página y por eso se lleva la
            columna ancha: en un usado, la foto ES el dato —el estado de la
            chapa, de las cubiertas y de la cabina no se escriben en una tabla—. */}
        <div className="order-1 lg:order-none lg:col-start-1 lg:row-start-1">
          <GaleriaUnidad fotos={unidad.galeria} nombre={unidad.nombre} estado={unidad.estado} />
        </div>

        {/* 2 y 3. IDENTIDAD Y ACCIONES, en la misma superficie.
            Nombre, precio y estado son lo que identifica; los botones son lo
            que se hace con eso. Separarlos en dos tarjetas obligaría a leer el
            precio en una y a bajar a otra para preguntar por él. */}
        <div className="order-2 lg:order-none lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-24 lg:self-start">
          {/* Nivel 2 de elevación, un escalón por encima del resto de la
              página: es la columna con la que se decide, y tiene que leerse
              como que está apoyada más arriba que la ficha. */}
          <div className="rounded-lg bg-white p-6 shadow-nivel-2 sm:p-8">
            {/* Los badges que ubican la unidad: en qué condición está, en qué
                agencia y qué es. Van arriba del nombre porque son la etiqueta
                de lo que se está por leer, no un dato más.

                Los TRES son píldoras de la misma familia. El tipo iba como
                texto suelto al lado de dos píldoras, y en el teléfono la fila
                envolvía dejándolo solo en el renglón de abajo: se leía como un
                rótulo huérfano y no como el tercero de un conjunto. */}
            <div className="flex flex-wrap items-center gap-2">
              <EstadoBadge estado={unidad.estado} />
              {sucursal && (
                <span className="centrado-optico inline-flex h-5 items-center gap-1 rounded-sm bg-gris-100 px-2 text-2xs font-medium leading-none tracking-[0.04em] text-gris-600">
                  <IconoPin className="h-3 w-3 shrink-0 text-gris-500" />
                  {sucursal.nombre}
                </span>
              )}
              <span className="centrado-optico inline-flex h-5 items-center rounded-sm bg-gris-100 px-2 text-2xs font-medium leading-none tracking-[0.04em] text-gris-600">
                {unidad.tipo}
              </span>
            </div>

            {/* El nombre es el texto más pesado de la página después del
                titular del sitio: Overpass 900 a 40px. Compite con el precio
                por peso, no por tamaño —los dos miden lo mismo y el nombre es
                el que está en negro macizo—. */}
            <h1 className="titulo-expresivo mt-4 text-3xl sm:text-4xl">{unidad.nombre}</h1>

            {/**
             * El precio, arriba de todo lo demás.
             *
             * La columna se llamaba "de decisión" y no traía el dato con el que
             * se decide: quedaban el año, los kilómetros y tres botones. Quien
             * llega acá desde un link compartido no tenía forma de saber si la
             * unidad está en su presupuesto sin escribirle a un asesor, que es
             * exactamente el paso que el sitio existe para ahorrar.
             *
             * Va con `dato` —cifras de ancho fijo— para que se lea como un dato
             * duro y no como parte del texto corrido, que es lo que lo separa
             * del nombre que tiene encima.
             *
             * Sin precio cargado se dice qué hacer —consultarlo— y el botón de
             * abajo es esa consulta. Un "—" o un precio en cero serían peores
             * que no mostrar nada: uno parece un error y el otro, una ganga.
             */}
            {unidad.precio !== null ? (
              <p className="dato mt-5 text-4xl font-medium leading-none text-negro">
                {formatearPrecio(unidad.precio)}
              </p>
            ) : (
              <p className="mt-5 text-md font-medium text-gris-500">
                Precio a consultar con el asesor
              </p>
            )}

            {/**
             * Las acciones, todas juntas y en un solo orden de importancia.
             *
             * WhatsApp es el control más grande y de más contraste de la
             * página: 56px de alto y rojo pleno. Es por donde pasa toda la
             * operación de esta agencia y no tiene que competir con nada.
             *
             * "Simular financiación" va debajo, en gris: es la única pantalla
             * donde vive esta acción —se sacó de las tarjetas del catálogo,
             * donde eran nueve botones en pantalla para una cuenta que necesita
             * el precio de UNA unidad puntual—.
             *
             * Guardar y compartir bajan a íconos. Antes el corazón estaba
             * arriba a la derecha, lejos de todo, y compartir era un tercer
             * botón a todo el ancho que pesaba lo mismo que simular la
             * financiación. Son acciones de dos segundos: se agrupan al pie del
             * bloque, con la mitad de alto y sin superficie de color.
             */}
            <div className="mt-7">
              <a
                href={linkConsultaUnidad(unidad)}
                target="_blank"
                rel="noopener noreferrer"
                className="centrado-optico inline-flex h-14 w-full items-center justify-center gap-2 rounded bg-rojo text-md font-medium text-white transition-colors duration-rapido hover:bg-rojo-700 active:translate-y-px"
              >
                <IconoWhatsapp className="h-5 w-5" />
                Consultar por WhatsApp
              </a>
              <a
                href="#financiar-unidad"
                className="centrado-optico mt-2 inline-flex h-12 w-full items-center justify-center rounded bg-gris-100 text-base font-medium text-negro transition-colors duration-rapido hover:bg-gris-200"
              >
                Simular financiación
              </a>

              <div className="mt-3 flex items-center gap-1 border-t border-gris-200 pt-3">
                <BotonFavorito
                  slug={unidad.slug}
                  nombre={unidad.nombre}
                  variante="superficie"
                  className="-ml-1"
                />
                <BotonCompartir
                  titulo={`${unidad.nombre} | Decker Camiones`}
                  descripcion={unidad.descripcion}
                  ruta={`/unidad/${unidad.slug}`}
                  variante="icono"
                />
                {/* Comparar también vive acá: la unidad que se está mirando es
                    justo la que se quiere poner al lado de otra, y hasta ahora
                    la casilla sólo existía en el catálogo —había que volver
                    atrás para marcarla—. */}
                <BotonComparar slug={unidad.slug} nombre={unidad.nombre} className="ml-auto" />
              </div>
            </div>
          </div>

          {sucursal && (
            <div className="mt-5 rounded-lg bg-white p-6 shadow-nivel-1 sm:p-8">
              <p className="rotulo-dato">Disponible en</p>
              <div className="mt-3 flex items-start gap-3">
                <IconoPin className="mt-0.5 h-5 w-5 shrink-0 text-rojo" />
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
                className="centrado-optico mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded bg-gris-100 text-sm font-medium text-negro transition-colors duration-rapido hover:bg-gris-200"
              >
                <IconoWhatsapp className="h-4 w-4 text-[#1FA855]" />
                Coordinar visita
              </a>
            </div>
          )}
        </div>

        <div className="order-3 lg:order-none lg:col-start-1 lg:row-start-2">
          {/**
           * 4. LA FRANJA DE ESENCIALES.
           *
           * Cuatro datos, cuatro íconos, un solo barrido del ojo. Es el resumen
           * que dice si la unidad entra o no entra, antes de leer nada: cuántos
           * años tiene, cuánto anduvo, con qué motor y dónde está.
           *
           * Mismo lenguaje que la tarjeta del catálogo —rótulo chico arriba,
           * ícono gris y valor en negro— para que el que viene del listado
           * reconozca los datos en el mismo lugar visual. El valor sube a 19px:
           * acá no compite con nada, y es lo que se lee de parado con el
           * teléfono en la mano.
           *
           * Los cuatro slots existen siempre. Un semi no tiene cuentakilómetros
           * y ahí dice "No aplica", que es distinto de "Consultar": uno es un
           * dato que no existe y el otro uno que hay que pedir.
           */}
          <section aria-label="Datos principales">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md bg-gris-200 shadow-nivel-1 sm:grid-cols-4">
              {esenciales.map((dato) => (
                <div key={dato.etiqueta} className="min-w-0 bg-white p-4 sm:p-5">
                  <p className="rotulo-dato">{dato.etiqueta}</p>
                  {/* El valor ENVUELVE, no se corta.
                      En el teléfono la franja va a dos columnas y cada celda
                      queda en ~146px útiles: "Mar del Plata" se cortaba en "Mar
                      del Pl…" y "Comodoro Rivadavia" antes todavía. Es uno de
                      los cuatro datos que la franja existe para dar; cortado no
                      sirve. Como las celdas de una grilla estiran parejo, el
                      renglón de más lo pagan las cuatro y la franja sigue
                      alineada.
                      El ícono se alinea con el PRIMER renglón —`items-start`
                      más un pelo de aire— y no con el centro de dos. */}
                  <p className="mt-1.5 flex items-start gap-2">
                    <dato.Icono className="mt-1.5 h-4 w-4 shrink-0 text-gris-400" />
                    <span
                      className={`min-w-0 text-md font-medium leading-snug text-negro ${
                        esCifra(dato.valor) ? 'dato' : ''
                      }`}
                    >
                      {dato.valor}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/**
           * 5. LA FICHA TÉCNICA.
           *
           * Es el elemento más distintivo del sitio y acá se lleva hasta el
           * final: superficie propia, cabecera con la referencia de la unidad,
           * rótulos livianos y valores alineados a la derecha. Con
           * `tabular-nums`, los años, los kilómetros y el precio caen uno
           * debajo del otro dígito por dígito, que es lo que hace que se lea
           * como una planilla de fábrica y no como texto suelto.
           *
           * La guía punteada no es adorno: en el teléfono, con las filas a lo
           * ancho de la pantalla, es lo que evita perder el renglón entre el
           * rótulo y el número.
           *
           * Ahora están TODOS los campos, incluidos precio y sucursal, y los
           * que no tienen dato cargado dicen "Consultar" en vez de faltar. Que
           * una fila desaparezca sin avisar deja dos fichas distintas del mismo
           * modelo con distinta cantidad de renglones, y quien las compara no
           * tiene forma de saber si el campo no aplica o si nadie lo cargó.
           */}
          <section className="mt-14">
            <h2 className="font-display text-2xl font-extrabold">Ficha técnica</h2>

            <div className="mt-6 rounded-md bg-white p-6 shadow-nivel-1 sm:p-10">
              <div className="flex items-baseline justify-between gap-4 border-b-2 border-negro pb-3">
                <p className="etiqueta text-negro">Especificaciones</p>
                <p className="text-2xs text-gris-500">Ref · {unidad.slug}</p>
              </div>

              <dl className="sm:grid sm:grid-cols-2 sm:gap-x-16">
                {especificaciones.map((spec) => (
                  <div key={spec.etiqueta} className="ficha-fila">
                    <dt className="rotulo-dato shrink-0">{spec.etiqueta}</dt>
                    <span aria-hidden="true" className="ficha-guia" />
                    {/* El ancho fijo SÓLO para cifras: ver `esCifra`. "Volvo" o
                        "Disponible" en tabular no ganan nada. La alineación a
                        la derecha se mantiene en los dos casos, que es lo que
                        sostiene la columna. */}
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

          {/* 6. LA DESCRIPCIÓN, al final. Es lo único de la página escrito por
              una persona y no medido: se lee cuando la unidad ya pasó todos los
              filtros de arriba. */}
          <section className="mt-14">
            <h2 className="font-display text-2xl font-extrabold">Descripción</h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-gris-600">
              {unidad.descripcion}
            </p>
          </section>
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
                  className="centrado-optico inline-flex h-11 items-center rounded bg-gris-100 px-6 text-sm font-medium text-negro transition-colors duration-rapido hover:bg-gris-200"
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

/**
 * Los cuatro datos de la franja de arriba: los que descartan una unidad.
 *
 * Son los mismos que muestra la tarjeta del catálogo más la potencia, que en el
 * listado no entraba y acá sí: en la lista se descarta por presupuesto y
 * antigüedad, en la ficha ya se está evaluando el fierro.
 */
function armarEsenciales(unidad: Unidad, sucursal: Sucursal | null) {
  return [
    { Icono: IconoCalendario, etiqueta: 'Año', valor: formatearAnio(unidad.anio) },
    {
      Icono: IconoMedidor,
      etiqueta: 'Kilómetros',
      // Un semi o una batea no tienen cuentakilómetros. "No aplica" y no
      // "Consultar": el dato no existe, no es que falte cargarlo.
      valor: tieneKilometraje(unidad.tipo) ? formatearKm(unidad.km) : 'No aplica',
    },
    { Icono: IconoPotencia, etiqueta: 'Potencia / uso', valor: unidad.potencia ?? 'Consultar' },
    { Icono: IconoPin, etiqueta: 'Sucursal', valor: sucursal?.nombre ?? 'Consultar' },
  ];
}

/**
 * La ficha técnica completa: TODOS los campos, siempre las mismas filas.
 *
 * Antes se filtraban los campos sin cargar, con el argumento de no dejar filas
 * con un guión. El efecto era otro: dos unidades del mismo tipo mostraban
 * fichas de distinto largo, y no había forma de distinguir "este dato no
 * aplica" de "nadie lo cargó todavía". La regla del sitio ya estaba escrita en
 * `lib/format`: lo que falta se pide, y se dice "Consultar".
 */
function armarEspecificaciones(
  unidad: Unidad,
  sucursal: Sucursal | null,
): { etiqueta: string; valor: string }[] {
  return [
    { etiqueta: 'Marca', valor: unidad.marca },
    { etiqueta: 'Modelo', valor: unidad.modelo },
    { etiqueta: 'Tipo', valor: unidad.tipo },
    { etiqueta: 'Condición', valor: unidad.estado },
    { etiqueta: 'Año', valor: formatearAnio(unidad.anio) },
    {
      etiqueta: 'Kilómetros',
      valor: tieneKilometraje(unidad.tipo) ? formatearKm(unidad.km) : 'No aplica',
    },
    { etiqueta: 'Potencia / uso', valor: unidad.potencia ?? 'Consultar' },
    { etiqueta: 'Precio', valor: formatearPrecio(unidad.precio) },
    { etiqueta: 'Financiación', valor: unidad.financiacion },
    { etiqueta: 'Sucursal', valor: sucursal?.nombre ?? 'Consultar' },
  ];
}
