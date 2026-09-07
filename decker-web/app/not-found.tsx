import Boton from '@/components/ui/Boton';

export default function NoEncontrado() {
  return (
    <div className="contenedor flex min-h-[60vh] flex-col items-center justify-center pb-16 pt-28 text-center">
      <p className="dato text-6xl font-medium text-rojo-800">404</p>
      <h1 className="titulo-expresivo mt-4 text-3xl sm:text-4xl">
        No encontramos esa página
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-gris-600">
        Puede que la unidad ya se haya vendido o que el link esté mal escrito. Probá en el
        catálogo completo.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Boton href="/catalogo" variante="primario" tamano="lg">
          Ver catálogo
        </Boton>
        <Boton href="/" variante="secundario" tamano="lg">
          Volver al inicio
        </Boton>
      </div>
    </div>
  );
}
