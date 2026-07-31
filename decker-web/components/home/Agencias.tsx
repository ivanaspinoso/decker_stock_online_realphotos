'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import EncabezadoSeccion from '@/components/ui/EncabezadoSeccion';
import { IconoFlecha, IconoPin, IconoWhatsapp } from '@/components/ui/Iconos';
import { linkWhatsapp } from '@/lib/whatsapp';
import type { IdSucursal, Sucursal } from '@/lib/types';

/**
 * Agencias en pestañas, con mapa y stock de cada una.
 *
 * En vez de cinco tarjetas iguales que el usuario tiene que barrer, elige su
 * agencia y ve dirección, mapa, WhatsApp del asesor y cuántas unidades hay ahí.
 *
 * Las pestañas siguen el patrón ARIA: flechas para moverse, Home/End para ir a
 * los extremos, y sólo la activa queda en el orden de tabulación.
 */
export default function Agencias({
  sucursales,
  conteo,
}: {
  sucursales: Sucursal[];
  conteo: Record<IdSucursal, number>;
}) {
  const [activa, setActiva] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const sucursal = sucursales[activa];
  const enfocar = (indice: number) => {
    setActiva(indice);
    refs.current[indice]?.focus();
  };

  const alPresionarTecla = (evento: React.KeyboardEvent) => {
    const ultimo = sucursales.length - 1;
    if (evento.key === 'ArrowRight' || evento.key === 'ArrowDown') {
      evento.preventDefault();
      enfocar(activa === ultimo ? 0 : activa + 1);
    } else if (evento.key === 'ArrowLeft' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      enfocar(activa === 0 ? ultimo : activa - 1);
    } else if (evento.key === 'Home') {
      evento.preventDefault();
      enfocar(0);
    } else if (evento.key === 'End') {
      evento.preventDefault();
      enfocar(ultimo);
    }
  };

  const direccionCompleta = `${sucursal.direccion}, ${sucursal.localidad}, ${sucursal.provincia}, Argentina`;

  // Se centra por coordenadas y no por texto: direcciones como "Ruta 3 km 696"
  // Google las interpreta como una ruta y devuelve un mapa de direcciones a
  // cientos de kilómetros. Con lat/lng el pin cae siempre donde corresponde.
  const { lat, lng } = sucursal.coordenadas;
  const mapa = `https://www.google.com/maps?q=${lat},${lng}&z=13&output=embed`;
  const comoLlegar = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccionCompleta)}`;

  return (
    <section id="agencias" className="seccion scroll-mt-24">
      <div className="contenedor">
        <EncabezadoSeccion
          etiqueta="Red Decker"
          titulo="Agencias Decker"
          descripcion="Atención comercial en Bahía Blanca, Quequén, Mar del Plata, Allen y Comodoro Rivadavia."
        />

        <div
          role="tablist"
          aria-label="Agencias Decker"
          onKeyDown={alPresionarTecla}
          className="flex flex-wrap gap-2"
        >
          {sucursales.map((item, indice) => (
            <button
              key={item.id}
              ref={(el) => {
                refs.current[indice] = el;
              }}
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={indice === activa}
              aria-controls={`panel-${item.id}`}
              tabIndex={indice === activa ? 0 : -1}
              onClick={() => setActiva(indice)}
              className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-semibold transition-colors duration-150 ${
                indice === activa
                  ? 'bg-negro text-white'
                  : 'bg-gris-100 text-gris-600 hover:bg-gris-200 hover:text-negro'
              }`}
            >
              {item.nombre}
              <span
                className={`dato text-[11px] ${
                  indice === activa ? 'text-amarillo' : 'text-gris-400'
                }`}
              >
                {conteo[item.id] ?? 0}
              </span>
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id={`panel-${sucursal.id}`}
          aria-labelledby={`tab-${sucursal.id}`}
          className="mt-6 grid animate-aparecer gap-6 overflow-hidden rounded-lg bg-white p-6 shadow-tarjeta lg:grid-cols-[minmax(0,1fr)_1.4fr] lg:p-8"
        >
          <div className="flex flex-col">
            <div className="flex items-start gap-3">
              <IconoPin className="mt-1 h-6 w-6 shrink-0 text-rojo" />
              <div>
                <h3 className="font-display text-[28px] font-semibold leading-none tracking-[-0.01em]">
                  {sucursal.nombre}
                </h3>
                <p className="mt-3 text-[15px] text-gris-600">{sucursal.direccion}</p>
                <p className="text-sm text-gris-400">
                  {sucursal.localidad}, {sucursal.provincia}
                </p>
              </div>
            </div>

            <dl className="mt-7 flex gap-8">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gris-400">
                  Unidades acá
                </dt>
                <dd className="dato mt-1 text-3xl font-semibold leading-none">
                  {conteo[sucursal.id] ?? 0}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gris-400">
                  WhatsApp
                </dt>
                <dd className="dato mt-1 text-[15px] font-semibold leading-none">
                  +{sucursal.asesor.whatsapp}
                </dd>
              </div>
            </dl>

            <div className="mt-auto flex flex-col gap-2.5 pt-8 sm:flex-row">
              <a
                href={linkWhatsapp(
                  sucursal.asesor.whatsapp,
                  `Hola Decker, quiero consultar con la agencia de ${sucursal.nombre}.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                // `sm:flex-1` y no `flex-1`: en mobile el contenedor es
                // `flex-col`, y ahí `flex-1` fija la base sobre el eje
                // vertical, pisando el `h-11` y aplastando el botón a ~22px.
                className="inline-flex h-11 items-center justify-center gap-2 rounded bg-rojo px-4 text-sm font-semibold text-white transition-colors hover:bg-rojo-700 sm:flex-1"
              >
                <IconoWhatsapp className="h-4 w-4" />
                Consultar por WhatsApp
              </a>
              <Link
                href={`/catalogo?sucursal=${sucursal.id}`}
                className="group inline-flex h-11 items-center justify-center gap-2 rounded bg-gris-100 px-4 text-sm font-semibold text-negro transition-colors hover:bg-gris-200 sm:flex-1"
              >
                Ver su stock
                <IconoFlecha className="h-4 w-4 transition-transform duration-200 ease-suave group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="min-h-[300px] flex-1 overflow-hidden rounded-md bg-gris-100">
              <iframe
                key={sucursal.id}
                src={mapa}
                title={`Mapa de la zona de la agencia Decker en ${sucursal.nombre}`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-full min-h-[300px] w-full border-0"
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gris-400">
                Ubicación de referencia
              </p>
              <a
                href={comoLlegar}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1.5 text-sm font-semibold text-negro hover:text-rojo"
              >
                Cómo llegar
                <IconoFlecha className="h-4 w-4 transition-transform duration-200 ease-suave group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
