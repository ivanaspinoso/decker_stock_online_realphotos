import Link from 'next/link';
import BotonFavorito from '@/components/unidades/BotonFavorito';
import BotonComparar from '@/components/unidades/BotonComparar';
import EstadoBadge from '@/components/ui/EstadoBadge';
import FotoUnidad from '@/components/unidades/FotoUnidad';
import {
  IconoCalendario,
  IconoCheck,
  IconoMedidor,
  IconoPin,
  IconoPotencia,
  IconoWhatsapp,
} from '@/components/ui/Iconos';
import {
  esCifra,
  formatearAnio,
  formatearKm,
  formatearPrecioDeUnidad,
  resumenTecnico,
  tieneKilometraje,
  tienePrecio,
} from '@/lib/format';
import { linkConsultaUnidad, nombreDeSucursal } from '@/lib/whatsapp';
import type { Unidad } from '@/lib/types';

/**
 * Tarjeta de la vista grilla.
 *
 * Trae lo justo para DESCARTAR sin abrir la unidad: foto, nombre, precio, año,
 * uso y sucursal. Todo eso está siempre a la vista, sin hover y sin desplegar
 * nada —el hover no existe en un teléfono, y un dato que hay que descubrir es
 * un dato que no está—.
 *
 * Dejó de intentar ser la ficha completa. Traía marca, modelo y potencia además
 * de lo anterior, y marca y modelo ya estaban adentro del nombre: la tarjeta
 * medía 794px de alto en un teléfono de 844, o sea una por pantalla, repitiendo
 * la marca tres veces. Lo que se sacó no se escondió: está en la ficha, que es
 * donde se evalúa una unidad después de haberla elegido de la lista.
 *
 * Los campos que todavía no están cargados se muestran igual, como "Consultar":
 * el comprador tiene que ver que el dato existe y hay que pedirlo, no que falta.
 *
 * La superficie es una sola —foto y contenido sin línea divisoria— y la
 * separación con el fondo la da la elevación, no un marco de 1px.
 */
