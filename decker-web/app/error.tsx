'use client';

import { useEffect } from 'react';
import Boton from '@/components/ui/Boton';

/**
 * Pantalla de error de las páginas.
 *
 * Es la red que atrapa lo que `lib/api.ts` deja subir cuando la API no
 * contesta: sin esto, una falla de red termina en la pantalla de error genérica
 * de Next —en producción, un "Application error" en blanco sobre fondo blanco—.
 *
 * Cubre `app/page.tsx` y todo lo que cuelga abajo (catálogo, fichas, guardadas).
 * NO cubre `app/layout.tsx`: un error en el layout se lleva puesto el árbol
 * entero, que es justamente por qué el layout atrapa el suyo por su cuenta.
 *
 * QUÉ SE LE DICE AL VISITANTE
 *
 * Que el problema es nuestro y es temporal, y no que "algo salió mal". El
 * mensaje técnico —qué endpoint, qué código, qué campo faltaba— no aparece en
 * pantalla: no le sirve a quien busca un camión y puede filtrar la URL interna
 * de la API. Va a la consola del servidor, que es donde alguien lo va a leer.
 *
 * Las dos salidas no son decorativas. "Reintentar" existe porque la causa más
 * probable —red, timeout, un 502 de paso— se arregla sola en segundos.
 * WhatsApp existe porque si el stock no carga, el visitante igual quiere
 * preguntar por un camión, y hay alguien del otro lado que puede contestarle
 * sin que el sitio funcione.
 */
export default function ErrorDePagina({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[error de página]', error);
  }, [error]);

  return (
    <div className="contenedor flex min-h-[60vh] flex-col items-center justify-center pb-16 pt-28 text-center">
      <h1 className="titulo-expresivo text-3xl sm:text-4xl">
        No pudimos cargar el stock
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-gris-600">
        Es un problema nuestro, no tuyo, y suele durar poco. Probá de nuevo en
        unos segundos.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Boton onClick={reset} variante="primario" tamano="lg">
          Reintentar
        </Boton>
        <Boton href="/" variante="sutil" tamano="lg">
          Volver al inicio
        </Boton>
      </div>

      {/* El digest es el identificador que Next le pone al error en producción,
          donde el mensaje real no viaja al navegador. Es lo único técnico que
          se muestra, y sirve para lo único que puede servir: que alguien lo
          copie en un reporte y se pueda cruzar con el log del servidor. */}
      {error.digest && (
        <p className="mt-8 text-xs text-gris-400">Referencia: {error.digest}</p>
      )}
    </div>
  );
}
