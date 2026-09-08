'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { IconoCheck } from '@/components/ui/Iconos';
import {
  MAXIMO_COMPARADOR,
  alternarComparador,
  leerComparador,
  suscribirAComparador,
} from '@/lib/comparador';
import { avisar, volarADestino } from '@/lib/vuelo';

/**
 * "Comparar" de cada tarjeta.
 *
 * Es una casilla y no un botón de acción: marcar una unidad para comparar es
 * elegirla de una lista, no ejecutar algo. Un botón que después queda "apretado"
 * obliga a mirar el color para saber si entró; una casilla lo dice con la marca,
 * que es lo que la gente ya sabe leer.
 *
 * El estado vive en el navegador (ver `lib/comparador.ts`). Acá sólo se pinta y
 * se avisa.
 *
 * Arranca SIEMPRE sin marcar y recién después de montar lee el almacenamiento:
 * el HTML lo genera el servidor, que no tiene forma de saber qué eligió este
 * visitante. Pintarla marcada en el servidor sería una promesa que el cliente
 * desmiente medio segundo después.
 */
export default function BotonComparar({
  slug,
  nombre,
  soloCasilla = false,
  className = '',
}: {
  slug: string;
  /** Va en la etiqueta accesible: "Comparar Volvo FM 420", no "Comparar". */
  nombre: string;
  /**
   * Sin la palabra al lado. Es para la vista lista, donde la columna ya se
   * llama "Comparar": repetir el rótulo en las treinta y seis filas gastaría
   * noventa píxeles de una tabla que ya scrollea en horizontal.
   */
  soloCasilla?: boolean;
  className?: string;
}) {
  const [elegida, setElegida] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setElegida(leerComparador().includes(slug));
    // La misma unidad puede estar en la grilla y en la tabla al mismo tiempo, y
    // puede haber dos pestañas abiertas.
    return suscribirAComparador((slugs) => setElegida(slugs.includes(slug)));
  }, [slug]);

  const alTocar = (evento: MouseEvent<HTMLButtonElement>) => {
    const { lista, resultado } = alternarComparador(slug);
    setElegida(lista.includes(slug));

    if (resultado === 'llena') {
      /* El tope no es un error: es el límite de lo que se puede leer de una
         pasada. Se dice qué pasó y qué hacer, no "no se pudo". */
      avisar(`Se comparan hasta ${MAXIMO_COMPARADOR} unidades. Sacá una para sumar otra.`);
      return;
    }

    // Sacar no vuela: no hay destino al que mandar algo que se está quitando.
    if (resultado !== 'agregada') return;

    /* El punto del toque, no el centro del botón: es de donde la persona cree
       que salió. Se acepta sólo si CAE DENTRO del control —con teclado el
       evento llega en cero, y hay navegadores que reponen ahí la última
       posición del mouse—. Fuera de la caja manda el centro, que siempre es
       correcto. Mismo criterio que el corazón de guardar. */
    const caja = evento.currentTarget.getBoundingClientRect();
    const centro = { x: caja.left + caja.width / 2, y: caja.top + caja.height / 2 };
    const dentro =
      evento.clientX >= caja.left &&
      evento.clientX <= caja.right &&
      evento.clientY >= caja.top &&
      evento.clientY <= caja.bottom;

    /* La primera que se suma no vuela: la barra del comparador todavía no está
       en pantalla cuando se toca, y `volarADestino` resuelve solo ese caso
       mostrando el cartel. De la segunda en adelante hay a dónde señalar. */
    volarADestino({
      destino: 'comparador',
      origen: dentro ? { x: evento.clientX, y: evento.clientY } : centro,
      modelo: boton.current?.querySelector('svg') ?? null,
      mensaje: `Sumada al comparador (${lista.length} de ${MAXIMO_COMPARADOR})`,
    });
  };

  return (
    <button
      ref={boton}
      type="button"
      role="checkbox"
      aria-checked={elegida}
      aria-label={elegida ? `Sacar ${nombre} del comparador` : `Comparar ${nombre}`}
      onClick={alTocar}
      /* Con rótulo, `-mx-2`: el área tocable de 44px se queda, pero el texto
         apoya sobre el mismo borde izquierdo que el resto de la tarjeta.
         Sin rótulo, un cuadrado de 44x44 centrado, que es lo que necesita la
         celda de una tabla. */
      className={`centrado-optico inline-flex h-11 items-center rounded-sm text-sm font-medium text-gris-600 transition-colors duration-rapido hover:text-negro ${
        soloCasilla ? 'w-11 justify-center' : '-mx-2 gap-2 px-2 hover:bg-gris-100'
      } ${className}`}
    >
      {/* La casilla se dibuja acá y no con un `<input>`: hay que pintarla sobre
          fondos distintos y el control nativo no se deja. El rol y el estado
          los declara el botón, así que para un lector de pantalla es una
          casilla igual. */}
      <span
        aria-hidden="true"
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border transition-colors duration-rapido ${
          elegida ? 'border-negro bg-negro text-white' : 'border-gris-300 bg-white'
        }`}
      >
        {elegida && <IconoCheck className="h-3.5 w-3.5 animate-pop" />}
      </span>
      {!soloCasilla && 'Comparar'}
    </button>
  );
}
