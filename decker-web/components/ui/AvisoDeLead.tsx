'use client';

import { useEffect, useState } from 'react';
import { IconoCerrar } from '@/components/ui/Iconos';
import { EVENTO_LEAD_FALLO, type DetalleDeFallo } from '@/lib/leads';

/**
 * El aviso de que una consulta no quedó registrada.
 *
 * QUÉ PROBLEMA RESUELVE
 *
 * Los formularios de lead disparan el POST y abren WhatsApp sin esperar la
 * respuesta —si esperaran, el navegador bloquearía la pestaña como popup (ver
 * `lib/leads.ts`)—. Eso dejaba los errores invisibles: un 422 porque la API
 * rechazó el teléfono, o un 429 por mandar cuatro veces seguidas, morían en el
 * log del servidor. El visitante se iba convencido de que su consulta había
 * quedado registrada, y del lado de Decker no había nada.
 *
 * Ahora la respuesta se lee igual, tarde, y si falló se anuncia acá.
 *
 * POR QUÉ NO DESAPARECE SOLO, A DIFERENCIA DEL AVISO DE `lib/vuelo.ts`
 *
 * Porque cuando este mensaje llega, el visitante NO está mirando esta pantalla:
 * está en la pestaña de WhatsApp que se acaba de abrir. Un cartel de tres
 * segundos se apagaría sin que nadie lo vea, que es exactamente el problema que
 * vino a resolver. Se queda hasta que la persona vuelve y lo cierra.
 *
 * Es el único aviso del sitio que se comporta así, y por eso no usa el helper
 * de `vuelo.ts`: aquél confirma algo que salió bien y puede irse solo.
 *
 * QUÉ DICE, Y EN QUÉ ORDEN
 *
 * Primero el problema, después la salida. La salida importa más que el
 * problema: el mensaje de WhatsApp YA está abierto y sirve igual, así que lo
 * peor que puede pasar es que la persona abandone creyendo que no hay forma de
 * contactar. Cuando el mensaje viene de la API —los `errors` de un 422 nombran
 * el campo— se muestra ése, que es más útil que cualquier texto nuestro.
 */
export default function AvisoDeLead() {
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    const alFallar = (evento: Event) => {
      const detalle = (evento as CustomEvent<DetalleDeFallo>).detail;
      if (detalle?.mensaje) setMensaje(detalle.mensaje);
    };

    window.addEventListener(EVENTO_LEAD_FALLO, alFallar);
    return () => window.removeEventListener(EVENTO_LEAD_FALLO, alFallar);
  }, []);

  if (!mensaje) return null;

  return (
    <div
      /* `alert` y no `status`: esto no es una confirmación que se puede leer al
         terminar la frase en curso, es algo que la persona tiene que saber para
         no quedarse esperando una respuesta que no va a llegar. */
      role="alert"
      aria-live="assertive"
      /* Abajo, sobre el resto. `bottom-24` en mobile deja lugar a la barra del
         comparador, que vive en `bottom-0` y mide unos 73px: superpuestos, el
         aviso taparía el único control para vaciarla. */
      className="animate-aparecer fixed inset-x-4 bottom-24 z-[60] mx-auto max-w-lg rounded-md bg-negro-950 p-4 shadow-nivel-3 sm:bottom-6"
    >
      <div className="flex items-start gap-3">
        {/* El punto rojo es lo único de color: dice "esto es un problema" antes
            de que se lea la primera palabra. */}
        <span
          aria-hidden="true"
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rojo"
        />
        <p className="flex-1 text-sm leading-relaxed text-white">{mensaje}</p>
        <button
          type="button"
          onClick={() => setMensaje(null)}
          aria-label="Cerrar el aviso"
          /* 40px de lado: tocable con el pulgar sin apuntar. */
          className="-m-1.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-gris-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <IconoCerrar className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
