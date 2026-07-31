import EncabezadoSeccion from '@/components/ui/EncabezadoSeccion';
import { IconoCheck } from '@/components/ui/Iconos';

/**
 * Sección "Compra segura".
 *
 * Los cuatro pilares y sus textos son los del sitio original de Decker, sin
 * agregados: no se declaran garantías, revisiones ni certificaciones que la
 * empresa no haya confirmado.
 */
const PILARES = [
  {
    titulo: 'Unidades verificadas',
    detalle: 'Ficha técnica, fotos, estado general y documentación de cada unidad.',
  },
  {
    titulo: 'Financiación disponible',
    detalle: 'Opciones en pesos, cheques y cuotas según la operación vigente.',
  },
  {
    titulo: 'Toma de usados',
    detalle: 'Formulario para cargar datos de la unidad y usarla como parte de pago.',
  },
  {
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
          titulo="Una compra más clara, segura y profesional."
          descripcion="Inspirada en la presencia de los camiones Volvo actuales: diseño limpio, información precisa, visuales grandes y asesoramiento comercial directo."
        />

        <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {PILARES.map((pilar) => (
            <article key={pilar.titulo}>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-sm bg-rojo-50">
                <IconoCheck className="h-5 w-5 text-rojo" />
              </span>
              <h3 className="mt-5 text-[17px] font-semibold leading-snug text-negro">
                {pilar.titulo}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gris-500">{pilar.detalle}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
