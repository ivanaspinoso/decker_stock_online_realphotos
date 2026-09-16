'use client';

import { IconoWhatsapp } from '@/components/ui/Iconos';
import { registrarConsultaDeUnidad } from '@/lib/leads';

/**
 * El botón "Consultar por WhatsApp" de la ficha.
 *
 * Es lo mismo que un `<a>` a `wa.me` —el `href` está puesto y funciona con
 * JavaScript apagado, con clic del medio y con "abrir en pestaña nueva"— más
 * una cosa: al clickear, avisa al backend de Decker que alguien consultó por
 * esta unidad.
 *
 * LAS DOS COSAS PASAN, UNA NO REEMPLAZA A LA OTRA. El registro deja el interés
 * anotado aunque el visitante abra WhatsApp y no escriba nada; el WhatsApp es
 * lo que el visitante entiende que hizo. El registro sale primero y no se
 * espera su respuesta, para no perder el gesto que abre la pestaña (ver
 * `lib/leads.ts`).
 *
 * VA SIN NOMBRE NI TELÉFONO, y hay que saberlo: desde la ficha no hay
 * formulario, lo único que tenemos es qué unidad se estaba mirando. Si el
 * backend exige esos campos, va a contestar 422 y no se registra nada —el
 * visitante llega a WhatsApp igual y el motivo queda en el log del servidor,
 * con los nombres de campo exactos que pide—. Si no los exige, Decker se entera
 * de qué unidades generan consultas, que ya es información que hoy no tiene.
 */
export default function BotonConsultar({ slug, href }: { slug: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => registrarConsultaDeUnidad({ slug })}
      className="centrado-optico inline-flex h-14 w-full items-center justify-center gap-2 rounded bg-rojo text-md font-medium text-white transition-colors duration-rapido hover:bg-rojo-700 active:translate-y-px"
    >
      <IconoWhatsapp className="h-5 w-5" />
      Consultar por WhatsApp
    </a>
  );
}
