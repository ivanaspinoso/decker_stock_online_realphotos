/**
 * Feedback dirigido: mostrarle a la persona A DÓNDE fue a parar lo que hizo.
 *
 * El principio, que vale para toda acción que guarda algo en otro lado del
 * sitio: cuando el resultado de un click vive fuera de la vista —el corazón del
 * header, un futuro comparador, un carrito—, no se explica con un cartel, se
 * MUESTRA. Un ícono sale del punto exacto del toque y viaja hasta el control
 * que ahora lo contiene, que acusa la llegada. La persona aprende dónde
 * buscarlo sin leer una sola palabra.
 *
 * Este archivo no sabe nada de favoritos: recibe un origen, el nombre de un
 * destino y un nodo para clonar. Para sumar otra acción alcanza con marcar su
 * control de destino con `data-destino="<nombre>"` y llamar a `volarADestino`.
 *
 * Fuera de una animación no queda nada montado: los nodos se crean al vuelo y
 * se sacan al terminar.
 */

/** Atributo con el que un control se declara destino de un vuelo. */
const ATRIBUTO_DESTINO = 'data-destino';

/**
 * 460ms. Abajo de 400 el recorrido no se sigue con la vista —se ve un parpadeo
 * en dos puntos—; arriba de 500 la página se siente trabada, porque hay algo
 * moviéndose mientras la persona ya quiere seguir scrolleando.
 */
const DURACION_VUELO = 460;

/** El acuse en el destino. Corto: confirma, no festeja. */
const DURACION_PULSO = 260;

/**
 * UN vuelo a la vez en toda la página.
 *
 * Guardar cuatro unidades seguidas no tiene que llenar la pantalla de corazones
 * cruzándose. El último toque es el que importa, así que un vuelo nuevo cancela
 * el que estaba en curso en vez de sumarse: nunca hay dos superpuestos, y el
 * feedback siempre corresponde a la última acción.
 */
let vueloEnCurso: { nodo: HTMLElement; animacion: Animation } | null = null;

/** Cartel activo, para no apilar avisos cuando no hay movimiento. */
let avisoEnCurso: { nodo: HTMLElement; tarea: number } | null = null;

