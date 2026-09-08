import Hero from '@/components/home/Hero';
import CompraSegura from '@/components/home/CompraSegura';
import Agencias from '@/components/home/Agencias';
import CtaDecker from '@/components/home/CtaDecker';
import Catalogo from '@/components/home/Catalogo';
import VistosRecientemente from '@/components/unidades/VistosRecientemente';
import CalculadoraFinanciacion from '@/components/financiacion/CalculadoraFinanciacion';
import FormCotizarUsado from '@/components/formularios/FormCotizarUsado';
import EncabezadoSeccion from '@/components/ui/EncabezadoSeccion';
import {
  getAccesosCatalogo,
  getCatalogoCompleto,
  getConteoPorSucursal,
  getIndiceBuscador,
  getResumenDeUnidades,
  getParametrosFinanciacion,
  getSucursales,
} from '@/lib/api';

interface Props {
  // Desde Next 15 `searchParams` es una Promise: la página empieza a renderizar
  // antes de que se conozcan los parámetros, y recién se esperan cuando se usan.
  searchParams: Promise<{ q?: string }>;
}

/** Los textos de las secciones son los del sitio original de Decker. */
export default async function Home({ searchParams }: Props) {
  const [
    parametrosUrl,
    unidades,
    sucursales,
    sugerencias,
    parametros,
    conteoPorSucursal,
    accesos,
    resumen,
  ] = await Promise.all([
    searchParams,
    getCatalogoCompleto(),
    getSucursales(),
    getIndiceBuscador(),
    getParametrosFinanciacion(),
    getConteoPorSucursal(),
    getAccesosCatalogo(),
    getResumenDeUnidades(),
  ]);

  return (
    <>
      <Hero
        sucursales={sucursales}
        sugerencias={sugerencias}
        totalUnidades={sugerencias.length}
        busquedaInicial={parametrosUrl.q}
      />

      {/**
       * Para el que vuelve, PRIMERO: lo que estaba mirando la otra vez, antes
       * que los accesos por categoría. Comprar un camión no se resuelve en una
       * sesión, y el que vuelve viene a terminar de mirar lo mismo —hacerle
       * bajar hasta el final para reencontrarlo es pedirle que rehaga el camino
       * que esta franja existe para ahorrarle—.
       *
       * El ancho y el aire van EN el componente y no en un envase alrededor:
       * con la lista vacía —un visitante nuevo— devuelve `null`, y un `<div>`
       * de afuera se quedaría igual con su padding. La home de alguien que
       * entra por primera vez arrancaría con cien píxeles de lienzo vacío entre
       * el hero y el catálogo, que es el hueco huérfano que esto evita.
       *
       * Sólo padding superior: el que separa esta franja del catálogo de abajo
       * es el padding propio de esa sección, no uno sumado acá.
       */}
      <VistosRecientemente unidades={resumen} className="contenedor pt-16 sm:pt-20 lg:pt-24" />

      {/* Una sola sección de catálogo: el hero ofrece buscar por texto y esto
          es la otra mitad de lo mismo —entrar por lo que uno ya sabe que
          busca— para el que no tiene una palabra para escribir. */}
      <Catalogo accesos={accesos} unidades={unidades} />

      {/* El cierre de marca va acá, no arriba del footer: corta la corrida de
          secciones claras y le da un próximo paso a quien acaba de mirar las
          unidades destacadas. */}
      <CtaDecker />

      <CompraSegura />

      <section id="financiacion" className="seccion scroll-mt-24">
        <div className="contenedor">
          <EncabezadoSeccion
            etiqueta="Financiación"
            titulo="Simulá tu operación"
            descripcion="Una herramienta simple para iniciar la consulta comercial y avanzar con un asesor Decker."
          />
          <CalculadoraFinanciacion parametros={parametros} />
        </div>
      </section>

      {/* Sección blanca, no negra: el negro pleno contra la tarjeta blanca del
          formulario daba un contraste duro justo donde el usuario tiene que
          quedarse a cargar siete campos. Se distingue igual de las vecinas
          —financiación y agencias van sobre el lienzo gris— sin ese golpe. */}
      <section id="cotizar" className="seccion scroll-mt-24 bg-white">
        <div className="contenedor grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div>
            <p className="etiqueta text-rojo">Parte de pago</p>
            <h2 className="titulo-seccion mt-3">Entregá tu usado y subite a otra unidad</h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-gris-500">
              Cargá los datos de tu unidad y generá una consulta directa para que el equipo
              comercial evalúe la operación.
            </p>

            {/* Los pasos como línea de tiempo: la guía vertical los liga en una
                secuencia en vez de dejarlos como cuatro ítems sueltos. */}
            <ol className="mt-10">
              {[
                'Completás los datos de tu unidad.',
                'Se abre WhatsApp con el mensaje ya armado.',
                'El asesor evalúa la operación y te responde.',
                'Coordinás la inspección en la agencia.',
              ].map((paso, indice, pasos) => (
                <li key={paso} className="relative flex gap-4 pb-7 last:pb-0">
                  {indice < pasos.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-[15px] top-9 w-px bg-gris-200"
                    />
                  )}
                  <span className="dato relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-negro text-sm font-medium text-white">
                    {indice + 1}
                  </span>
                  <span className="pt-1.5 text-base leading-relaxed text-gris-600">
                    {paso}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <FormCotizarUsado sucursales={sucursales} />
        </div>
      </section>

      <Agencias sucursales={sucursales} conteo={conteoPorSucursal} />
    </>
  );
}
