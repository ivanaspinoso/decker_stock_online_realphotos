import type { Metadata } from 'next';
import Image from 'next/image';
import herostockImage from '@/public/marca/herostock.jpg';
import CatalogoCliente from '@/components/catalogo/CatalogoCliente';
import { UNIDADES_POR_PAGINA } from '@/lib/filtros';
import VistosRecientemente from '@/components/unidades/VistosRecientemente';
import { getCatalogoCompleto, getOpcionesCatalogo, getResumenDeUnidades, getSucursales } from '@/lib/api';
import type {
  EstadoUnidad,
  FiltrosCatalogo,
  IdSucursal,
  OrdenCatalogo,
  TipoUnidad,
} from '@/lib/types';

export const metadata: Metadata = {
  title: 'Stock online',
  /* Había quedado sin la primera oración —decía sólo "Filtrá por tipo, marca,
     año…"— y esta es LA página que Google indexa para "camiones usados": la
     descripción tiene que empezar diciendo qué hay, no cómo se filtra. */
  /* Sin "precio" en la lista de filtros: mientras la API no devuelva precios,
     el control no está en pantalla, y prometerlo en el resultado de Google es
     prometerlo dos veces mal —una en el buscador y otra al llegar—. La
     descripción de la página, que sí es dinámica, se arma abajo. */
  description:
    'Camiones 0 km y usados seleccionados, semis, bateas y utilitarios en las ' +
    'cinco agencias Decker. Filtrá por tipo, marca, año, sucursal y estado.',
};

interface Props {
  // Promise desde Next 15: se espera junto con los datos, no antes.
  searchParams: Promise<Record<string, string | undefined>>;
}

/** Convierte un parámetro de URL a número, ignorando basura. */
function aNumero(valor: string | undefined): number | undefined {
  if (!valor) return undefined;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : undefined;
}

export default async function CatalogoPage({ searchParams }: Props) {
  const [parametrosUrl, unidades, opciones, sucursales, resumen] = await Promise.all([
    searchParams,
    getCatalogoCompleto(),
    getOpcionesCatalogo(),
    getSucursales(),
    getResumenDeUnidades(),
  ]);

  // Los filtros llegan por URL (desde el buscador de la home o un link
  // compartido) y arrancan el catálogo ya aplicados.
  const filtrosIniciales: FiltrosCatalogo = {
    busqueda: parametrosUrl.q ?? '',
    tipo: (parametrosUrl.tipo ?? '') as TipoUnidad | '',
    marca: parametrosUrl.marca ?? '',
    sucursalId: (parametrosUrl.sucursal ?? '') as IdSucursal | '',
    estado: (parametrosUrl.estado ?? '') as EstadoUnidad | '',
    financiacion: parametrosUrl.financiacion === 'Disponible' ? 'Disponible' : '',
    anioDesde: aNumero(parametrosUrl.anioDesde),
    anioHasta: aNumero(parametrosUrl.anioHasta),
    precioDesde: aNumero(parametrosUrl.precioDesde),
    precioHasta: aNumero(parametrosUrl.precioHasta),
    orden: (parametrosUrl.orden as OrdenCatalogo) ?? 'relevancia',
  };

  /**
   * La página pedida, saneada acá y no en el cliente.
   *
   * `?pagina=` es texto que escribe cualquiera: puede venir `abc`, `-3`, `0` o
   * un número más grande que el stock. Todo eso se convierte en 1, y de pasarse
   * del total se encarga el cliente, que es el único que sabe cuántas páginas
   * quedan después de aplicar los filtros.
   */
  const paginaPedida = Math.max(1, Math.trunc(Number(parametrosUrl.pagina)) || 1);

  /**
   * Y acotada contra el stock, para que el HTML del servidor nunca salga vacío.
   *
   * El cliente también acota —es el único que sabe cuántas páginas quedan
   * después de aplicar los filtros— pero lo hace al montar, así que sin esto un
   * `?pagina=99` sirve una lista vacía que recién se corrige cuando arranca el
   * JavaScript. Quien llega con un link viejo ve un parpadeo en blanco, y un
   * buscador que no ejecuta JavaScript ve una página de catálogo sin catálogo.
   */
  const paginaInicial = Math.min(
    paginaPedida,
    Math.max(1, Math.ceil(unidades.length / UNIDADES_POR_PAGINA)),
  );

  return (
    <>
      {/* Banda de encabezado con la foto DE FONDO, detrás del título y la
          bajada. El texto vive en la mitad izquierda, así que el velo es
          direccional: opaco donde apoya el texto y abierto sobre el patio de la
          derecha. En mobile, donde el texto cruza todo el ancho, va plano.

          Es el LCP de la página: `preload` reemplaza al `priority` que Next 16
          dejó deprecado. */}
      <div className="oscuro relative overflow-hidden bg-negro-950">
        <Image
          src={herostockImage}
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center"
          placeholder="blur"
          preload
        />
        <div className="absolute inset-0 hidden bg-gradient-to-r from-negro-950 from-30% via-negro-950/85 via-60% to-negro-950/30 lg:block" />
        <div className="absolute inset-0 bg-negro-950/85 lg:hidden" />

        {/* La nav va montada encima y mide 80px: el padding superior es el que
            despeja el título en vez de dejarlo debajo de la barra. */}
        <div className="contenedor relative pb-14 pt-28 sm:pb-20 sm:pt-32">
          <p className="etiqueta text-amarillo">Catálogo Decker</p>
          <h1 className="titulo-expresivo mt-3 text-4xl text-white sm:text-5xl">
            Stock online
          </h1>
          {/* Sin la cifra del stock total. Al catálogo se entra filtrado desde
              el subcatálogo de la home, y un titular que anunciaba "36 unidades
              publicadas" arriba de una lista de 7 se leía como que el filtro no
              se había aplicado. La cuenta viva —"7 unidades de 36 publicadas"—
              la lleva el catálogo, que es lo único que puede mantenerla al día
              cuando el filtro cambia sin recargar.

              gris-200 y no gris-400: sobre la foto, el gris medio no llega a
              4.5:1 contra los techos blancos de los camiones. */}
          {/* La lista de filtros se arma con los que REALMENTE están en
              pantalla. El precio sólo se nombra si hay precios en el stock:
              hoy la API no los devuelve, el filtro se esconde solo (ver
              `getOpcionesCatalogo`) y esta bajada prometía un control que el
              visitante después buscaba y no encontraba. */}
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-gris-200">
            El stock de las cinco agencias. Filtrá por tipo, marca, año
            {opciones.precioMin !== null ? ', precio' : ''}, sucursal o estado, y cambiá a
            vista lista para comparar varias de un vistazo.
          </p>
        </div>
      </div>

      {/* Sin fondo propio: hereda el lienzo gris del body y las tarjetas
          blancas del catálogo se leen sobre él. */}
      <div className="contenedor py-10 sm:py-12">
        <CatalogoCliente
          unidades={unidades}
          opciones={opciones}
          sucursales={sucursales}
          filtrosIniciales={filtrosIniciales}
          paginaInicial={paginaInicial}
        />

        {/* La franja va DESPUÉS del listado y no antes: primero está lo que
            la persona vino a buscar, y recién al final —cuando ya recorrió y
            no encontró— aparece la vuelta a lo que había mirado. Con la lista
            vacía no se dibuja nada, ni el título. */}
        <VistosRecientemente unidades={resumen} className="mt-14" />
      </div>
    </>
  );
}
