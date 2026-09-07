'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { IconoCorazon } from '@/components/ui/Iconos';
import { alternarFavorito, leerFavoritos, suscribirAFavoritos } from '@/lib/favoritos';
import { volarADestino } from '@/lib/vuelo';

/**
 * Corazón de "guardar unidad".
 *
 * El estado vive en el navegador de la persona, sin cuenta y sin pedirle un
 * dato (ver `lib/favoritos.ts`). Acá sólo se pinta y se avisa.
 *
 * Arranca SIEMPRE en vacío y recién después de montar lee el almacenamiento:
 * el HTML lo genera el servidor, que no tiene forma de saber qué guardó este
 * visitante. Pintarlo lleno en el servidor sería una promesa que el cliente
 * desmiente medio segundo después, y React protestaría por la discrepancia.
 */
export default function BotonFavorito({
  slug,
  nombre,
  variante = 'sobre-foto',
  className = '',
}: {
  slug: string;
  /** Va en la etiqueta accesible: "Guardar Volvo FM 420", no "Guardar". */
  nombre: string;
  /** `sobre-foto` va montado sobre la imagen; `superficie` sobre fondo claro. */
  variante?: 'sobre-foto' | 'superficie';
  className?: string;
}) {
  const [guardada, setGuardada] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setGuardada(leerFavoritos().includes(slug));
    // Dos tarjetas de la misma unidad —grilla y guardadas— tienen que moverse
    // juntas, y dos pestañas abiertas también.
    return suscribirAFavoritos((favoritos) => setGuardada(favoritos.includes(slug)));
  }, [slug]);

  /**
   * Sin caja en ninguna de las dos variantes: el estado lo cuenta el dibujo.
   *
   * Vacío es "podés guardarla", lleno y rojo es "ya está". Es el mismo par que
   * usa el corazón del header, así que la persona lo lee una vez y le sirve en
   * todo el sitio.
   *
   * Sobre la foto el contraste lo da `corazon-foto` —un contorno, no una
   * superficie— porque ahí abajo puede haber cualquier cosa. Sobre fondo claro
   * no hace falta nada: el rojo da 5,9:1 sobre blanco y el negro mucho más.
   *
   * El área tocable sigue midiendo 44px aunque ya no se vea ninguna caja: es
   * lo que hace que el dedo acierte, y no tiene por qué estar pintada.
   */
  const estilos =
    variante === 'sobre-foto'
      ? guardada
        ? 'corazon-foto text-rojo hover:text-rojo-600'
        : 'corazon-foto text-white hover:text-rojo'
      : guardada
        ? 'text-rojo hover:text-rojo-700'
        : 'text-gris-500 hover:text-rojo';

  /**
   * Guardar no es sólo pintar este corazón: la unidad se va a otro lado de la
   * página —el corazón del header— y hay que mostrar a cuál. De eso se encarga
   * `lib/vuelo`; acá sólo se le dice desde dónde salió y qué dibujo mandar.
   *
   * QUITAR no vuela: no hay destino al que mandar algo que se está sacando, y
   * una animación ahí diría lo contrario de lo que pasó. Es también lo que
   * evita que tildar y destildar rápido dispare una animación por toque.
   */
  const alTocar = (evento: MouseEvent<HTMLButtonElement>) => {
    const ahoraGuardada = alternarFavorito(slug).includes(slug);
    setGuardada(ahoraGuardada);
    if (!ahoraGuardada) return;

    /* El punto del toque, no el centro del botón: es de donde la persona cree
       que salió.

       El punto se acepta sólo si CAE DENTRO del botón. Con teclado no hay
       puntero y el evento llega con las coordenadas en cero, pero además hay
       navegadores y automatizaciones que reponen ahí la última posición del
       mouse: una coordenada vieja haría salir el corazón de un lugar de la
       página donde no pasó nada. Fuera de la caja, manda el centro del
       control, que es siempre correcto. */
    const caja = evento.currentTarget.getBoundingClientRect();
    const centro = { x: caja.left + caja.width / 2, y: caja.top + caja.height / 2 };
    const dentroDelBoton =
      evento.clientX >= caja.left &&
      evento.clientX <= caja.right &&
      evento.clientY >= caja.top &&
      evento.clientY <= caja.bottom;

    volarADestino({
      destino: 'favoritos',
      origen: dentroDelBoton ? { x: evento.clientX, y: evento.clientY } : centro,
      modelo: boton.current?.querySelector('svg') ?? null,
      mensaje: 'Guardado en Mis unidades',
    });
  };

  return (
    <button
      ref={boton}
      type="button"
      onClick={alTocar}
      aria-pressed={guardada}
      aria-label={guardada ? `Quitar ${nombre} de guardadas` : `Guardar ${nombre}`}
      title={guardada ? 'Quitar de guardadas' : 'Guardar unidad'}
      /* 44px: es un control tocable como cualquier otro, y encima va sobre la
         foto, donde el dedo tiene menos referencias para apuntar. */
      className={`inline-flex h-11 w-11 items-center justify-center rounded-sm transition-colors duration-rapido ${estilos} ${className}`}
    >
      {/* La `key` cambia con el estado: al alternar, React monta un ícono nuevo
          y el pop corre de cero. Es un solo golpe de 150ms —la confirmación de
          que el toque entró—, no un rebote. */}
      <IconoCorazon
        key={guardada ? 'llena' : 'vacia'}
        relleno={guardada}
        className="h-5 w-5 animate-pop"
      />
    </button>
  );
}
