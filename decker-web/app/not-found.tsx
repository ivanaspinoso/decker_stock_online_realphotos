import Boton from '@/components/ui/Boton';

export default function NoEncontrado() {
  return (
    <div className="contenedor flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <p className="dato text-6xl font-semibold text-rojo">404</p>
      <h1 className="mt-4 font-display text-3xl uppercase leading-none tracking-tight sm:text-4xl">
        No encontramos esa página
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-gris-600">
        Puede que la unidad ya se haya vendido o que el link esté mal escrito. Probá en el
        catálogo completo.
      </p>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
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
