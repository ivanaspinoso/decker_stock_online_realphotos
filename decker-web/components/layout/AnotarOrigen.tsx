'use client';

import { useEffect } from 'react';
import { anotarOrigen } from '@/lib/lead-financiacion';

/**
 * Anota de dónde llegó la visita (`utm_*` y referrer). No dibuja nada.
 *
 * Vive en el layout porque tiene que correr en la PRIMERA página que se abre,
 * sea cual sea: el formulario de financiación casi nunca está ahí. Ver
 * `anotarOrigen()`.
 */
export default function AnotarOrigen() {
  useEffect(() => {
    anotarOrigen();
  }, []);

  return null;
}
