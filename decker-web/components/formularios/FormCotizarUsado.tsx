'use client';

import { useId, useState } from 'react';
import { IconoWhatsapp } from '@/components/ui/Iconos';
import { registrarOfertaDeUsado } from '@/lib/leads';
import { linkCotizarUsado } from '@/lib/whatsapp';
import type { IdSucursal, Sucursal } from '@/lib/types';

/**
 * Toma de usados. Hace DOS cosas al enviar, y las dos importan.
 *
 * 1. Deja la oferta registrada en el backend de Decker (`/api/contacto/vender`).
 *    Es lo que hace que el usado quede anotado aunque el visitante abra
 *    WhatsApp y no llegue a escribir.
 * 2. Abre WhatsApp con el mensaje ya armado, dirigido al asesor de la sucursal
 *    elegida. Es lo que el visitante entiende que hizo.
 *
 * EL ORDEN Y EL NO-AWAIT SON LO QUE HACE QUE FUNCIONE. El registro se dispara
 * primero pero no se espera: si esperáramos la respuesta, entre el clic y el
 * `window.open` pasaría un viaje de red, el navegador dejaría de considerarlo
 * parte del gesto del usuario y bloquearía la pestaña como popup. Ver
 * `lib/leads.ts`.
 *
 * La validación es la nativa del formulario (`required`).
 */
export default function FormCotizarUsado({ sucursales }: { sucursales: Sucursal[] }) {
  const id = useId();
  const [datos, setDatos] = useState({
    nombre: '',
    telefono: '',
    email: '',
    marca: '',
    modelo: '',
    anio: '',
    km: '',
    estado: '',
    sucursalId: sucursales[0]?.id ?? ('bahia-blanca' as IdSucursal),
  });

  const actualizar = (campo: keyof typeof datos) => (
    evento: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setDatos((previo) => ({ ...previo, [campo]: evento.target.value }));

  return (
    <form
      // La tarjeta va sobre una sección blanca: sin un borde propio, blanco
      // sobre blanco no se distingue. El anillo la define; la sombra sola no
      // alcanza.
      className="space-y-5 rounded-lg bg-white p-6 shadow-nivel-1 ring-1 ring-gris-200 sm:p-8"
      onSubmit={(evento) => {
        evento.preventDefault();

        const formulario = new FormData();
        formulario.set('nombre', datos.nombre);
        formulario.set('telefono', datos.telefono);
        formulario.set('email', datos.email);
        formulario.set('marca', datos.marca);
        formulario.set('modelo', datos.modelo);
        formulario.set('anio', datos.anio);
        formulario.set('km', datos.km);
        formulario.set('estado', datos.estado);
        // El nombre y no el id: es lo que el asesor lee, y la API no tiene
        // campo de sucursal, así que viaja dentro del mensaje.
        formulario.set(
          'sucursal',
          sucursales.find((sucursal) => sucursal.id === datos.sucursalId)?.nombre ?? '',
        );

        registrarOfertaDeUsado(formulario);
        window.open(linkCotizarUsado(datos), '_blank', 'noopener,noreferrer');
      }}
      aria-label="Cotizar unidad usada como parte de pago"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-nombre`} className="campo-label">
            Nombre y apellido
          </label>
          <input
            id={`${id}-nombre`}
            className="campo"
            required
            autoComplete="name"
            placeholder="Juan Pérez"
            value={datos.nombre}
            onChange={actualizar('nombre')}
          />
        </div>
        <div>
          <label htmlFor={`${id}-telefono`} className="campo-label">
            Teléfono / WhatsApp
          </label>
          <input
            id={`${id}-telefono`}
            className="campo dato"
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="291 400 0000"
            value={datos.telefono}
            onChange={actualizar('telefono')}
          />
        </div>
      </div>

      {/* El email es OBLIGATORIO para la API de Decker: `POST /contactos/vender`
          lo rechaza sin él. No es un campo de más "por las dudas" —sin esto la
          cotización no queda registrada del lado de ellos y el asesor sólo se
          entera por el WhatsApp—. */}
      <div>
        <label htmlFor={`${id}-email`} className="campo-label">
          Email
        </label>
        <input
          id={`${id}-email`}
          className="campo"
          required
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="juan@ejemplo.com"
          value={datos.email}
          onChange={actualizar('email')}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-marca`} className="campo-label">
            Marca de tu unidad
          </label>
          <input
            id={`${id}-marca`}
            className="campo"
            required
            placeholder="Volvo"
            value={datos.marca}
            onChange={actualizar('marca')}
          />
        </div>
        <div>
          <label htmlFor={`${id}-modelo`} className="campo-label">
            Modelo
          </label>
          <input
            id={`${id}-modelo`}
            className="campo"
            required
            placeholder="FH 460"
            value={datos.modelo}
            onChange={actualizar('modelo')}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-anio`} className="campo-label">
            Año
          </label>
          <input
            id={`${id}-anio`}
            className="campo dato"
            required
            type="number"
            inputMode="numeric"
            min={1980}
            max={new Date().getFullYear() + 1}
            placeholder="2018"
            value={datos.anio}
            onChange={actualizar('anio')}
          />
        </div>
        <div>
          <label htmlFor={`${id}-km`} className="campo-label">
            Kilómetros / horas de uso
          </label>
          <input
            id={`${id}-km`}
            className="campo dato"
            required
            placeholder="450.000 km"
            value={datos.km}
            onChange={actualizar('km')}
          />
        </div>
      </div>

      <div>
        <label htmlFor={`${id}-sucursal`} className="campo-label">
          Sucursal de preferencia
        </label>
        <select
          id={`${id}-sucursal`}
          className="campo"
          value={datos.sucursalId}
          onChange={actualizar('sucursalId')}
        >
          {sucursales.map((sucursal) => (
            <option key={sucursal.id} value={sucursal.id}>
              {sucursal.nombre} — {sucursal.direccion}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`${id}-estado`} className="campo-label">
          Estado general (opcional)
        </label>
        <textarea
          id={`${id}-estado`}
          className="campo resize-y"
          rows={3}
          placeholder="Service al día, cubiertas al 60%, sin detalles de chapa…"
          value={datos.estado}
          onChange={actualizar('estado')}
        />
      </div>

      <button
        type="submit"
        className="centrado-optico inline-flex h-12 w-full items-center justify-center gap-2 rounded bg-rojo text-sm font-medium text-white transition-colors hover:bg-rojo-700 active:translate-y-px"
      >
        <IconoWhatsapp className="h-4 w-4" />
        Enviar consulta por WhatsApp
      </button>

      <p className="text-xs leading-relaxed text-gris-500">
        Al enviar, tu consulta queda registrada en Decker y se abre WhatsApp con el mensaje ya
        escrito, dirigido al asesor de la sucursal que elegiste.
      </p>
    </form>
  );
}
