'use client';

import { IconoFlecha } from '@/components/ui/Iconos';

/**
 * Los controles de paginación del catálogo.
 *
 * POR QUÉ EXISTE: con la API real el catálogo son 239 unidades y antes se
 * dibujaban todas de una. Eso es scroll interminable y, peor, doscientas fotos
 * pedidas al mismo tiempo al server de Decker —que corta las conexiones cuando
 * se le piden muchas juntas—, así que la mitad ni llegaba.
 *
 * QUÉ MUESTRA, Y POR QUÉ ASÍ
 *
 * "25–48 de 239" antes que los números de página. Es la pregunta que el
 * visitante se hace de verdad —¿dónde estoy y cuánto falta?— y un "4" suelto no
 * la contesta.
 *
 * Los números de página van con elipsis: con 10 páginas caben todas, pero un
 * catálogo de 60 páginas no puede dibujar 60 botones en un teléfono. Siempre se
 * ven la primera, la última, la actual y sus vecinas.
 *
 * No se dibuja nada si hay una sola página. Un control de paginación sobre 23
 * unidades es ruido: ocupa lugar, sugiere que hay más y no lleva a ninguna
 * parte.
 */
export default function Paginacion({
  pagina,
  totalPaginas,
  total,
  desde,
  hasta,
  onIr,
}: {
  pagina: number;
  totalPaginas: number;
  /** Cuántas unidades hay en total, ya filtradas. */
  total: number;
  /** Índice de la primera unidad visible, empezando en 1. */
  desde: number;
  /** Índice de la última visible. */
  hasta: number;
  onIr: (pagina: number) => void;
}) {
  if (totalPaginas <= 1) return null;

  const numeros = armarNumeros(pagina, totalPaginas);

  return (
    <nav
      className="mt-10 flex flex-col items-center gap-4 border-t border-gris-200 pt-8"
      aria-label="Paginación del catálogo"
    >
      {/* El contexto primero: dónde estoy y cuánto hay. */}
      <p className="text-sm text-gris-600">
        <span className="dato font-medium text-negro">
          {desde}–{hasta}
        </span>{' '}
        de <span className="dato font-medium text-negro">{total}</span>{' '}
        {total === 1 ? 'unidad' : 'unidades'}
      </p>

      <div className="flex items-center gap-1.5">
        <BotonFlecha
          hacia="anterior"
          deshabilitado={pagina === 1}
          onClick={() => onIr(pagina - 1)}
        />

        {numeros.map((numero, indice) =>
          numero === null ? (
            // La elipsis no es un botón: es un hueco. `aria-hidden` porque para
            // un lector de pantalla no aporta nada —ya anuncia "página 8 de
            // 10"— y leer "puntos suspensivos" en el medio es ruido.
            <span
              key={`hueco-${indice}`}
              aria-hidden="true"
              /* gris-500 y no gris-400: sobre el lienzo gris del catálogo, el
                 400 da 2.4:1 —ilegible—. Es decorativo para un lector de
                 pantalla, pero el que ve la pantalla lo lee para entender que
                 hay páginas en el medio, así que tiene que poder leerse. */
              className="px-1 text-sm text-gris-500"
            >
              …
            </span>
          ) : (
            <button
              key={numero}
              type="button"
              onClick={() => onIr(numero)}
              aria-label={`Página ${numero}`}
              /* `aria-current` y no `aria-pressed`: esto no es un interruptor
                 que queda hundido, es "acá estás parado". Es lo que hace que un
                 lector de pantalla anuncie la página actual como actual. */
              aria-current={numero === pagina ? 'page' : undefined}
              /* 40px de lado: es el mínimo tocable con el pulgar sin apuntar.
                 El activo va en negro relleno, que es lo que el sistema usa en
                 todo el sitio para "esta es la opción puesta" —el rojo está
                 reservado para el foco del teclado—. */
              className={`centrado-optico dato inline-flex h-11 min-w-11 items-center justify-center rounded px-2 text-sm font-medium transition-colors duration-rapido ${
                numero === pagina
                  ? 'bg-negro text-white'
                  : 'text-gris-600 hover:bg-gris-100 hover:text-negro'
              }`}
            >
              {numero}
            </button>
          ),
        )}

        <BotonFlecha
          hacia="siguiente"
          deshabilitado={pagina === totalPaginas}
          onClick={() => onIr(pagina + 1)}
        />
      </div>
    </nav>
  );
}

function BotonFlecha({
  hacia,
  deshabilitado,
  onClick,
}: {
  hacia: 'anterior' | 'siguiente';
  deshabilitado: boolean;
  onClick: () => void;
}) {
  const esAnterior = hacia === 'anterior';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      aria-label={esAnterior ? 'Página anterior' : 'Página siguiente'}
      /* `disabled` de verdad y no un `pointer-events-none`: en la primera
         página, el botón "anterior" tiene que estar fuera del recorrido del
         teclado, no sólo verse apagado. */
      className="centrado-optico inline-flex h-11 w-11 items-center justify-center rounded text-gris-600 transition-colors duration-rapido hover:bg-gris-100 hover:text-negro disabled:pointer-events-none disabled:opacity-30"
    >
      <IconoFlecha className={`h-4 w-4 ${esAnterior ? 'rotate-180' : ''}`} />
    </button>
  );
}

/**
 * Qué números de página se dibujan. `null` es una elipsis.
 *
 * La regla: siempre la primera, la última, la actual y una vecina de cada lado.
 * Hasta 7 páginas entran todas y no hace falta recortar nada.
 *
 * Ejemplos con 10 páginas:
 *   en la 1  → 1 2 3 … 10
 *   en la 5  → 1 … 4 5 6 … 10
 *   en la 10 → 1 … 8 9 10
 */
function armarNumeros(pagina: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const cerca = new Set<number>([1, total, pagina]);
  if (pagina - 1 > 1) cerca.add(pagina - 1);
  if (pagina + 1 < total) cerca.add(pagina + 1);

  // En los extremos se muestra una vecina más, para que la tira no cambie de
  // ancho al pasar de la página 1 a la 2 y los botones no se muevan bajo el dedo.
  if (pagina <= 2) cerca.add(3);
  if (pagina >= total - 1) cerca.add(total - 2);

  const ordenados = [...cerca].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);

  const conHuecos: (number | null)[] = [];
  for (const [indice, numero] of ordenados.entries()) {
    const anterior = ordenados[indice - 1];
    if (anterior !== undefined && numero - anterior > 1) conHuecos.push(null);
    conHuecos.push(numero);
  }

  return conHuecos;
}