function prefiereQuietud(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Busca el destino VISIBLE con ese nombre.
 *
 * Puede haber más de uno declarado —el corazón del header existe dos veces, en
 * la barra de escritorio y en la de teléfono, y sólo una está en pantalla según
 * el ancho—. Gana la que efectivamente ocupa lugar: `display: none` mide 0.
 */
function destinoVisible(nombre: string): HTMLElement | null {
  const candidatos = document.querySelectorAll<HTMLElement>(
    '[' + ATRIBUTO_DESTINO + '="' + nombre + '"]',
  );

  for (const candidato of candidatos) {
    const caja = candidato.getBoundingClientRect();
    if (caja.width > 0 && caja.height > 0) return candidato;
  }

  return null;
}

function cancelarVueloEnCurso(): void {
  if (!vueloEnCurso) return;
  vueloEnCurso.animacion.cancel();
  vueloEnCurso.nodo.remove();
  vueloEnCurso = null;
}

/**
 * Cartel de respaldo. Es lo que reemplaza al vuelo cuando no hay animación
 * posible: por `prefers-reduced-motion` o porque el destino no está en pantalla.
 *
 * `role="status"` y no `alert`: es una confirmación, no una interrupción. El
 * lector de pantalla lo lee al terminar la frase en curso.
 */
export function avisar(mensaje: string): void {
  if (avisoEnCurso) {
    window.clearTimeout(avisoEnCurso.tarea);
    avisoEnCurso.nodo.remove();
    avisoEnCurso = null;
  }

  const nodo = document.createElement('div');
  nodo.setAttribute('role', 'status');
  nodo.setAttribute('aria-live', 'polite');
  nodo.textContent = mensaje;
  /* Abajo y centrado: en un teléfono es la zona que el pulgar no tapa mientras
     toca una tarjeta. z-50 lo pone al nivel del header sticky. */
  nodo.className =
    'animate-aparecer pointer-events-none fixed inset-x-0 bottom-6 z-50 mx-auto w-fit ' +
    'max-w-[calc(100vw-2rem)] rounded-sm bg-negro-950 px-4 py-3 text-sm font-medium ' +
    'text-white shadow-nivel-3';

  document.body.appendChild(nodo);

  const tarea = window.setTimeout(() => {
    nodo.remove();
    avisoEnCurso = null;
  }, 2200);

  avisoEnCurso = { nodo, tarea };
}

/** Centro de un elemento, en coordenadas de viewport. */
function centroDe(elemento: Element): { x: number; y: number } {
  const caja = elemento.getBoundingClientRect();
  return { x: caja.left + caja.width / 2, y: caja.top + caja.height / 2 };
}

/**
 * Acuse en el destino: un golpe de escala sobre el dibujo, no sobre su caja.
 *
 * Va en el ícono y no en el enlace para que el fondo de hover no se estire con
 * él. Como es `transform`, no toca el layout: nada de alrededor se mueve.
 */
function pulsar(destino: HTMLElement): void {
  const dibujo = destino.querySelector('svg') ?? destino;

  dibujo.animate(
    [
      { transform: 'scale(1)' },
      { transform: 'scale(1.35)', offset: 0.4 },
      { transform: 'scale(1)' },
    ],
    { duration: DURACION_PULSO, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
  );
}

/**
 * Manda un ícono desde `origen` hasta el control marcado como `destino`.
 *
 * @param origen  Punto del toque, en coordenadas de viewport. Se toma del
 *                evento (`clientX`/`clientY`) para que salga de donde la persona
 *                tocó, no del centro del control ni de un punto fijo. Al ser
 *                coordenadas de viewport el scroll ya está contemplado: la
 *                tarjeta puede estar donde sea de la página.
 * @param modelo  Nodo a clonar para el viaje. Se le pasa el ícono real del
 *                control tocado, así lo que vuela es lo mismo que se tocó.
 * @param mensaje Lo que se dice cuando NO se puede volar.
 */
export function volarADestino({
  destino: nombreDestino,
  origen,
  modelo,
  mensaje,
}: {
  destino: string;
  origen: { x: number; y: number };
  modelo: Element | null;
  mensaje: string;
}): void {
  if (typeof window === 'undefined') return;

  // Con movimiento reducido no vuela NADA: ni el ícono ni un reemplazo que se
  // deslice. Se dice en texto, que es lo que la preferencia está pidiendo.
  if (prefiereQuietud()) {
    avisar(mensaje);
    return;
  }

  const destino = destinoVisible(nombreDestino);
  // Sin destino en pantalla no hay a dónde señalar, y una animación que muere
  // contra el borde no explica nada. Ahí el cartel es la respuesta correcta.
  if (!destino || !modelo) {
    avisar(mensaje);
    return;
  }

  cancelarVueloEnCurso();

  const llegada = centroDe(destino);
  const dx = llegada.x - origen.x;
  const dy = llegada.y - origen.y;

  const nodo = document.createElement('div');
  nodo.setAttribute('aria-hidden', 'true');
  nodo.appendChild(modelo.cloneNode(true));
  /* `fixed` y centrado sobre el punto del toque. Sin eventos: el vuelo pasa por
     encima de la página y no tiene que robarse un click en el camino. */
  nodo.className = 'pointer-events-none fixed z-50 h-6 w-6 text-rojo';
  nodo.style.left = origen.x - 12 + 'px';
  nodo.style.top = origen.y - 12 + 'px';
  /* Halo blanco: el vuelo arranca sobre la foto de la tarjeta —que puede ser
     oscura— y termina sobre la barra negra. Un contorno claro lo hace legible
     en los dos extremos sin cambiarle el color al ícono. */
  nodo.style.filter = 'drop-shadow(0 0 2px rgba(255,255,255,.95))';

  const dibujo = nodo.firstElementChild;
  if (dibujo) {
    // El que vuela va SIEMPRE lleno: es "esto que guardaste", no un control con
    // dos estados. El del origen puede haber salido vacío del clon.
    dibujo.setAttribute('fill', 'currentColor');
    dibujo.classList.add('h-6', 'w-6');
  }

  document.body.appendChild(nodo);

  /* Arco, no línea recta: el punto medio sube 60px sobre la cuerda. Una
     diagonal perfecta se lee como un objeto arrastrado; una curva se lee como
     algo que fue lanzado y cae en su lugar.
     La escala termina en 0.35 porque el destino es chico: el ícono no "llega"
     al lado del corazón del header, se mete adentro. */
  const animacion = nodo.animate(
    [
      { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
      {
        transform:
          'translate(' + dx * 0.5 + 'px, ' + (dy * 0.5 - 60) + 'px) scale(0.72)',
        opacity: 1,
        offset: 0.55,
      },
      {
        transform: 'translate(' + dx + 'px, ' + dy + 'px) scale(0.35)',
        opacity: 0.85,
      },
    ],
    { duration: DURACION_VUELO, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' },
  );

  vueloEnCurso = { nodo, animacion };

  animacion.addEventListener('finish', () => {
    // Si otro vuelo ya tomó el lugar, a este nodo lo sacó `cancelarVueloEnCurso`.
    if (vueloEnCurso?.nodo !== nodo) return;
    nodo.remove();
    vueloEnCurso = null;
    // El pulso arranca cuando el ícono desaparece: leídos juntos son una sola
    // cosa entrando, no dos animaciones una atrás de la otra.
    pulsar(destino);
  });
}
