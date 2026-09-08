'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { IconoCerrar, IconoComparar } from '@/components/ui/Iconos';
import {
  MAXIMO_COMPARADOR,
  leerComparador,
  quitarDelComparador,
  suscribirAComparador,
  vaciarComparador,
  type ResumenComparacion,
} from '@/lib/comparador';
import { formatearAnio, formatearKm, formatearPrecio, tieneKilometraje } from '@/lib/format';
import type { Sucursal } from '@/lib/types';

/**
 * Barra del comparador y su tabla.
 *
 * Va montada en el layout, así que existe en TODAS las páginas: la gracia de
 * elegir tres unidades es poder hacerlo mientras se navega —una de la home,
 * otra del catálogo, otra de una ficha— y encontrarlas juntas al final. Si la
 * barra viviera sólo en el catálogo, marcar algo en una ficha sería marcarlo a
 * ciegas.
 *
 * Es INVISIBLE con la lista vacía. Una barra fija que dice "0 seleccionadas"
 * ocupa el borde inferior de todos los teléfonos del sitio para no decir nada.
 *
 * La tabla se abre en una ventana sobre la página y no en una ruta propia:
 * comparar es un paréntesis dentro de la búsqueda, no un destino. Al cerrarla
 * se vuelve exactamente a donde se estaba, con el scroll donde estaba.
 */
