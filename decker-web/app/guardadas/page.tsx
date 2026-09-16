import type { Metadata } from 'next';
import GuardadasCliente from '@/components/unidades/GuardadasCliente';
import { getCatalogoCompleto } from '@/lib/api';

/**
 * Mis unidades guardadas.
 *
 * `noindex`: el contenido de esta página lo pone el navegador de cada visitante,
 * así que para un buscador siempre estaría vacía. Indexarla sería publicar una
 * página en blanco.
 */
export const metadata: Metadata = {
  title: 'Unidades guardadas',
  description:
    'Las unidades que guardaste en este dispositivo. No hace falta cuenta: quedan en tu navegador.',
  robots: { index: false, follow: true },
};

/**
 * SE RENDERIZA A DEMANDA, no en el build.
 *
 * Su contenido no es el mismo para dos visitantes —lo pone el `localStorage` de
 * cada uno— así que prerenderizarla sólo cachea el listado que viaja al cliente,
 * y eso ya lo cachea el `fetch` contra la API por cinco minutos.
 *
 * Lo que sí evita es que un build hecho mientras la API está caída se caiga
 * entero con `Export encountered an error on /guardadas/page`. Prerenderizar es
 * publicar: si el stock no está disponible en ese momento, esta página tiene que
 * poder esperar al primer visitante, no impedir el deploy. A la hora de la
 * verdad, si la API falla cuando alguien entra, sube el error y aparece la
 * pantalla de `app/error.tsx` con su "Reintentar", que es lo correcto.
 */
export const dynamic = 'force-dynamic';

export default async function Guardadas() {
  // El stock completo viaja al cliente y ahí se cruza con los favoritos del
  // navegador. Con este volumen es una sola carga; si el catálogo creciera a
  // miles, este es el punto donde habría que pedir sólo los slugs guardados.
  const unidades = await getCatalogoCompleto();

  return (
    <section className="seccion pt-28 sm:pt-32">
      <div className="contenedor">
        <p className="etiqueta text-rojo">Tu selección</p>
        <h1 className="titulo-seccion mt-3">Unidades guardadas</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-gris-600">
          Se guardan en este navegador, sin cuenta y sin dejar ningún dato. Si
          entrás desde otro teléfono o borrás los datos del sitio, la lista
          arranca de cero.
        </p>

        <div className="mt-10">
          <GuardadasCliente unidades={unidades} />
        </div>
      </div>
    </section>
  );
}
