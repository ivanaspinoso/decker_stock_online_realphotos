import Link from 'next/link';
import BotonFavorito from '@/components/unidades/BotonFavorito';
import BotonComparar from '@/components/unidades/BotonComparar';
import EstadoBadge from '@/components/ui/EstadoBadge';
import FotoUnidad from '@/components/unidades/FotoUnidad';
import {
  IconoCalendario,
  IconoCamion,
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
  formatearPrecio,
  tieneKilometraje,
} from '@/lib/format';
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
        <p className="rotulo-dato">
          {unidad.marca} · {unidad.tipo}
        </p>

        {/* El nombre es lo más pesado de la tarjeta: Overpass 800 sobre negro
            pleno contra el resto, que va en gris y en peso normal. La jerarquía
            la hace el contraste de peso, no el tamaño: 20px no es grande, pero
            es lo único oscuro y macizo del bloque. */}
        <h3 className="titulo-tarjeta mt-2 text-negro">
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
        {unidad.precio !== null ? (
          <p className="dato mt-2 text-xl font-medium text-negro">
            {formatearPrecio(unidad.precio)}
          </p>
        ) : (
          <p className="mt-2 text-base font-medium text-gris-500">Consultar precio</p>
        )}

        <p className="mt-2 text-base leading-relaxed text-gris-500">{unidad.descripcion}</p>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-gris-200 pt-4">
          {especificaciones.map((spec) => (
            <div key={spec.etiqueta}>
              <dt className="rotulo-dato">{spec.etiqueta}</dt>
              <dd className="mt-1 flex items-center gap-2">
                <spec.Icono className="h-4 w-4 shrink-0 text-gris-400" />
                {/* La monoespaciada SÓLO si el valor es una cifra.
                    "Volvo", "Bahía Blanca" o "Consultar" en ancho fijo se leen
                    como otra tipografía metida en la tarjeta, y el ancho fijo
                    no les aporta nada: no hay ninguna columna de palabras que
                    alinear. Es la misma regla que ya aplicaba la tabla.

                    El peso es medio y no semibold en los dos casos: si el dato
                    pesa lo mismo que el nombre de la unidad, la tarjeta deja de
                    tener un primer renglón y pasa a tener ocho. */}
                <span
                  className={`text-sm font-medium text-negro ${
                    esCifra(spec.valor) ? 'dato' : ''
                  }`}
                >
                  {spec.valor}
                </span>
              </dd>
            </div>
          ))}
        </dl>

        {/* Un solo dato, a TODO EL ANCHO. Antes eran dos píldoras cortas puestas
            una al lado de la otra; sacada "Consulta online" —que decía lo mismo
            en las treinta y seis tarjetas—, la que quedaba flotaba sola contra
            el borde izquierdo, y su ancho cambiaba según dijera "Disponible" o
            "Consultar": en una grilla de tres columnas eso se leía como tres
            tarjetas desprolijas, no como tres estados distintos.

            A todo el ancho es una banda: mide siempre lo mismo, se apoya en el
            mismo eje que los dos botones de abajo, y lo único que cambia entre
            tarjeta y tarjeta es lo que dice. */}
        <p
          className={`centrado-optico mt-4 flex h-9 w-full items-center gap-2 rounded-sm px-3 text-xs font-medium ${
            unidad.financiacion === 'Disponible'
              ? 'bg-amarillo-50 text-negro ring-1 ring-inset ring-amarillo'
              : 'bg-gris-100 text-gris-600 ring-1 ring-inset ring-gris-200'
          }`}
        >
          <IconoCheck className="h-4 w-4 shrink-0" />
          Financiación: {unidad.financiacion}
        </p>

        {/* Comparar va ACÁ y no sobre la foto: sobre la foto ya está el
            corazón, y dos controles encimados sobre una imagen se leen como
            un par —guardar y comparar no son lo mismo ni se usan juntos—.
            Además una casilla necesita su palabra al lado para explicarse, y
            sobre la foto no hay lugar para ponerla. */}
        <div className="relative z-10 mt-3">
          <BotonComparar slug={unidad.slug} nombre={unidad.nombre} />
        </div>

        <div className="mt-auto pt-6">
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
          <div className="relative z-10 flex gap-2">
            <Link
              href={`/unidad/${unidad.slug}`}
              className="centrado-optico inline-flex h-11 flex-1 items-center justify-center rounded-sm bg-gris-100 text-base font-medium text-negro transition-colors duration-rapido hover:bg-gris-200"
            >
              Ver ficha
            </Link>
            <a
              href={linkConsultaUnidad(unidad)}
              target="_blank"
              rel="noopener noreferrer"
              className="centrado-optico inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-sm bg-rojo text-base font-medium text-white transition-colors duration-rapido hover:bg-rojo-700"
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