export default function BarraComparador({
  unidades,
  sucursales,
}: {
  /** El resumen de todo el stock. La lista guardada son sólo slugs. */
  unidades: ResumenComparacion[];
  sucursales: Sucursal[];
}) {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [abierta, setAbierta] = useState(false);

  useEffect(() => {
    setSlugs(leerComparador());
    return suscribirAComparador(setSlugs);
  }, []);

  /* El orden lo manda la lista guardada, no el catálogo: las columnas quedan
     en el orden en que la persona las fue eligiendo. Se filtra lo que no
     matchea por si quedó un slug de una unidad que ya no se publica. */
  const elegidas = slugs
    .map((slug) => unidades.find((unidad) => unidad.slug === slug))
    .filter((unidad): unidad is ResumenComparacion => Boolean(unidad));

  useEffect(() => {
    if (!abierta) return;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAbierta(false);
    };
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = overflowPrevio;
    };
  }, [abierta]);

  // Vaciar desde la ventana la deja sin contenido: se cierra sola.
  useEffect(() => {
    if (elegidas.length === 0) setAbierta(false);
  }, [elegidas.length]);

  if (elegidas.length === 0) return null;

  const nombreSucursal = (id: string) =>
    sucursales.find((sucursal) => sucursal.id === id)?.nombre ?? 'Consultar';

  /**
   * Las filas de la tabla son los campos que la ficha ya muestra, en el orden
   * en que se decide: primero el precio y el estado —lo que descarta—, después
   * el uso —año y kilómetros—, y al final lo que identifica y dónde está.
   */
  const filas: { etiqueta: string; valor: (u: ResumenComparacion) => string; cifra?: boolean }[] =
    [
      { etiqueta: 'Precio', valor: (u) => formatearPrecio(u.precio), cifra: true },
      /* El estado BAJÓ del encabezado a una fila.
         Arriba era una píldora `whitespace-nowrap`: en una columna de 103px
         "Usado seleccionado" se salía de su celda y desalineaba el encabezado
         entero. Y era el único campo que no se podía leer renglón contra
         renglón, que es exactamente para lo que existe esta ventana. */
      { etiqueta: 'Estado', valor: (u) => u.estado },
      { etiqueta: 'Año', valor: (u) => formatearAnio(u.anio), cifra: true },
      {
        etiqueta: 'Kilómetros',
        // Un semi o una batea no tienen cuentakilómetros: decir "Consultar"
        // sugeriría que el dato existe y falta cargarlo.
        valor: (u) => (tieneKilometraje(u.tipo) ? formatearKm(u.km) : 'No aplica'),
        cifra: true,
      },
      { etiqueta: 'Marca', valor: (u) => u.marca },
      { etiqueta: 'Modelo', valor: (u) => u.modelo },
      { etiqueta: 'Tipo', valor: (u) => u.tipo },
      { etiqueta: 'Sucursal', valor: (u) => nombreSucursal(u.sucursalId) },
    ];

  return (
    <>
      {/* Reserva el alto de la barra al final de la página. Sin esto, la barra
          fija tapa el pie —y en el catálogo, la última fila de tarjetas—: nada
          que sea contenido puede quedar debajo de un elemento flotante. */}
      <div aria-hidden="true" className="h-[76px] sm:h-[84px]" />

      {/* Barra fija abajo. `data-destino`: es el punto de llegada del ícono que
          sale de cada casilla al marcarla (ver `lib/vuelo.ts`). */}
      <div
        data-destino="comparador"
        className="animate-aparecer fixed inset-x-0 bottom-0 z-40 border-t border-negro-800 bg-negro-950/95 backdrop-blur-sm"
      >
        <div className="contenedor flex items-center gap-4 py-3">
          <IconoComparar className="hidden h-5 w-5 shrink-0 text-amarillo sm:block" />

          {/* Las miniaturas son la lista: se ve QUÉ se eligió, no sólo cuántas.
              Cada una se saca desde acá, que es donde la persona la está
              mirando —volver a buscar su tarjeta para destildarla sería el
              camino largo—. */}
          <ul className="flex min-w-0 flex-1 items-center gap-2">
            {elegidas.map((unidad) => (
              <li key={unidad.slug} className="relative shrink-0">
                <Image
                  src={unidad.imagen}
                  alt=""
                  width={64}
                  height={48}
                  className="h-10 w-14 rounded-sm object-cover sm:h-12 sm:w-16"
                />
                <button
                  type="button"
                  onClick={() => setSlugs(quitarDelComparador(unidad.slug))}
                  aria-label={`Sacar ${unidad.nombre} del comparador`}
                  className="absolute -right-1.5 -top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-negro shadow-nivel-1 transition-transform hover:scale-110"
                >
                  <IconoCerrar className="h-3 w-3" />
                </button>
              </li>
            ))}

            {/* Los huecos que faltan, dibujados: dicen cuántas más entran sin
                tener que leer un número. */}
            {Array.from({ length: MAXIMO_COMPARADOR - elegidas.length }).map((_, indice) => (
              <li
                key={`hueco-${indice}`}
                aria-hidden="true"
                className="h-10 w-14 shrink-0 rounded-sm border border-dashed border-negro-700 sm:h-12 sm:w-16"
              />
            ))}
          </ul>

          <button
            type="button"
            onClick={() => setSlugs(vaciarComparador())}
            className="hidden text-sm font-medium text-gris-400 transition-colors hover:text-white sm:block"
          >
            Vaciar
          </button>

          <button
            type="button"
            onClick={() => setAbierta(true)}
            disabled={elegidas.length < 2}
            /* Con una sola unidad no hay comparación posible. El botón se
               muestra igual, apagado: esconderlo haría aparecer un control de
               la nada al marcar la segunda. */
            className="centrado-optico inline-flex h-11 shrink-0 items-center rounded bg-rojo px-5 text-sm font-medium text-white transition-colors hover:bg-rojo-700 disabled:cursor-not-allowed disabled:bg-negro-800 disabled:text-gris-400"
          >
            {elegidas.length < 2 ? 'Elegí otra' : `Comparar (${elegidas.length})`}
          </button>
        </div>
      </div>

      {abierta &&
        createPortal(
          <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
            <div
              className="animate-velo absolute inset-0 bg-negro-950/70 backdrop-blur-sm"
              onClick={() => setAbierta(false)}
              aria-hidden="true"
            />

            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="titulo-comparador"
              className="animate-entrar-panel relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-lg bg-white shadow-nivel-3 sm:max-h-[88vh] sm:rounded-lg"
            >
              <div className="flex items-center justify-between gap-4 border-b border-gris-200 px-5 py-4">
                <div>
                  <p className="etiqueta text-rojo">Comparar</p>
                  <h2 id="titulo-comparador" className="titulo-tarjeta mt-1 text-negro">
                    {elegidas.length} unidades lado a lado
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setAbierta(false)}
                  aria-label="Cerrar comparación"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-gris-500 transition-colors duration-rapido hover:bg-gris-100 hover:text-negro"
                >
                  <IconoCerrar className="h-4 w-4" />
                </button>
              </div>

              {/**
               * La tabla ENTRA en el ancho del teléfono. No es un detalle de
               * apretado: si para leer la segunda unidad hay que desplazar y
               * perder de vista la primera, no se están comparando —era la
               * única función de esta ventana y no la cumplía—.
               *
               * `table-fixed` + `<colgroup>` es lo que lo garantiza, y es el
               * arreglo del defecto que tenía: con `w-1/3` sobre los `<th>` y
               * layout automático, el ancho lo repartía el CONTENIDO. Medido en
               * 390px, las tres columnas daban 82 / 82 / 153px —la del nombre
               * más largo se llevaba el doble— las fotos 50 / 49 / 103px de
               * alto, y la tabla terminaba midiendo 398px dentro de una caja de
               * 390: el scroll horizontal que este bloque decía evitar.
               *
               * En layout fijo el ancho lo mandan las columnas declaradas y no
               * lo que traiga adentro: el rótulo se lleva su medida fija y el
               * resto se reparte EN PARTES IGUALES. Tres columnas idénticas,
               * fotos idénticas, sin desborde.
               *
               * Los 80px del rótulo alcanzan para "Kilómetros" en dos
               * renglones, y ese renglón de más se paga una vez, no por unidad.
               * De `sm` para arriba vuelve todo a la medida cómoda.
               */}
              <div className="overflow-auto">
                <table className="w-full table-fixed border-separate border-spacing-0 text-left">
                  <colgroup>
                    <col className="w-20 sm:w-32" />
                    {/* Sin ancho: en layout fijo, las columnas sin declarar se
                        reparten lo que sobra en partes iguales. Son dos o tres
                        según cuántas se hayan elegido, y no hay que calcular
                        ningún porcentaje. */}
                    {elegidas.map((unidad) => (
                      <col key={unidad.slug} />
                    ))}
                  </colgroup>

                  {/* Pegado arriba. Antes el encabezado se iba con el scroll:
                      medido en desktop ocupaba 313px de los 637 visibles, y al
                      bajar hasta "Sucursal" ya no se sabía de qué unidad era
                      cada columna. Comparar es leer una fila sabiendo a qué
                      pertenece cada valor; sin el encabezado a la vista, la
                      tabla se convierte en tres números sin dueño. */}
                  <thead className="sticky top-0 z-20 bg-white">
                    <tr>
                      <th
                        scope="col"
                        className="sticky left-0 z-30 border-b border-gris-300 bg-white p-2 sm:p-4"
                      >
                        <span className="sr-only">Campo</span>
                      </th>
                      {elegidas.map((unidad) => (
                        <th key={unidad.slug} scope="col" className="border-b border-gris-300 bg-white p-2 pb-3 align-top sm:p-4 sm:pb-5">
                          {/* Alto FIJO, no proporción: la foto es la referencia
                              visual de la columna y las tres tienen que apoyar
                              el nombre en la misma línea. Con `aspect-[4/3]` el
                              alto seguía al ancho, así que cualquier diferencia
                              de columna se amplificaba en la foto. */}
                          <Image
                            src={unidad.imagen}
                            alt=""
                            width={240}
                            height={180}
                            className="h-14 w-full rounded-sm object-cover sm:h-24"
                          />
                          {/* El nombre baja a 15px en el teléfono y se corta en
                              dos renglones: a 20px y sin tope, "Volvo FH 460
                              Usado Seleccionado" ocupaba cuatro renglones en
                              una columna y empujaba la primera fila de datos
                              fuera de la pantalla. Lo que hay que comparar son
                              los datos, no los títulos —el nombre completo
                              sigue estando en el `title` y en la ficha—. */}
                          <Link
                            href={`/unidad/${unidad.slug}`}
                            onClick={() => setAbierta(false)}
                            title={unidad.nombre}
                            /* Sin `block`: `line-clamp` necesita quedarse con
                               el `display` de la caja (`-webkit-box`), y una
                               utilidad de display posterior lo pisaba —el
                               nombre volvía a crecer a tres renglones—. */
                            className="mt-2 line-clamp-2 font-display text-sm font-extrabold leading-tight text-negro hover:text-rojo sm:text-lg"
                          >
                            {unidad.nombre}
                          </Link>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filas.map((fila) => {
                      /* Una fila donde las tres dicen lo mismo no aporta a una
                         comparación, pero sacarla escondería un dato que la
                         persona está mirando. Se marca en gris: el ojo salta a
                         las que difieren, que es de lo que se trata. */
                      const valores = elegidas.map(fila.valor);
                      const todasIguales =
                        elegidas.length > 1 && new Set(valores).size === 1;

                      return (
                        <tr key={fila.etiqueta}>
                          <th
                            scope="row"
                            className="sticky left-0 z-10 border-b border-gris-200 bg-white p-2 align-top sm:p-4"
                          >
                            <span className="rotulo-dato">{fila.etiqueta}</span>
                          </th>
                          {valores.map((valor, indice) => (
                            <td
                              key={elegidas[indice].slug}
                              /* El borde va en la CELDA y no en la fila: la
                                 tabla pasó a `border-separate` para que el
                                 encabezado pegado pueda tener su propia línea
                                 —con `border-collapse`, el navegador no pinta
                                 bordes ni sombras de una celda `sticky`—, y en
                                 ese modo un borde declarado sobre el `<tr>` no
                                 se dibuja. */
                              className={`border-b border-gris-200 p-2 align-top text-sm sm:p-4 ${fila.cifra ? 'dato' : ''} ${
                                todasIguales ? 'text-gris-500' : 'font-medium text-negro'
                              }`}
                            >
                              {valor}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-gris-200 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setSlugs(vaciarComparador())}
                  className="text-sm font-medium text-rojo transition-opacity hover:opacity-70"
                >
                  Vaciar comparación
                </button>
                <button
                  type="button"
                  onClick={() => setAbierta(false)}
                  className="centrado-optico inline-flex h-11 items-center rounded bg-negro px-6 text-sm font-medium text-white transition-colors hover:bg-negro-800"
                >
                  Seguir mirando
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
