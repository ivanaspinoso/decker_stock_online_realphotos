'use client';

import { useId, useRef, useState } from 'react';
import { IconoCerrar, IconoWhatsapp } from '@/components/ui/Iconos';
import { registrarOfertaDeUsado } from '@/lib/leads';
import {
  FORMATOS_DE_FOTO,
  MAXIMO_DE_FOTOS,
  PESO_MAXIMO_DE_FOTO,
} from '@/lib/rutasur/limites';
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

  /**
   * Las fotos del usado, ya convertidas a Data URL Base64.
   *
   * Se convierten al elegirlas y no al enviar: pasar cuatro fotos a Base64
   * tarda, y hacerlo dentro del `submit` metería esa espera justo entre el clic
   * y el `window.open` —que es exactamente lo que le cuesta el popup a este
   * formulario—. Al elegirlas, en cambio, nadie está esperando nada.
   */
  const [fotos, setFotos] = useState<{ nombre: string; dataUrl: string }[]>([]);
  const [avisoDeFotos, setAvisoDeFotos] = useState('');

  /**
   * Si ya se envió. Bloquea el botón para que no salga dos veces.
   *
   * ES UNA `ref` Y NO UN `useState` a propósito: un estado se actualiza en el
   * próximo render, y entre dos clics rápidos no hay render en el medio. La
   * referencia cambia en el acto, que es lo único que llega a tiempo.
   *
   * El `useState` de al lado existe sólo para redibujar el botón; el que decide
   * es la referencia.
   */
  const yaEnviado = useRef(false);
  const [enviado, setEnviado] = useState(false);

  /**
   * Pasa las fotos elegidas a Data URL Base64, validando antes de convertir.
   *
   * El orden importa: se comprueba tipo y tamaño ANTES de leer el archivo.
   * Base64 infla un treinta y pico por ciento, así que convertir primero para
   * después descartar sería tragarse el trabajo y la memoria de una foto que no
   * iba a servir.
   *
   * Los límites son los de la API: JPEG, PNG o WebP, hasta cuatro fotos y 10 MB
   * cada una. Lo que no entra se avisa nombrando el archivo, porque "una foto
   * no se pudo cargar" no le dice a nadie cuál sacar.
   */
  const elegirFotos = async (evento: React.ChangeEvent<HTMLInputElement>) => {
    const elegidas = [...(evento.target.files ?? [])];
    // El input se limpia siempre: si no, elegir el mismo archivo dos veces
    // seguidas no dispara el evento y parece que la página se colgó.
    evento.target.value = '';
    if (elegidas.length === 0) return;

    const rechazadas: string[] = [];
    const aceptadas = elegidas.filter((archivo) => {
      if (!FORMATOS_DE_FOTO.includes(archivo.type as (typeof FORMATOS_DE_FOTO)[number])) {
        rechazadas.push(`${archivo.name} (tiene que ser JPG, PNG o WebP)`);
        return false;
      }
      if (archivo.size > PESO_MAXIMO_DE_FOTO) {
        rechazadas.push(`${archivo.name} (pesa más de 10 MB)`);
        return false;
      }
      return true;
    });

    const lugar = MAXIMO_DE_FOTOS - fotos.length;
    if (aceptadas.length > lugar) {
      rechazadas.push(`se pueden subir ${MAXIMO_DE_FOTOS} fotos como máximo`);
    }

    const nuevas = await Promise.all(
      aceptadas.slice(0, Math.max(lugar, 0)).map(
        (archivo) =>
          new Promise<{ nombre: string; dataUrl: string }>((resolver, rechazar) => {
            const lector = new FileReader();
            lector.onload = () => resolver({ nombre: archivo.name, dataUrl: String(lector.result) });
            lector.onerror = () => rechazar(new Error(archivo.name));
            lector.readAsDataURL(archivo);
          }),
      ),
    ).catch(() => []);

    if (nuevas.length > 0) setFotos((previas) => [...previas, ...nuevas]);
    setAvisoDeFotos(rechazadas.length > 0 ? `No se sumó ${rechazadas.join('; ')}.` : '');
  };

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

        // UNA SOLA VEZ. Sin esto, tres clics mandan tres consultas iguales y
        // el asesor las recibe repetidas. Pasa de verdad: la persona envía, se
        // abre WhatsApp, vuelve a la pestaña, cree que no pasó nada y toca de
        // nuevo.
        if (yaEnviado.current) return;
        yaEnviado.current = true;
        setEnviado(true);

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

        for (const foto of fotos) formulario.append('fotos', foto.dataUrl);

        registrarOfertaDeUsado(formulario);
        window.open(
          linkCotizarUsado({ ...datos, cantidadDeFotos: fotos.length }),
          '_blank',
          'noopener,noreferrer',
        );
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

      {/* LAS FOTOS VAN AL FINAL, DESPUÉS DE TODO LO OBLIGATORIO.
          
          Es lo único opcional del formulario y lo más caro de hacer —hay que
          buscarlas en el teléfono—. Pedirlas antes del nombre haría que
          bastante gente abandone ahí mismo; al final, quien ya completó todo
          suele sumarlas, y quien no, manda igual. */}
      <div>
        <p className="campo-label">Fotos del usado (opcional)</p>
        <p className="mt-1 text-xs text-gris-500">
          Hasta {MAXIMO_DE_FOTOS}, en JPG, PNG o WebP. Una foto del frente y una del
          interior alcanzan para que el asesor te cotice más rápido.
        </p>

        <label
          htmlFor={`${id}-fotos`}
          /* Un `<label>` y no un botón: el input de archivo del navegador no se
             puede maquillar, pero su label sí, y al tocarlo abre el mismo
             selector. `has-[:focus-visible]` le da el aro de foco que el input
             escondido no puede mostrar. */
          className={`mt-3 flex h-12 cursor-pointer items-center justify-center gap-2 rounded border border-dashed border-gris-300 text-sm font-medium text-negro transition-colors hover:border-gris-400 hover:bg-gris-50 has-[:focus-visible]:border-negro has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gris-200 ${
            fotos.length >= MAXIMO_DE_FOTOS ? 'pointer-events-none opacity-40' : ''
          }`}
        >
          <input
            id={`${id}-fotos`}
            type="file"
            accept={FORMATOS_DE_FOTO.join(',')}
            multiple
            className="sr-only"
            onChange={elegirFotos}
            disabled={fotos.length >= MAXIMO_DE_FOTOS}
          />
          {fotos.length >= MAXIMO_DE_FOTOS
            ? `Ya cargaste ${MAXIMO_DE_FOTOS} fotos`
            : fotos.length > 0
              ? 'Agregar otra foto'
              : 'Elegir fotos'}
        </label>

        {fotos.length > 0 && (
          /* Se listan por nombre y no como miniaturas: una miniatura de una foto
             de teléfono es un Data URL de varios megas dibujado a 64px, y con
             cuatro la página se vuelve pesada sin que nadie lo pida. El nombre
             del archivo alcanza para saber cuál es cuál y cuál sacar. */
          <ul className="mt-3 space-y-2">
            {fotos.map((foto, indice) => (
              <li
                key={`${foto.nombre}-${indice}`}
                className="flex items-center justify-between gap-3 rounded-sm bg-gris-100 py-2 pl-3 pr-2 text-sm"
              >
                <span className="truncate text-negro">{foto.nombre}</span>
                <button
                  type="button"
                  onClick={() => setFotos((previas) => previas.filter((_, i) => i !== indice))}
                  aria-label={`Sacar ${foto.nombre}`}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-gris-500 transition-colors hover:bg-white hover:text-negro"
                >
                  <IconoCerrar className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {fotos.length > 0 && (
          /* HAY QUE DECIRLE QUE LAS MANDE EN EL CHAT, Y DECIRLO ACÁ.
             
             Las fotos se guardan con la consulta, pero WhatsApp no deja
             adjuntar archivos desde un enlace: cuando se abre el chat, el
             mensaje va escrito y las fotos no. Si no avisamos, la persona ve
             que las cargó, ve que WhatsApp se abre, y da por hecho que
             viajaron. Del otro lado el asesor abre una consulta sin una sola
             imagen.
             
             Va junto a las fotos y no al pie del formulario, para que se lea
             mientras se piensa en ellas y no tres campos después. */
          <p className="mt-3 rounded-sm bg-gris-100 p-3 text-sm leading-relaxed text-gris-600">
            Quedan guardadas con tu consulta. Cuando se abra WhatsApp,{' '}
            <span className="font-medium text-negro">adjuntalas también en el chat</span>: el
            mensaje va escrito pero las fotos no se pueden mandar solas desde acá.
          </p>
        )}

        {avisoDeFotos && (
          /* `status` y no `alert`: es un aviso sobre algo que la persona acaba
             de hacer y ya está mirando, no una interrupción. */
          <p role="status" className="mt-3 text-sm text-rojo">
            {avisoDeFotos}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={enviado}
        /* Se apaga al enviar. Ver `yaEnviado`: el bloqueo de verdad lo hace la
           referencia, esto es lo que la persona ve. */
        className="centrado-optico inline-flex h-12 w-full items-center justify-center gap-2 rounded bg-rojo text-sm font-medium text-white transition-colors hover:bg-rojo-700 active:translate-y-px disabled:cursor-not-allowed disabled:bg-gris-300 disabled:text-gris-500"
      >
        <IconoWhatsapp className="h-4 w-4" />
        {enviado ? 'Consulta enviada' : 'Enviar consulta por WhatsApp'}
      </button>

      {enviado && (
        /* QUÉ HACER SI WHATSAPP NO SE ABRIÓ.
           
           El botón queda apagado para que no salgan tres consultas iguales,
           pero eso deja a alguien sin salida si el navegador bloqueó la
           pestaña. El enlace la vuelve a abrir sin disparar otro registro: la
           consulta ya quedó anotada, lo único que falta es el mensaje. */
        <p role="status" className="text-sm leading-relaxed text-gris-600">
          Tu consulta quedó registrada.{' '}
          <a
            href={linkCotizarUsado({ ...datos, cantidadDeFotos: fotos.length })}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-negro underline underline-offset-2"
          >
            Abrir WhatsApp de nuevo
          </a>{' '}
          si no se abrió solo.
        </p>
      )}

      <p className="text-xs leading-relaxed text-gris-500">
        Al enviar, tu consulta queda registrada en Decker y se abre WhatsApp con el mensaje ya
        escrito, dirigido al asesor de la sucursal que elegiste.
      </p>
    </form>
  );
}
