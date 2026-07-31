import type { Metadata } from 'next';
import Image from 'next/image';
import herostockImage from '@/public/marca/herostock.jpg';
import CatalogoCliente from '@/components/catalogo/CatalogoCliente';
import { getCatalogoCompleto, getOpcionesCatalogo, getSucursales } from '@/lib/api';
import type {
  EstadoUnidad,
  FiltrosCatalogo,
  IdSucursal,
  OrdenCatalogo,
  TipoUnidad,
} from '@/lib/types';

export const metadata: Metadata = {
  title: 'Stock online',
  description:
    'Camiones 0 km, usados, semis, bateas, utilitarios, autos y camionetas. ' +
    'Filtrá por tipo, marca, año, precio, sucursal y estado.',
};

interface Props {
  searchParams: Record<string, string | undefined>;
}

/** Convierte un parámetro de URL a número, ignorando basura. */
function aNumero(valor: string | undefined): number | undefined {
  if (!valor) return undefined;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : undefined;
}

export default async function CatalogoPage({ searchParams }: Props) {
  const [unidades, opciones, sucursales] = await Promise.all([
    getCatalogoCompleto(),
    getOpcionesCatalogo(),
    getSucursales(),
  ]);

  // Los filtros llegan por URL (desde el buscador de la home o un link
  // compartido) y arrancan el catálogo ya aplicados.
  const filtrosIniciales: FiltrosCatalogo = {
    busqueda: searchParams.q ?? '',
    tipo: (searchParams.tipo ?? '') as TipoUnidad | '',
    marca: searchParams.marca ?? '',
    sucursalId: (searchParams.sucursal ?? '') as IdSucursal | '',
    estado: (searchParams.estado ?? '') as EstadoUnidad | '',
    financiacion: searchParams.financiacion === 'Disponible' ? 'Disponible' : '',
    anioDesde: aNumero(searchParams.anioDesde),
    anioHasta: aNumero(searchParams.anioHasta),
    precioDesde: aNumero(searchParams.precioDesde),
    precioHasta: aNumero(searchParams.precioHasta),
    orden: (searchParams.orden as OrdenCatalogo) ?? 'relevancia',
  };

  return (
    <>
      {/* Banda de encabezado con la foto DE FONDO, detrás del título y la
          bajada. El texto vive en la mitad izquierda, así que el velo es
          direccional: opaco donde apoya el texto y abierto sobre el patio de la
          derecha. En mobile, donde el texto cruza todo el ancho, va plano. */}
      <div className="oscuro relative overflow-hidden bg-negro-950">
        <Image
          src={herostockImage}
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center"
          placeholder="blur"
          priority
        />
        <div className="absolute inset-0 hidden bg-gradient-to-r from-negro-950 from-30% via-negro-950/85 via-60% to-negro-950/30 lg:block" />
        <div className="absolute inset-0 bg-negro-950/85 lg:hidden" />

        <div className="contenedor relative py-14 sm:py-20">
          <p className="etiqueta text-amarillo">Catálogo Decker</p>
          <h1 className="mt-3 font-display text-[38px] font-semibold leading-none tracking-[-0.015em] text-white sm:text-[52px]">
            Stock online
          </h1>
          {/* gris-200 y no gris-400: sobre la foto, el gris medio no llega a
              4.5:1 contra los techos blancos de los camiones. */}
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-gris-200">
            {unidades.length} unidades publicadas entre las cinco agencias. Filtrá por tipo,
            marca, año, precio, sucursal o estado, y cambiá a vista lista para comparar varias
            de un vistazo.
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
        />
      </div>
    </>
  );
}
