'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { IconoMasMenos } from '@/components/ui/Iconos';
import type { CategoriaBusqueda } from '@/lib/exploracion';

/**
 * Cierre de la home: entradas al catálogo agrupadas por dimensión.
 *
 * No es un buscador ni un segundo panel de filtros. Es el índice del stock para
 * el que llegó hasta abajo sin decidirse: en vez de dejarlo en el pie, le
 * ofrece por dónde volver a entrar —una marca, un rango de precio, una
 * sucursal— y lo manda al catálogo con el filtro ya puesto.
 *
 * Por eso es lo ÚLTIMO y lo más callado de la página: superficie blanca sobre
 * el lienzo gris, sin foto, sin color de marca en los rótulos y sin números
 * grandes. El catálogo destacado y los accesos de arriba son los que tienen que
 * llamar; esto está para el que ya no encontró por ahí.
 *
 * Cada atajo es un `<a href>` de verdad a `/catalogo?...`, no un botón que
 * dispara JavaScript: son las mismas URLs que produce el panel de filtros, así
 * que se comparten, se abren en otra pestaña y las indexa un buscador. El
 * contenido de los paneles está SIEMPRE en el HTML —plegar sólo lo esconde de
 * la vista—, que es lo que hace que estos enlaces existan para el que llega
 * desde Google.
 */
export default function ContinuarBusqueda({
  categorias,
}: {
  categorias: CategoriaBusqueda[];
}) {
  const id = useId();

  /**
   * Cuáles están abiertas. Arrancan TODAS cerradas: son seis categorías, y
   * abiertas de entrada son cincuenta chips de golpe al pie de la home.
   */
  const [abiertas, setAbiertas] = useState<string[]>([]);

  /**
   * En el teléfono se abre de a una.
   *
   * Con varias abiertas, cada panel agrega entre cuatro y seis renglones de
   * chips y la sección se vuelve una lista sin fin justo donde la página tenía
   * que terminar. En una pantalla ancha no pasa —los chips entran de a muchos
   * por renglón— y ahí sí se pueden comparar dos categorías a la vez.
   *
   * Se lee del ancho real y se mantiene al rotar el teléfono. Arranca en
   * `false` y se corrige al montar: el servidor no sabe con qué pantalla se
   * está entrando, y adivinarlo sería pintar un estado que el cliente
   * desmiente.
   */
  const [unaSola, setUnaSola] = useState(false);

  useEffect(() => {
    const consulta = window.matchMedia('(max-width: 1023px)');
    const aplicar = () => setUnaSola(consulta.matches);
    aplicar();
    consulta.addEventListener('change', aplicar);
    return () => consulta.removeEventListener('change', aplicar);
  }, []);

  const alternar = (clave: string) =>
    setAbiertas((previas) => {
      if (previas.includes(clave)) return previas.filter((id) => id !== clave);
      return unaSola ? [clave] : [...previas, clave];
    });

  if (categorias.length === 0) return null;

  return (
    <section className="seccion pt-0" aria-labelledby={`${id}-titulo`}>
      <div className="contenedor">
        {/* Encabezado propio y chico: no usa `EncabezadoSeccion` porque este
            bloque no anuncia nada, ordena. Un titular de sección acá lo pondría
            a competir con "Nuestras agencias", que sí es contenido. */}
        <h2 id={`${id}-titulo`} className="font-display text-2xl font-extrabold text-negro">
          Continuá tu búsqueda
        </h2>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-gris-500">
          Entradas directas al stock. Elegí por dónde empezar y el catálogo se abre con ese
          filtro puesto.
        </p>

        <div className="mt-6 overflow-hidden rounded-lg bg-white shadow-nivel-1">
          {categorias.map((categoria) => {
            const abierta = abiertas.includes(categoria.id);
            const idPanel = `${id}-${categoria.id}`;

            return (
              <div
                key={categoria.id}
                className="border-t border-gris-200 first:border-t-0"
              >
                <h3>
                  <button
                    type="button"
                    onClick={() => alternar(categoria.id)}
                    aria-expanded={abierta}
                    aria-controls={idPanel}
                    /* El renglón entero es el control: en un teléfono nadie
                       apunta a un ícono de 20px en el borde derecho. 64px de
                       alto y todo el ancho. */
                    className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition-colors duration-rapido hover:bg-gris-50"
                  >
                    <span className="text-md font-medium text-negro">{categoria.titulo}</span>
                    <span className="flex shrink-0 items-center gap-3">
                      {/* Cuántas opciones hay adentro. Dicho antes de abrir,
                          para que se sepa si vale la pena. */}
                      <span className="dato text-sm text-gris-500">
                        {categoria.atajos.length}
                      </span>
                      <IconoMasMenos abierto={abierta} className="h-5 w-5 text-gris-500" />
                    </span>
                  </button>
                </h3>

                {/**
                 * El panel está SIEMPRE en el HTML y se pliega con una grilla
                 * de `0fr` a `1fr`: es la única forma de animar de "cerrado" a
                 * "el alto que tenga el contenido" sin fijar un alto a mano ni
                 * medirlo con JavaScript.
                 *
                 * `invisible` cuando está cerrado —no `display:none`— para que
                 * el contenido siga en el documento, pero sin que el teclado se
                 * meta en los enlaces plegados.
                 */}
                <div
                  id={idPanel}
                  className={`grid transition-[grid-template-rows] duration-medio ease-suave ${
                    abierta ? 'grid-rows-[1fr]' : 'invisible grid-rows-[0fr]'
                  }`}
                >
                  <div className="overflow-hidden">
                    <ul className="flex flex-wrap gap-2 px-5 pb-6">
                      {categoria.atajos.map((atajo) => (
                        <li key={atajo.href}>
                          {/* Mismo chip que usa el buscador del hero: rótulo,
                              y al lado en chico cuántas unidades deja. */}
                          <Link
                            href={atajo.href}
                            tabIndex={abierta ? undefined : -1}
                            className="centrado-optico inline-flex h-11 items-center gap-2 rounded-sm bg-gris-100 px-4 text-sm font-medium text-negro transition-colors duration-rapido hover:bg-gris-200"
                          >
                            {atajo.texto}
                            <span className="dato text-xs text-gris-500">{atajo.cantidad}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