export default function UnidadCard({
  unidad,
  indice,
}: {
  unidad: Unidad;
  /**
   * Posición en la grilla. Sólo la manda el catálogo, para escalonar la
   * entrada de las tarjetas cuando cambia un filtro. Sin `indice` la tarjeta
   * no anima: en la home y en "unidades similares" no hay nada que anunciar.
   */
  indice?: number;
}) {
  // Semis y bateas no llevan cuentakilómetros: ahí el slot cambia de rótulo.
  const muestraKm = tieneKilometraje(unidad.tipo);

  /**
   * TRES slots, siempre los mismos y siempre en el mismo orden.
   *
   * Antes eran seis filas y dos de ellas —Marca y Modelo— repetían lo que ya
   * decía el título: "Volvo FM 420 0 KM" traía la marca y el modelo adentro, y
   * abajo estaban otra vez como pares rótulo/valor. Sumado a la volanta
   * "Volvo · Camión" y al badge de tipo sobre la foto, la marca aparecía TRES
   * veces en la misma tarjeta y el tipo dos. Medida en un teléfono de 844px de
   * alto, la tarjeta daba 794: una por pantalla, y la mitad era repetición.
   *
   * Lo que queda es lo que se necesita para decidir si vale la pena entrar:
   * año, uso y dónde está. Potencia se fue a la ficha —es un dato de
   * evaluación, no de descarte—.
   *
   * El largo FIJO además arregla la alineación: con la lista variable, una
   * batea (sin kilómetros) corría "Sucursal" a otra altura, y las tres
   * tarjetas de una fila del catálogo mostraban sus datos en renglones
   * distintos. Ahora el slot del medio cambia de rótulo, no de existencia.
   */
  const especificaciones = [
    { Icono: IconoCalendario, etiqueta: 'Año', valor: formatearAnio(unidad.anio) },
    muestraKm
      /* CON el "km" de vuelta. Se lo había sacado porque el rótulo de arriba
         lo decía; ahora que no hay rótulo, "1.145.960" a secas no dice de qué
         es. El ícono del medidor ayuda pero no alcanza: al lado de un año de
         cuatro cifras, un número largo sin unidad se lee como precio. */
      ? { Icono: IconoMedidor, etiqueta: 'Kilómetros', valor: formatearKm(unidad.km) }
      : { Icono: IconoPotencia, etiqueta: 'Configuración', valor: unidad.potencia ?? 'Consultar' },
    { Icono: IconoPin, etiqueta: 'Sucursal', valor: nombreDeSucursal(unidad.sucursalId) },
  ];

  const resumen = unidad.descripcion || resumenTecnico(unidad.ficha);

  /* El escalonado se corta en la octava tarjeta: más allá, la última de una
     grilla de treinta esperaría más de un segundo para aparecer. 40ms es el
     paso más corto que todavía se lee como secuencia y no como parpadeo. */
  const animada = indice !== undefined;
  const retardo = animada ? `${Math.min(indice, 7) * 40}ms` : undefined;

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-md bg-white shadow-nivel-1 transition-shadow duration-medio ease-suave hover:shadow-nivel-2 ${
        animada ? 'animate-entrar' : ''
      }`}
      style={retardo ? { animationDelay: retardo } : undefined}
    >
      {/* UNA SOLA FOTO, y hubo un carrusel acá que se sacó.
          
          Dejaba pasar las fotos con las flechas o el dedo, sin entrar a la
          ficha, y la mecánica funcionaba: las pedía sólo al detectar interés y
          precargaba la siguiente. Lo que no funcionaba era el resultado: las
          fotos de la galería viven en `/uploads/croped/`, una ruta que el
          precalentado no cubre, así que la primera vez que alguien pasaba de
          foto el optimizador de Next tenía que bajarla del server de Decker en
          ese momento — y ese server contesta `504 Gateway Timeout` apenas se le
          pide de más. El visitante tocaba la flecha y veía un rectángulo gris.
          
          Un carrusel que a veces no muestra la foto es peor que no tenerlo: la
          tarjeta parece rota en vez de simple. Vuelve cuando las fotos no
          dependan de ese server —ver "Las fotos" en CLAUDE.md—. */}
      <FotoUnidad
        src={unidad.imagen}
        alt={`${unidad.nombre} — ${unidad.estado}`}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        /* El zoom es de 3%: alcanza para que la tarjeta acuse el cursor sin que
           la foto se recorte de forma visible. No tiene equivalente en mobile
           porque no hace falta: lo que importa —que la tarjeta entera es un
           enlace— lo da el área tocable, no el efecto. */
        claseImagen="transition-transform duration-medio ease-suave group-hover:scale-[1.03]"
      >
        <div className="velo-foto" />
        <div className="absolute left-3 top-3">
          <EstadoBadge estado={unidad.estado} />
        </div>
        {/* El corazón va abajo a la derecha y no arriba: es donde cae el pulgar
            en un teléfono, y apoya sobre el velo, que es justamente lo que le
            garantiza contraste contra cualquier foto.
            z-10 para quedar por encima del enlace que cubre la tarjeta entera:
            guardar no tiene que abrir la ficha. */}
        <div className="absolute bottom-3 right-3 z-10">
          <BotonFavorito slug={unidad.slug} nombre={unidad.nombre} />
        </div>
        {/* Tipo sobre la foto, como en el sitio original. */}
        <div className="absolute right-3 top-3">
          <span className="centrado-optico inline-flex h-5 items-center rounded-sm bg-negro/85 px-2 text-2xs font-medium leading-none tracking-[0.04em] text-white backdrop-blur-sm">
            {unidad.tipo}
          </span>
        </div>
      </FotoUnidad>

      <div className="flex flex-1 flex-col p-4 sm:p-6">
        {/* Sin volanta "Volvo · Camión": la marca ya abre el nombre de la
            unidad y el tipo está en el badge sobre la foto. Era el tercer lugar
            donde se leía la misma marca. */}

        {/* El nombre es lo más pesado de la tarjeta: Overpass 800 sobre negro
            pleno contra el resto, que va en gris y en peso normal. La jerarquía
            la hace el contraste de peso, no el tamaño: 20px no es grande, pero
            es lo único oscuro y macizo del bloque. */}
        <h3 className="titulo-tarjeta text-negro">
          <Link
            href={`/unidad/${unidad.slug}`}
            className="after:absolute after:inset-0 group-hover:text-rojo"
          >
            {unidad.nombre}
          </Link>
        </h3>

        {/**
         * El precio, debajo del nombre.
         *
         * La tarjeta no lo mostraba, y el argumento era que en la grilla se
         * compara por unidad, estado y ubicación. No se sostiene: el precio es
         * el primer filtro que aplica cualquiera que está reponiendo una unidad
         * para su flota, y esconderlo obligaba a entrar a la ficha de a una
         * para descartar. Un listado en el que hay que abrir cada tarjeta para
         * saber si está dentro del presupuesto no es un listado.
         *
         * Cuando no está cargado dice "Consultar precio" y no un guión: el dato
         * existe, hay que pedirlo. Va en gris y sin peso, para que una tarjeta
         * sin precio no se lea como una con precio bajo.
         */}
        {tienePrecio(unidad) ? (
          <p className="dato mt-2 text-xl font-medium text-negro">
            {formatearPrecioDeUnidad(unidad)}
          </p>
        ) : (
          <p className="mt-2 text-base font-medium text-gris-500">Consultar precio</p>
        )}

        {/* La descripción del aviso, o la ficha técnica en una línea cuando no
            hay: sólo 57 de 240 unidades traen texto escrito, y dejar el hueco
            desalinea las tarjetas de la fila.

            Se corta en dos renglones. Es texto de apoyo, no un dato: uno largo
            estiraba una sola tarjeta y desalineaba las tres. El detalle
            completo está en la ficha, a un toque. */}
        {/* Si no hay ni descripción ni ficha técnica —pasa en 31 de las 240
            unidades— el párrafo no se dibuja. Un `<p>` vacío dejaba dos
            renglones de hueco; los botones igual se alinean entre tarjetas por
            el `mt-auto` de más abajo, así que la fila no se descuadra. */}
        {resumen && (
          <p className="mt-2 line-clamp-2 text-base leading-relaxed text-gris-500">
            {resumen}
          </p>
        )}

        {/**
         * LOS DATOS EN DOS RENGLONES, SIN RÓTULOS.
         *
         * Antes cada dato eran DOS líneas —el rótulo arriba, el valor abajo— en
         * dos filas: 117px de la tarjeta para tres datos. Medido.
         *
         * Los rótulos se fueron porque no agregaban nada que el dato no dijera
         * solo: al lado del ícono de calendario, "2017" es un año; "1.145.960
         * km" lleva su unidad; y junto al pin, "Mar del Plata" es la sucursal.
         * Eran tres palabras en gris chiquito repitiendo lo obvio, en la parte
         * de la tarjeta que se escanea más rápido.
         *
         * POR QUÉ LA SUCURSAL SIGUE EN SU PROPIO RENGLÓN: con los tres juntos
         * cada slot queda en ~98px y "Comodoro Rivadavia" se corta. Un dato
         * truncado no es un dato, y la sucursal decide si la unidad se puede ir
         * a ver el sábado o hay que cruzar tres provincias.
         */}
        <dl className="mt-4 space-y-2 border-t border-gris-200 pt-3">
          <div className="flex items-center gap-4">
            {especificaciones.slice(0, 2).map((spec) => (
              <Dato key={spec.etiqueta} {...spec} />
            ))}
          </div>
          {especificaciones.slice(2).map((spec) => (
            <Dato key={spec.etiqueta} {...spec} />
          ))}
        </dl>

        <div className="mt-auto pt-4">
          {/* DOS acciones, no tres: ver la unidad y preguntar por ella. Eso es
              todo lo que se decide desde un listado.

              "Simular financiación" estaba acá y se fue a la ficha. Repetido en
              cada tarjeta de una grilla de tres columnas eran nueve botones en
              pantalla, y el bloque de acciones pesaba más que los datos que
              tenía arriba. Además la simulación necesita el precio de UNA
              unidad puntual: el lugar donde esa acción significa algo es el
              detalle, no la lista.

              z-10 para quedar por encima del overlay del link de la tarjeta.
              Los dos botones miden 44px de alto: es el mínimo tocable de WCAG
              2.5.8, y no baja en mobile por más que la tarjeta quede más
              compacta. */}
          {/* Los dos rótulos van a 17px y no a 15: son las acciones de la
              tarjeta, y un botón de 44px de alto con la palabra en cuerpo de
              nota al pie se lee como un control secundario. El alto ya estaba
              resuelto para el dedo; esto lo resuelve para el ojo. */}
          {/* COMPARAR VIVE ACÁ, con las acciones, y no en un renglón propio.
              Tenía uno compartido con el chip de financiación; al sacarse el
              chip —la API no manda ese dato y salía igual en las 240— la
              casilla quedó sola contra el borde izquierdo, con media tarjeta de
              aire al lado y un renglón entero para un control de 20px.

              Acá abajo es además donde corresponde: es una acción, como "Ver
              ficha" y "Consultar", y las tres se leen juntas. El chip amarillo
              de financiación vuelve solo a este mismo renglón el día que el
              backend cargue el dato. */}
          <div className="relative z-10 flex items-center gap-2">
            {unidad.financiacion === 'Disponible' && (
              <span className="centrado-optico inline-flex h-7 shrink-0 items-center gap-1.5 rounded-sm bg-amarillo-50 px-2 text-2xs font-medium text-negro ring-1 ring-inset ring-amarillo">
                <IconoCheck className="h-3.5 w-3.5 shrink-0" />
                Con financiación
              </span>
            )}
            <BotonComparar slug={unidad.slug} nombre={unidad.nombre} />
          </div>

          <div className="relative z-10 mt-3 flex gap-2">
            <Link
              href={`/unidad/${unidad.slug}`}
              className="centrado-optico inline-flex h-11 flex-1 items-center justify-center rounded-sm bg-gris-100 text-base font-medium text-negro transition-colors duration-rapido hover:bg-gris-200 active:translate-y-px"
            >
              Ver ficha
            </Link>
            <a
              href={linkConsultaUnidad(unidad)}
              target="_blank"
              rel="noopener noreferrer"
              className="centrado-optico inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-sm bg-rojo text-base font-medium text-white transition-colors duration-rapido hover:bg-rojo-700 active:translate-y-px"
              aria-label={`Consultar por ${unidad.nombre} por WhatsApp`}
            >
              <IconoWhatsapp className="h-4 w-4" />
              Consultar
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * Un dato de la tarjeta: ícono y valor, sin rótulo visible.
 *
 * El rótulo existe igual para quien no ve la pantalla —va en el `<dt>` con
 * `sr-only`—: un lector que anuncia "2017, 1.145.960 km, Mar del Plata" sin
 * decir qué es cada cosa deja al oyente adivinando, aunque en pantalla el ícono
 * lo resuelva de un vistazo.
 */
function Dato({
  Icono,
  etiqueta,
  valor,
}: {
  Icono: (props: { className?: string }) => React.ReactElement;
  etiqueta: string;
  valor: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <dt className="sr-only">{etiqueta}</dt>
      <Icono className="h-4 w-4 shrink-0 text-gris-400" />
      <dd
        className={`truncate text-sm font-medium text-negro ${esCifra(valor) ? 'dato' : ''}`}
        title={valor}
      >
        {valor}
      </dd>
    </div>
  );
}
