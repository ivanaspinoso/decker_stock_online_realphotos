'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import AccesosCatalogo, { type Seleccion } from '@/components/home/AccesosCatalogo';
import Boton from '@/components/ui/Boton';
import EncabezadoSeccion from '@/components/ui/EncabezadoSeccion';
import UnidadGrilla from '@/components/unidades/UnidadGrilla';
import { cumpleFiltros, ordenarUnidades } from '@/lib/filtros';
import type { AccesosCatalogo as Accesos, Unidad } from '@/lib/types';

/**
 * El catálogo en la home. UNA sección, un solo encabezado, una sola lectura:
 * primero POR DÓNDE ENTRAR —los accesos— y después QUÉ HAY —la muestra de
 * unidades, que responde a lo que se tocó arriba—.
 *
 * Los accesos NO navegan. Antes cada uno era un link al catálogo completo:
 * tocar "Semis" en la home te sacaba de la home. Ahora filtran la muestra de
 * acá abajo, en el acto y sin recargar, y la salida al stock completo queda
 * donde tiene que estar: como una decisión aparte, en el botón del encabezado,
 * que se lleva puesto el filtro que esté activo.
 *
 * Es la misma idea de la barra de filtros del catálogo —lo que se acotó se
 * nombra en pantalla y se puede soltar de un toque—, con los accesos haciendo
 * de controles.
 *
 * La muestra se corta en seis. Los accesos prometen el stock REAL —"Usados, 19
 * unidades"— y no la muestra, porque ese es el dato que importa para decidir si
 * vale la pena entrar; el renglón de abajo reconcilia las dos cifras diciendo
 * "6 de 19" y ofreciendo las trece restantes en el catálogo. Volcar diecinueve
 * tarjetas en la home la convertiría en el catálogo, que es la página de al
 * lado.
 *
 * Unir las dos mitades no fue sólo meterlas en el mismo `<section>`: son tres
 * señales visuales las que dicen "acá empieza otra cosa", y las tres están
 * bajadas a propósito —el aire es el paso interno de un bloque y no el de una
 * sección, no hay línea divisoria, y el nombre de la muestra se dibuja como
 * rótulo y no como titular—.
 */

/** Cuántas tarjetas muestra la home. El resto vive en el catálogo. */
const MUESTRA = 6;

export default function Catalogo({
  accesos,
  unidades,
}: {
  accesos: Accesos;
  /** El stock completo. Se filtra en memoria, como en el catálogo. */
  unidades: Unidad[];
}) {
  /** El acceso tocado, o `null` mientras se ve la selección de la vidriera. */
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null);

  const filtro = seleccion?.filtro ?? {};
  const hayFiltro = seleccion !== null;

  /**
   * Sin filtro, la vidriera: las unidades marcadas como destacadas. Con filtro,
   * el stock que coincide, ordenado con el mismo criterio que el catálogo para
   * que las primeras seis sean las mismas seis en los dos lados.
   */
  const coincidencias = useMemo(
    () =>
      hayFiltro
        ? ordenarUnidades(
            unidades.filter((unidad) => cumpleFiltros(unidad, filtro)),
            'relevancia',
          )
        : unidades.filter((unidad) => unidad.destacada),
    [unidades, filtro, hayFiltro],
  );

  const visibles = coincidencias.slice(0, MUESTRA);

  /** El mismo filtro, listo para llevar al catálogo completo. */
  const params = new URLSearchParams();
  if (filtro.estado) params.set('estado', filtro.estado);
  if (filtro.tipo) params.set('tipo', filtro.tipo);
  if (filtro.marca) params.set('marca', filtro.marca);
  const hrefCatalogo = `/catalogo${params.toString() ? `?${params}` : ''}`;

  /**
   * Cómo se llama lo que se está viendo. Es el rótulo de la muestra, y es el
   * nombre del acceso que se tocó: dice "Usados", que es lo que decía el botón,
   * y no "Usado seleccionado", que es cómo se guarda el dato.
   */
  const nombreDeLaVista = seleccion?.nombre ?? 'Unidades seleccionadas';

  return (
    <section id="catalogo" className="seccion scroll-mt-24">
      <div className="contenedor">
        <EncabezadoSeccion
          etiqueta="Catálogo"
          titulo="El lugar donde podés encontrar TU camión"
          descripcion="Todo el stock de las cinco agencias en un solo lugar. Entrá por lo que ya sabés que buscás —0 km o usado, una marca, un semi, una batea— o mirá la selección de acá abajo."
          accion={
            <Boton href={hrefCatalogo} variante="sutil">
              Ver stock completo
            </Boton>
          }
        />

        <AccesosCatalogo
          datos={accesos}
          seleccionado={seleccion?.nombre ?? null}
          onFiltrar={setSeleccion}
        />

        {/* Conserva el ancla `destacadas`: el pie enlaza acá con el nombre de
            esta mitad, no con el de la sección entera. */}
        <div id="destacadas" className="mt-10 scroll-mt-24 sm:mt-12">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="rotulo-dato">{nombreDeLaVista}</h3>

            <p className="text-sm text-gris-500">
              <span className="dato">{visibles.length}</span>
              {coincidencias.length > visibles.length && (
                <> de <span className="dato">{coincidencias.length}</span></>
              )}{' '}
              {coincidencias.length === 1 ? 'unidad' : 'unidades'}
              {hayFiltro && (
                <>
                  {' · '}
                  <button
                    type="button"
                    onClick={() => setSeleccion(null)}
                    className="font-medium text-rojo transition-opacity hover:opacity-70"
                  >
                    Quitar filtro
                  </button>
                </>
              )}
            </p>
          </div>

          {/* El listado cambia sin recargar: se anuncia solo. */}
          <p className="sr-only" role="status" aria-live="polite">
            {nombreDeLaVista}: {coincidencias.length} unidades.
          </p>

          {coincidencias.length > 0 ? (
            <>
              {/* `key`: al cambiar de filtro React desmonta la grilla y la vuelve
                  a montar, y las tarjetas repiten su entrada escalonada. Es el
                  acuse de recibo del toque —sin él, pasar de seis tarjetas a
                  otras seis se ve como que no pasó nada—. */}
              <UnidadGrilla key={nombreDeLaVista} unidades={visibles} animar />

              {coincidencias.length > visibles.length && (
                <p className="mt-6 text-sm text-gris-500">
                  Hay <span className="dato">{coincidencias.length - visibles.length}</span>{' '}
                  {coincidencias.length - visibles.length === 1 ? 'unidad más' : 'unidades más'}{' '}
                  con este filtro.{' '}
                  <Link
                    href={hrefCatalogo}
                    className="font-medium text-negro underline underline-offset-4 hover:text-rojo"
                  >
                    {coincidencias.length - visibles.length === 1 ? 'Verla' : 'Verlas'} en el
                    stock completo
                  </Link>
                </p>
              )}
            </>
          ) : (
            <div className="rounded-lg bg-white p-12 text-center shadow-nivel-1">
              <p className="font-display text-lg font-extrabold text-negro">
                No hay unidades con ese filtro
              </p>
              <p className="mx-auto mt-2 max-w-md text-base leading-relaxed text-gris-500">
                Probá con otro acceso, o entrá al stock completo, que filtra además por año,
                precio y sucursal.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Boton onClick={() => setSeleccion(null)} variante="secundario">
                  Ver la selección
                </Boton>
                <Boton href="/catalogo" variante="primario">
                  Ir al stock completo
                </Boton>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
