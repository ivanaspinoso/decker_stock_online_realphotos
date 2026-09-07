'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import Link from 'next/link';
import UnidadGrilla from '@/components/unidades/UnidadGrilla';
import { leerFavoritos, suscribirAFavoritos } from '@/lib/favoritos';
import type { Unidad } from '@/lib/types';

/**
 * Listado de unidades guardadas.
 *
 * El servidor manda el stock completo —son unas decenas de unidades, no un
 * catálogo de miles— y acá se filtra por lo que haya en el navegador. Es la
 * única forma de armar esta página sin cuenta y sin backend: el servidor no
 * sabe, ni tiene por qué saber, qué guardó este visitante.
 *
 * El orden lo da la lista de favoritos, no el catálogo: lo último que se guardó
 * va primero, que es como la persona recuerda su propia lista.
 */

/* En el servidor no hay almacenamiento que leer; `useEffect` no corre en SSR
   y evita el warning de React por el efecto de layout durante el render. */
const usarEfectoDeLayout = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export default function GuardadasCliente({ unidades }: { unidades: Unidad[] }) {
  const [slugs, setSlugs] = useState<string[]>([]);

  /* Efecto de LAYOUT y no efecto común: la lectura pasa antes del primer
     pintado, así que quien tiene ocho unidades guardadas no ve por un cuadro el
     cartel de "todavía no guardaste ninguna". */
  usarEfectoDeLayout(() => {
    setSlugs(leerFavoritos());
  }, []);

  useEffect(() => suscribirAFavoritos(setSlugs), []);

  const guardadas = slugs
    .map((slug) => unidades.find((unidad) => unidad.slug === slug))
    // Una unidad guardada hace un mes puede haberse vendido: se cae de la lista
    // en silencio en vez de dejar una tarjeta rota.
    .filter((unidad): unidad is Unidad => unidad !== undefined);

  /* El estado vacío es también lo que se sirve desde el servidor y lo que ve
     quien tiene el JavaScript apagado: un esqueleto ahí quedaría girando para
     siempre, prometiendo un contenido que nunca va a llegar. El texto, en
     cambio, es cierto en los tres casos. */
  if (guardadas.length === 0) {
    return (
      <div className="rounded-lg bg-white p-12 text-center shadow-nivel-1">
        <p className="font-display text-2xl font-extrabold text-negro">
          Todavía no guardaste ninguna unidad
        </p>
        <p className="mx-auto mt-2 max-w-md text-base leading-relaxed text-gris-500">
          Tocá el corazón en cualquier unidad del stock y va a quedar acá, en este
          teléfono o computadora, sin necesidad de crear una cuenta.
        </p>
        <Link
          href="/catalogo"
          className="centrado-optico mt-6 inline-flex h-11 items-center rounded bg-rojo px-6 text-sm font-medium text-negro transition-colors duration-rapido hover:bg-rojo-700"
        >
          Ver el stock
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="mb-6 text-sm text-gris-500">
        <span className="dato text-md font-medium text-negro">{guardadas.length}</span>{' '}
        {guardadas.length === 1 ? 'unidad guardada' : 'unidades guardadas'} en este
        dispositivo
      </p>
      {/* `key` con la cantidad: al quitar una, las que quedan vuelven a entrar y
          se ve que la lista respondió. */}
      <UnidadGrilla key={guardadas.length} unidades={guardadas} animar />
    </>
  );
}
