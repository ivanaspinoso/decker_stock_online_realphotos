'use client';

import { useId, useState } from 'react';
import { IconoWhatsapp } from '@/components/ui/Iconos';
import { linkCotizarUsado } from '@/lib/whatsapp';
import type { IdSucursal, Sucursal } from '@/lib/types';

/**
 * Toma de usados. No guarda nada: arma un WhatsApp prellenado y lo abre.
 *
 * El envío usa la validación nativa del formulario (`required`) y abre el link
 * dentro del gesto del usuario, así el navegador no lo bloquea como popup.
 */
export default function FormCotizarUsado({ sucursales }: { sucursales: Sucursal[] }) {
  const id = useId();
  const [datos, setDatos] = useState({
    nombre: '',
    telefono: '',
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
      className="space-y-5 rounded-lg bg-white p-6 shadow-tarjeta ring-1 ring-gris-200 sm:p-8"
      onSubmit={(evento) => {
        evento.preventDefault();
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
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded bg-rojo text-sm font-semibold text-white transition-colors hover:bg-rojo-700 active:translate-y-px"
      >
        <IconoWhatsapp className="h-4 w-4" />
        Enviar consulta por WhatsApp
      </button>

      <p className="text-[12px] leading-relaxed text-gris-500">
        Se abre WhatsApp con el mensaje ya escrito, dirigido al asesor de la sucursal elegida.
        Los datos no se guardan en este sitio.
      </p>
    </form>
  );
}
