'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { formatearNumero, formatearPrecio } from '@/lib/format';

/**
 * Número que sube hasta su valor con lógica de odómetro.
 *
 * No es un conteo suave: el valor avanza a SALTOS, uno cada 45ms, y cada dígito
 * que cambia entra desde arriba en 110ms recortado por su propia caja. Es la
 * diferencia entre un contador de tablero —mecánico, seco, que se lee mientras
 * gira— y la animación de conteo genérica, que se ve como un número borroso
 * hasta que frena.
 *
 * Esa elección no es un capricho de estilo: el sitio ya escribe TODO dato
 * técnico en monoespaciada con cifras de ancho fijo. Si el número se mueve, se
 * tiene que mover como se mueve un instrumento, no como una animación de
 * bienvenida. El efecto y la identidad terminan siendo la misma cosa.
 *
 * Se usa en DOS lugares y en ninguno más: las dos cifras del hero y la cuota
 * del simulador. Repetirlo en cada número de cada sección lo volvería ruido.
 *
 * Innegociables:
 * - Sin JS, y en el HTML servido, el valor final ya está escrito. Nadie ve cero.
 * - Con `prefers-reduced-motion` no cuenta ni tiquea: escribe el valor y listo.
 * - El recorrido dura menos de un segundo.
 */

/* En el servidor no hay layout que medir; `useEffect` no corre en SSR y evita
   el warning de React por el efecto de layout durante el render del servidor. */
const usarEfectoDeLayout = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * El formato viaja como texto y no como función: el hero es un Server Component
 * y React no deja cruzar funciones por el límite servidor/cliente.
 */
const FORMATOS = {
  entero: (numero: number) => String(numero),
  miles: formatearNumero,
  precio: formatearPrecio,
} as const;

type Formato = keyof typeof FORMATOS;

/**
 * Milisegundos entre saltos visibles. 45ms ≈ 22 pasos por segundo: bastante
 * lento para que el ojo registre cada cambio de dígito y bastante rápido para
 * que el conjunto se lea como un movimiento continuo. Por debajo de ~30ms el
 * número se vuelve una mancha; por encima de ~70ms parece que se traba.
 */
const PASO_TICK = 45;

/** Desaceleración cúbica. Sin rebote, sin sobrepaso: frena y se planta. */
const desacelerar = (t: number) => 1 - Math.pow(1 - t, 3);

const prefiereMenosMovimiento = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function NumeroAnimado({
  valor,
  formato = 'entero',
  duracion = 700,
  desdeViewport = false,
  className = '',
}: {
  valor: number;
  /** Cómo se escribe: entero pelado, con separador de miles, o en pesos. */
  formato?: Formato;
  duracion?: number;
  /** Arranca recién cuando el número entra en pantalla, no al montar. */
  desdeViewport?: boolean;
  className?: string;
}) {
  const [mostrado, setMostrado] = useState(valor);
  const [activo, setActivo] = useState(!desdeViewport);
  const nodo = useRef<HTMLSpanElement>(null);
  const ultimo = useRef(valor);

  /* Antes del primer pintado: si el número va a contar, arranca en cero. Al ser
     efecto de layout, nadie ve el valor final parpadear antes del conteo. */
  usarEfectoDeLayout(() => {
    if (!desdeViewport || prefiereMenosMovimiento()) return;
    ultimo.current = 0;
    setMostrado(0);
    // Sólo al montar: si `valor` cambia después, la animación de abajo va del
    // número anterior al nuevo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!desdeViewport || activo) return;
    const elemento = nodo.current;
    if (!elemento || !('IntersectionObserver' in window)) {
      setActivo(true);
      return;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        if (!entradas.some((entrada) => entrada.isIntersecting)) return;
        setActivo(true);
        observador.disconnect();
      },
      // 0.4: el número tiene que estar de verdad a la vista, no asomando por el
      // borde mientras el usuario sigue scrolleando de largo.
      { threshold: 0.4 },
    );

    observador.observe(elemento);
    return () => observador.disconnect();
  }, [desdeViewport, activo]);

  useEffect(() => {
    if (!activo) return;

    if (prefiereMenosMovimiento()) {
      ultimo.current = valor;
      setMostrado(valor);
      return;
    }

    const desde = ultimo.current;
    if (desde === valor) return;

    const inicio = performance.now();
    let cuadro = 0;
    let ultimoTick = 0;

    const paso = (ahora: number) => {
      const transcurrido = ahora - inicio;
      const avance = Math.min(1, transcurrido / duracion);
      const terminado = avance === 1;

      /* El salto es lo que hace al odómetro: entre tick y tick el número no se
         toca, aunque el cuadro se dibuje igual. Sin esto habría 60 valores por
         segundo y ningún dígito se leería. */
      if (terminado || transcurrido - ultimoTick >= PASO_TICK) {
        ultimoTick = transcurrido;
        ultimo.current = terminado ? valor : desde + (valor - desde) * desacelerar(avance);
        setMostrado(ultimo.current);
      }

      if (!terminado) cuadro = requestAnimationFrame(paso);
    };

    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [activo, valor, duracion]);

  const texto = FORMATOS[formato](Math.round(mostrado));

  return (
    /* `overflow-hidden` es lo que recorta el dígito mientras entra desde arriba:
       sin él se vería flotar sobre el renglón de al lado en vez de girar dentro
       de su casilla. El número siempre ocupa su elemento entero, así que el
       inline-flex no descoloca ningún texto vecino. */
    <span ref={nodo} className={`inline-flex overflow-hidden ${className}`}>
      {Array.from(texto).map((caracter, indice) => (
        /* La `key` incluye el carácter: cuando un dígito cambia, React monta un
           span nuevo y la animación corre de cero. Los dígitos que no cambiaron
           —los miles de un precio que se mueve de a cientos— se quedan quietos,
           que es exactamente lo que hace un contador mecánico. */
        <span key={`${indice}-${caracter}`} className="animate-tick inline-block">
          {/* El espacio del formato de moneda va como espacio duro (U+00A0):
              entre `inline-block`, un espacio común colapsa y el signo de peso
              se pega al primer dígito. */}
          {caracter === ' ' ? ' ' : caracter}
        </span>
      ))}
    </span>
  );
}
