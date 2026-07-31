/**
 * Encabezado de sección.
 *
 * Sin línea divisoria abajo: la jerarquía la da el tamaño del título y el aire
 * que lo rodea, no una regla horizontal. La etiqueta chica en rojo ancla la
 * sección sin gritar.
 */
export default function EncabezadoSeccion({
  etiqueta,
  titulo,
  descripcion,
  oscuro = false,
  accion,
}: {
  etiqueta: string;
  titulo: string;
  descripcion?: string;
  oscuro?: boolean;
  accion?: React.ReactNode;
}) {
  return (
    <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className={`etiqueta ${oscuro ? 'text-amarillo' : 'text-rojo'}`}>{etiqueta}</p>
        <h2 className={`titulo-seccion mt-3 ${oscuro ? 'text-white' : 'text-negro'}`}>
          {titulo}
        </h2>
        {descripcion && (
          <p
            className={`mt-4 text-[15px] leading-relaxed ${
              // gris-300 y no gris-400: la variante oscura se usa sobre foto, y
              // ahí gris-400 no llega a 4.5:1 contra las zonas claras.
              oscuro ? 'text-gris-300' : 'text-gris-500'
            }`}
          >
            {descripcion}
          </p>
        )}
      </div>
      {accion && <div className="shrink-0">{accion}</div>}
    </div>
  );
}
