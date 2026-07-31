import Hero from '@/components/home/Hero';
import CompraSegura from '@/components/home/CompraSegura';
import Agencias from '@/components/home/Agencias';
import CtaDecker from '@/components/home/CtaDecker';
import DestacadasCliente from '@/components/home/DestacadasCliente';
import CalculadoraFinanciacion from '@/components/financiacion/CalculadoraFinanciacion';
import FormCotizarUsado from '@/components/formularios/FormCotizarUsado';
import EncabezadoSeccion from '@/components/ui/EncabezadoSeccion';
import {
  getConteoPorSucursal,
  getIndiceBuscador,
  getParametrosFinanciacion,
  getSucursales,
  getUnidadesDestacadas,
} from '@/lib/api';
import type { EstadoUnidad, FiltrosCatalogo, IdSucursal, TipoUnidad } from '@/lib/types';

interface Props {
  searchParams: {
    q?: string;
    tipo?: string;
    marca?: string;
    sucursal?: string;
    estado?: string;
  };
}

/** Los textos de las secciones son los del sitio original de Decker. */
export default async function Home({ searchParams }: Props) {
  const [destacadas, sucursales, sugerencias, parametros, conteoPorSucursal] =
    await Promise.all([
      getUnidadesDestacadas(),
      getSucursales(),
      getIndiceBuscador(),
      getParametrosFinanciacion(),
      getConteoPorSucursal(),
    ]);

  // Filtros que pueden venir por URL (un link compartido, o la vuelta desde el
  // catálogo). Son el punto de partida de la sección de destacadas, que de ahí
  // en más filtra en el cliente.
  const filtros: FiltrosCatalogo = {
    busqueda: searchParams.q ?? '',
    tipo: (searchParams.tipo ?? '') as TipoUnidad | '',
    marca: searchParams.marca ?? '',
    sucursalId: (searchParams.sucursal ?? '') as IdSucursal | '',
    estado: (searchParams.estado ?? '') as EstadoUnidad | '',
  };

  return (
    <>
      <Hero
        sucursales={sucursales}
        sugerencias={sugerencias}
        totalUnidades={sugerencias.length}
        busquedaInicial={filtros.busqueda}
      />

      <section id="destacadas" className="seccion scroll-mt-24">
        <div className="contenedor">
          <DestacadasCliente
            unidades={destacadas}
            sucursales={sucursales}
            filtrosIniciales={filtros}
          />
        </div>
      </section>

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
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-gris-500">
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
                  <span className="dato relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-negro text-[13px] font-semibold text-white">
                    {indice + 1}
                  </span>
                  <span className="pt-1.5 text-[15px] leading-relaxed text-gris-600">
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
