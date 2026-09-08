'use client';

import { useEffect, useRef, useState } from 'react';
import { IconoCompartir, IconoEnlace } from '@/components/ui/Iconos';

/**
 * Compartir una unidad.
 *
 * En el teléfono usa el selector nativo del sistema (`navigator.share`): el que
 * ya tiene los contactos de WhatsApp arriba de todo, que es por donde viaja el
 * 90% de estas consultas. En escritorio, donde esa API casi no existe, copia el
 * enlace y lo confirma con un aviso corto.
 *
 * El enlace siempre apunta a ESTA unidad. Mandar la home y que el otro tenga
 * que buscar la unidad de nuevo es la forma más rápida de perder la consulta.
 */

type Estado = 'quieto' | 'copiado' | 'error';

export default function BotonCompartir({
  titulo,
  descripcion,
  ruta,
  variante = 'boton',
  className = '',
}: {
  titulo: string;
  descripcion: string;
  /** Ruta interna de la unidad, ej. `/unidad/volvo-fm-420-0km`. */
  ruta: string;
  /**
   * `boton` es la barra a todo el ancho con la palabra al lado. `icono` es el
   * cuadrado de 44px, para cuando comparte renglón con el corazón de guardar:
   * ahí las dos son acciones chicas del mismo rango, y una de ellas con rótulo
   * y superficie pesaría como el botón de simular financiación que tiene
   * arriba. El nombre accesible no se pierde —lo pone `aria-label`—.
   */
  variante?: 'boton' | 'icono';
  className?: string;
}) {
  const [estado, setEstado] = useState<Estado>('quieto');
  const temporizador = useRef<number>(0);

  useEffect(() => () => window.clearTimeout(temporizador.current), []);

  const avisar = (siguiente: Estado) => {
    setEstado(siguiente);
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => setEstado('quieto'), 2400);
  };

  const compartir = async () => {
    // Absoluta: el que la recibe la abre desde otra aplicación, no desde acá.
    const url = new URL(ruta, window.location.origin).toString();

    if (navigator.share) {
      try {
        await navigator.share({ title: titulo, text: descripcion, url });
        return;
      } catch (error) {
        // Cancelar el selector nativo no es un fallo: no hay nada que avisar.
        if (error instanceof DOMException && error.name === 'AbortError') return;
        // Cualquier otra cosa —permiso denegado, contexto inseguro— cae al
        // camino de copiar, que es el que siempre funciona.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      avisar('copiado');
    } catch {
      avisar('error');
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={compartir}
        aria-label="Compartir esta unidad"
        title="Compartir esta unidad"
        className={
          variante === 'icono'
            ? 'inline-flex h-11 w-11 items-center justify-center rounded-sm text-gris-500 transition-colors duration-rapido hover:bg-gris-100 hover:text-negro'
            : 'centrado-optico inline-flex h-11 w-full items-center justify-center gap-2 rounded bg-gris-100 text-sm font-medium text-negro transition-colors duration-rapido hover:bg-gris-200'
        }
      >
        <IconoCompartir className={variante === 'icono' ? 'h-5 w-5' : 'h-4 w-4'} />
        {variante === 'boton' && 'Compartir esta unidad'}
      </button>

      {/* El aviso se anuncia solo: quien navega con lector de pantalla tiene que
          enterarse de que el enlace se copió, y no hay ningún cambio visual que
          se lo cuente. */}
      <p role="status" aria-live="polite" className="sr-only">
        {estado === 'copiado' ? 'Enlace copiado al portapapeles.' : ''}
        {estado === 'error' ? 'No se pudo copiar el enlace.' : ''}
      </p>

      {estado !== 'quieto' && (
        <span
          aria-hidden="true"
          className="animate-entrar-panel absolute inset-x-0 -top-12 z-20 mx-auto flex w-max items-center gap-2 rounded-sm bg-negro px-3 py-2 text-sm font-medium text-white shadow-nivel-2"
        >
          <IconoEnlace className="h-4 w-4 text-amarillo" />
          {estado === 'copiado' ? 'Enlace copiado' : 'Copiá el enlace de la barra'}
        </span>
      )}
    </div>
  );
}
