import EncabezadoSeccion from '@/components/ui/EncabezadoSeccion';
import {
  IconoCalendario,
  IconoCamion,
  IconoEscudo,
  IconoPin,
} from '@/components/ui/Iconos';

/**
 * Sección "Compra segura".
 *
 * Los cuatro pilares y sus textos son los del sitio original de Decker, sin
 * agregados: no se declaran garantías, revisiones ni certificaciones que la
 * empresa no haya confirmado.
 *
 * Cada pilar lleva SU ícono, no el mismo tilde cuatro veces. Un check repetido
 * en las cuatro columnas no aporta información —dice "sí" en todas— y es el
 * tell visual de la fila de features genérica. Escudo, calendario, camión y pin
 * dicen de qué habla cada bloque antes de que se lea el título.
 */
const PILARES = [
  {
    Icono: IconoEscudo,
    titulo: 'Unidades verificadas',
    detalle: 'Ficha técnica, fotos, estado general y documentación de cada unidad.',
  },
  {
    Icono: IconoCalendario,
    titulo: 'Financiación disponible',
    detalle: 'Opciones en pesos, cheques y cuotas según la operación vigente.',
  },
  {
    Icono: IconoCamion,
    titulo: 'Toma de usados',
    detalle: 'Formulario para cargar datos de la unidad y usarla como parte de pago.',
  },
  {
    Icono: IconoPin,
    titulo: 'Atención por agencia',
    detalle:
      'Derivación directa a Bahía Blanca, Quequén, Mar del Plata, Allen o Comodoro Rivadavia.',
  },
];

export default function CompraSegura() {
  return (
    /**
     * Bloque blanco del recorrido: funciona como respiro entre el cierre de
     * marca —que ya trae la foto y el fondo negro— y la financiación. Los
     * pilares van sin tarjeta a propósito: una superficie blanca sobre fondo
     * blanco no se distingue, y acá no hay datos que encuadrar, sólo texto.
     */
    <section id="compra-segura" className="seccion scroll-mt-24 bg-white">
      <div className="contenedor">
        <EncabezadoSeccion
          etiqueta="Compra segura"
          titulo="Una compra más clara, segura y profesional"
          descripcion="Inspirada en la presencia de los camiones Volvo actuales: diseño limpio, información precisa, visuales grandes y asesoramiento comercial directo."
        />

        <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {PILARES.map((pilar) => (
            /**
             * Sin la pastilla rosa que tenía antes.
             *
             * Un cuadrado de color claro con el ícono adentro es el acabado de
             * una fila de features de plantilla: el bloque de color pesa más
             * que el dibujo y no dice nada —el rosa no significa "seguro"—. Y
             * era el único lugar del sitio con una superficie tintada de marca;
             * la iconografía de specs de las tarjetas (calendario, medidor,
             * pin) siempre fue trazo suelto sobre el fondo que hubiera.
             *
             * Queda el mismo trazo, más grande y en rojo. El acento vive en la
             * línea, que es donde se lee como señalética industrial y no como
             * componente de librería. A 32px el 1.5 del viewBox rinde 2px de
             * trazo: gana presencia sin engordar el dibujo.
             *
             * La regla de arriba reemplaza a la pastilla como anclaje: con
             * cuatro columnas hace falta algo que arranque la lectura a la
             * misma altura, y una línea de 1px agrupa sin encuadrar ni teñir.
             */
            <article key={pilar.titulo} className="border-t border-gris-200 pt-6">
              <pilar.Icono className="h-8 w-8 text-rojo" />
              <h3 className="titulo-tarjeta mt-5 text-negro">
                {pilar.titulo}
              </h3>
              <p className="mt-2 text-base leading-relaxed text-gris-500">{pilar.detalle}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
