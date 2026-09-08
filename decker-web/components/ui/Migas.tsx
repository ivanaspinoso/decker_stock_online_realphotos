import Link from 'next/link';

/**
 * Miga de pan.
 *
 * Importa sobre todo para el que NO llegó navegando: el sitio tiene botón de
 * compartir, así que la puerta de entrada más común a una ficha es un link de
 * WhatsApp que alguien mandó. Esa persona cae en una unidad suelta, sin haber
 * pasado por la home ni por el catálogo, y la miga es lo único que le dice
 * dónde está parada y cómo ver el resto.
 *
 * Por eso los niveles intermedios son destinos REALES y no decorado: "Volvo"
 * lleva al catálogo filtrado por Volvo, no a una página de marca que no existe.
 * Una miga cuyos eslabones no llevan a ningún lado es peor que no tenerla:
 * promete una jerarquía que el sitio no tiene.
 *
 * Va también el `BreadcrumbList` de schema.org, que es lo que hace que Google
 * muestre "decker › Stock › Volvo" en vez de la URL cruda en el resultado de
 * búsqueda. Es el mismo dato dos veces —una para la persona y otra para el
 * buscador—, así que sale de la misma lista y no puede quedar desincronizado.
 */
export default function Migas({
  niveles,
  /** URL absoluta del sitio, para el dato estructurado. */
  base,
}: {
  /** El último va sin `href`: es dónde se está parado, no un destino. */
  niveles: { texto: string; href?: string }[];
  base?: string;
}) {
  const datosEstructurados = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: niveles.map((nivel, indice) => ({
      '@type': 'ListItem',
      position: indice + 1,
      name: nivel.texto,
      ...(nivel.href && base ? { item: `${base}${nivel.href}` } : {}),
    })),
  };

  return (
    <nav aria-label="Miga de pan">
      {base && (
        <script
          type="application/ld+json"
          // El contenido lo arma este componente a partir de datos del propio
          // sitio: no hay entrada de usuario que pueda escaparse del JSON.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(datosEstructurados) }}
        />
      )}

      {/* `flex-wrap`: con cuatro niveles y una marca larga, en un teléfono la
          fila no entra. Envolver es preferible a recortar un eslabón, que es
          justo lo que hay que poder tocar. */}
      <ol className="contenedor flex flex-wrap items-center gap-x-2 gap-y-1 pb-4 pt-24 text-sm text-gris-500">
        {niveles.map((nivel, indice) => {
          const ultimo = indice === niveles.length - 1;
          return (
            <li key={nivel.texto} className="flex min-w-0 items-center gap-2">
              {indice > 0 && (
                /* gris-500 y no gris-300: sobre el lienzo, el gris claro daba
                   1.4:1 y la barra se veía como un renglón vacío entre los dos
                   enlaces. */
                <span aria-hidden="true" className="text-gris-500">
                  /
                </span>
              )}

              {nivel.href && !ultimo ? (
                /* `-my-1 py-1`: los enlaces medían 20px de alto, abajo de los 24
                   que pide WCAG 2.5.8. El margen negativo devuelve el espacio,
                   así que crece el área tocable y la fila se ve igual. */
                <Link
                  href={nivel.href}
                  className="-my-1 truncate py-1 transition-colors hover:text-negro"
                >
                  {nivel.texto}
                </Link>
              ) : (
                <span aria-current={ultimo ? 'page' : undefined} className="truncate text-negro">
                  {nivel.texto}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
