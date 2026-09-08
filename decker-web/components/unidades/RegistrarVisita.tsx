'use client';

import { useEffect } from 'react';
import { registrarVisita } from '@/lib/recientes';

/**
 * Anota que se abrió esta ficha. No dibuja nada.
 *
 * Existe como componente porque la ficha es de servidor y `localStorage` sólo
 * existe en el navegador. Es la pieza más chica posible que cruza esa frontera:
 * un `useEffect` y nada más.
 *
 * Corre DESPUÉS de pintar, no antes: anotar la visita no puede demorar ni un
 * milisegundo la aparición de la unidad, que es a lo que la persona vino.
 */
export default function RegistrarVisita({ slug }: { slug: string }) {
  useEffect(() => {
    registrarVisita(slug);
  }, [slug]);

  return null;
}
