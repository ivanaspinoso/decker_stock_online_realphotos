import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BotonCompartir from '@/components/unidades/BotonCompartir';
import BotonConsultar from '@/components/unidades/BotonConsultar';
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
  getGaleriaDeUnidad,
  getParametrosFinanciacion,
  getSucursalPorId,
  getUnidadPorSlug,
  getUnidadesRelacionadas,
} from '@/lib/api';
import {
  esCifra,
  formatearAnio,
  formatearKm,
  formatearPrecioDeUnidad,
  monedaDeUnidad,
  resumenTecnico,
  tieneKilometraje,
  tienePrecio,
} from '@/lib/format';
import { linkConsultaUnidad, linkWhatsapp } from '@/lib/whatsapp';
import type { Sucursal, Unidad } from '@/lib/types';

interface Props {
  // Promise desde Next 15: la página empieza a renderizar antes de que se
  // conozca el slug, y recién se espera cuando se usa.
  params: Promise<{ slug: string }>;
}


/**
 * `notFound()` VA ACÁ Y NO SÓLO EN LA PÁGINA, y el motivo es el código HTTP.
 *
 * Esta ruta es dinámica y va en streaming: en cuanto hay un límite de Suspense
 * por encima, el envase de la página sale por la red antes de terminar de
 * renderizar, y una vez que salió el código de respuesta ya está mandado. Un
 * `notFound()` posterior dibuja "no encontramos esta unidad" con un **200 OK**:
 * un soft 404. En un catálogo donde las unidades se venden y sus URLs quedan
 * dando vueltas en links, marcadores y el índice de Google, eso es la
 * diferencia entre que Google las saque o las deje ahí para siempre.
 *
 * `generateMetadata` corre ANTES de que se mande nada, así que un `notFound()`
 * desde acá sí llega a poner el 404. La página lo vuelve a chequear igual: es
 * la que sabe qué hacer con la unidad y no puede depender de que otra función
 * haya cortado antes.
 *
 * LO OTRO QUE HAY QUE NO ROMPER: esta ficha NO tiene `loading.tsx`, y el de la
 * home vive en `app/(home)/` y no en `app/` justamente por esto. Un
 * `loading.tsx` en la raíz cubre por herencia todas las rutas que no tengan el
 * suyo, incluida ésta, y vuelve el 404 un 200. Si alguien agrega uno acá o lo
 * sube a la raíz, el soft 404 vuelve sin que nada falle ni avise.
 *
 * Se midió antes de sacarlo: una ficha nunca visitada, con su llamada de fotos
 * incluida, tarda entre 0,28 y 0,43 segundos. Un esqueleto para eso no se
 * alcanza a ver. La home y el catálogo sí lo conservan, porque ahí no hay
 * ningún `notFound()` que perder y la espera en frío sí es de segundos.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const unidad = await getUnidadPorSlug(slug);
  if (!unidad) notFound();

  const sucursal = await getSucursalPorId(unidad.sucursalId);

  return {
    title: unidad.nombre,
    /* Con la descripción del aviso si existe —57 de 240 la tienen— y con la
       ficha técnica si no: lo que Google muestra debajo del título no puede
       quedar en blanco en tres de cada cuatro unidades. */
    description: `${unidad.nombre} · ${unidad.estado} · ${sucursal?.nombre ?? ''}. ${
      unidad.descripcion || resumenTecnico(unidad.ficha)
    }`,
    openGraph: {
      title: `${unidad.nombre} | Decker Camiones`,
      description: unidad.descripcion || resumenTecnico(unidad.ficha),
      /**
       * LA IMAGEN DE MARCA, NO LA FOTO DE LA UNIDAD, Y ES A PROPÓSITO.
       *
       * La foto de la unidad vive en el server de Decker, que bloquea por IP
       * cuando se le pide de más y entonces no contesta nada. WhatsApp y
       * Facebook bajan la miniatura UNA vez, cuando alguien pega el link, y no
       * reintentan: si en ese momento el server está bloqueado, el link se
       * comparte pelado —sin imagen y a veces sin título— y así queda cacheado
       * del lado de ellos por días.
       *
       * Un link que a veces se ve bien y a veces no es peor que uno que siempre
       * se ve igual. Se pierde mostrar el camión en la previsualización; se gana
       * que la previsualización exista siempre. El título y la descripción sí
       * son de la unidad, así que el link igual dice de qué camión se trata.
       *
       * El día que las fotos estén en un CDN, acá vuelve `unidad.imagen`.
       */
      // Relativa: `metadataBase` de `app/layout.tsx` la vuelve absoluta.
      images: [{ url: '/marca/og.jpg' }],
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

  // La galería es la única de las cuatro que sale de un endpoint propio
  // (`/vehiculos/{id}/imagenes`): el listado sólo trae la miniatura. Va en el
  // mismo `Promise.all` para que ese pedido viaje en paralelo con el resto y no
  // sume su latencia a la de la página.
  const [sucursal, parametros, relacionadas, galeria] = await Promise.all([
    getSucursalPorId(unidad.sucursalId),
    getParametrosFinanciacion(),
    getUnidadesRelacionadas(unidad.slug),
    getGaleriaDeUnidad(unidad),
  ]);

  const especificaciones = armarEspecificaciones(unidad);
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
          <GaleriaUnidad fotos={galeria} nombre={unidad.nombre} estado={unidad.estado} />
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
            {tienePrecio(unidad) ? (
              /* La moneda al lado del importe: el catálogo tiene camiones en
                 dólares y remolques en pesos, y el símbolo solo no alcanza
                 para distinguirlos de un vistazo. */
              <p className="mt-5 flex items-baseline gap-2">
                <span className="dato text-4xl font-medium leading-none text-negro">
                  {formatearPrecioDeUnidad(unidad)}
                </span>
                <span className="text-sm text-gris-500">{monedaDeUnidad(unidad)}</span>
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
              <BotonConsultar slug={unidad.slug} href={linkConsultaUnidad(unidad)} />
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
                  descripcion={unidad.descripcion || resumenTecnico(unidad.ficha)}
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
           * QUÉ ENTRA ACÁ: sólo la ficha técnica del backend —motor, tracción,
           * frenos, dirección, largo, color—. Marca, modelo, tipo, condición,
           * año, kilómetros, potencia, precio y sucursal salieron: ya están en
           * el título, en los chips y en la tira de datos de arriba, y bajar
           * hasta acá para releerlos no le daba nada a nadie.
           *
           * Las filas sin dato no se dibujan. Es lo contrario de lo que decía
           * este comentario antes —"que todas digan Consultar para que dos
           * fichas tengan el mismo largo"— y el cambio lo trajo el dato real:
           * la carga del backend es tan despareja (equipamiento en 3 unidades
           * de 240) que la regla vieja producía tablas de ocho "Consultar" y un
           * dato. Una tabla así no informa, ocupa.
           *
           * La sección entera desaparece si no quedó ninguna fila.
           */}
          {especificaciones.length > 0 && (
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
          )}

          {/* 6. LA DESCRIPCIÓN, al final. Es lo único de la página escrito por
              una persona y no medido: se lee cuando la unidad ya pasó todos los
              filtros de arriba. */}
          {/* Sólo si el aviso trae texto propio. Antes esta sección mostraba
              la ficha técnica concatenada en prosa —"Tracción: 4 X 2.
              Combustible: DIESEL."— porque el mapeo la componía cuando el
              backend no mandaba descripción. Esos datos ahora están arriba, en
              su tabla; acá quedó lo que de verdad escribió alguien de Decker, y
              en las 183 unidades donde no escribió nada la sección no aparece
              en vez de repetir la tabla en párrafo. */}
          {unidad.descripcion && (
            <section className="mt-14">
              <h2 className="font-display text-2xl font-extrabold">Descripción</h2>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-gris-600">
                {unidad.descripcion}
              </p>
            </section>
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
              tienePrecio(unidad)
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
function armarEspecificaciones(unidad: Unidad): { etiqueta: string; valor: string }[] {
  const { ficha } = unidad;

  /**
   * SÓLO LO QUE NO ESTÁ YA ARRIBA. La tabla llegó a repetir nueve datos que la
   * pantalla mostraba dos veces: marca y modelo están en el título, tipo y
   * condición en los chips del panel, año, kilómetros, potencia y sucursal en
   * la tira de datos, y el precio en el panel de la derecha. Bajar hasta una
   * "ficha técnica" para releer lo mismo es trabajo del visitante a cambio de
   * nada.
   *
   * Lo que sí va acá es lo que no entra arriba: la ficha técnica que manda el
   * backend. Tracción, frenos, dirección y largo son los datos con los que se
   * decide entre dos camiones parecidos, y hasta ahora vivían escondidos dentro
   * del párrafo de descripción.
   */
  const filas = [
    { etiqueta: 'Motor', valor: ficha.motor },
    { etiqueta: 'Combustible', valor: ficha.combustible },
    { etiqueta: 'Tracción', valor: ficha.traccion },
    { etiqueta: 'Frenos', valor: ficha.frenos },
    { etiqueta: 'Dirección', valor: ficha.direccion },
    { etiqueta: 'Largo / configuración', valor: ficha.largo },
    { etiqueta: 'Color', valor: ficha.color },
    { etiqueta: 'Equipamiento', valor: ficha.equipamiento },
  ];

  /* Sin filas de relleno: la carga del backend es despareja —el equipamiento
     aparece en 3 unidades de 240— y una tabla mayormente "Consultar" no informa,
     sólo ocupa. Lo que falta se pregunta por WhatsApp, que está al lado. */
  return filas.filter((f): f is { etiqueta: string; valor: string } => Boolean(f.valor));
}
