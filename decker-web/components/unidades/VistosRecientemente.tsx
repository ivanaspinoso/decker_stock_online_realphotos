'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { leerRecientes, suscribirARecientes } from '@/lib/recientes';
import { formatearPrecio } from '@/lib/format';
import type { ResumenComparacion } from '@/lib/comparador';

/**
 * Franja de "vistos recientemente".
 *
 * Comprar un camión no se resuelve en una sesión: se mira, se cierra, se vuelve
 * dos días después. Esta franja es lo que hace que volver no cueste rehacer la
 * búsqueda desde cero.
 *
 * En la home va ARRIBA, apenas termina el hero y antes de los accesos por
 * categoría. Estaba al final, después de todo el catálogo, y ahí no servía para
 * nada: quien vuelve al sitio vuelve a buscar lo mismo que estaba mirando, y
 * hacerle recorrer la página entera para reencontrarlo es pedirle que rehaga el
 * camino que esta sección existe para ahorrarle. Es el primer contenido que le
 * habla a esa persona en particular, así que se lee primero.
 *
 * NO EXISTE PARA UN VISITANTE NUEVO. Con la lista vacía no se renderiza ni el
 * título ni el envase: un bloque que dice "Vistos recientemente" arriba de la
 * nada es un hueco que hay que interpretar, y encima le recuerda a alguien que
 * llega por primera vez que el sitio le anota los pasos.
 *
 * JERARQUÍA: es una vuelta atrás, no una vidriera. Va con el encabezado del
 * sistema —volanta y título— pero un escalón abajo del de una sección de verdad
 * (`titulo-seccion` es 32px, este es 26), y las tarjetas son chicas y traen tres
 * cosas: foto, nombre y precio. Con el tamaño de las del catálogo competirían
 * con las unidades que el sitio sí quiere mostrar, que son las que vienen
 * inmediatamente después.
 */
export default function VistosRecientemente({
  unidades,
  className = '',
}: {
  /** El resumen de todo el stock. La lista guardada son sólo slugs. */
  unidades: ResumenComparacion[];
  className?: string;
}) {
  const [slugs, setSlugs] = useState<string[]>([]);

  useEffect(() => {
    setSlugs(leerRecientes());
    return suscribirARecientes(setSlugs);
  }, []);

  /* El orden lo manda la lista guardada —de la más reciente a la más vieja—, no
     el catálogo. Se filtra lo que no matchea por si quedó el slug de una unidad
     que ya no se publica. */
  const recientes = slugs
    .map((slug) => unidades.find((unidad) => unidad.slug === slug))
    .filter((unidad): unidad is ResumenComparacion => Boolean(unidad));

  if (recientes.length === 0) return null;

  return (
    <section aria-labelledby="titulo-recientes" className={className}>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <p className="etiqueta text-rojo">Vistos recientemente</p>
          <h2
            id="titulo-recientes"
            className="mt-2 font-display text-2xl font-extrabold text-negro"
          >
            Seguí donde lo dejaste
          </h2>
        </div>
        <p className="text-sm text-gris-500">
          <span className="dato">{recientes.length}</span>{' '}
          {recientes.length === 1 ? 'unidad' : 'unidades'} en este dispositivo
        </p>
      </div>

      {/**
       * Una fila que se desliza en el teléfono y una grilla de hasta cinco en
       * el monitor. Son los mismos elementos: `flex` con scroll abajo de `sm`,
       * `grid` de cinco columnas arriba.
       *
       * El `-mx-5` con el padding compensado hace que en un teléfono la fila
       * llegue hasta el borde de la pantalla en vez de cortarse contra el
       * margen del contenedor: ese recorte al ras es lo que muestra que hay más
       * y se puede arrastrar. En la grilla no hace falta y se anula.
       *
       * Cinco columnas y no cuatro: la lista guardada tiene tope de cinco (ver
       * `lib/recientes.ts`), así que en desktop entran todas sin scroll y sin
       * que sobre una fila a medio llenar.
       */}
      <ul className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-5">
        {recientes.map((unidad) => (
          <li key={unidad.slug} className="w-40 shrink-0 snap-start sm:w-auto">
            <Link
              href={`/unidad/${unidad.slug}`}
              className="group block overflow-hidden rounded-md bg-white shadow-nivel-1 transition-shadow duration-medio ease-suave hover:shadow-nivel-2"
            >
              <Image
                src={unidad.imagen}
                alt=""
                width={320}
                height={240}
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="p-3">
                <p className="truncate text-sm font-medium text-negro transition-colors group-hover:text-rojo">
                  {unidad.nombre}
                </p>
                {/* El precio y no la marca: la marca ya está adentro del nombre
                    —"Volvo FH 460"— y el precio es lo que hace que valga la
                    pena volver a entrar. Sin precio publicado se dice qué falta,
                    en gris, para que no se lea como una unidad más barata. */}
                {unidad.precio !== null ? (
                  <p className="dato mt-1 text-sm font-medium text-negro">
                    {formatearPrecio(unidad.precio)}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-gris-500">Consultar precio</p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
