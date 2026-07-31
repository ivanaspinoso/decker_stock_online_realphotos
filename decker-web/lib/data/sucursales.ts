import type { Sucursal } from '@/lib/types';

/**
 * Las 5 agencias Decker. Direcciones y números tomados del sitio actual.
 *
 * Cada sucursal tiene su propio asesor: las consultas de una unidad derivan al
 * WhatsApp de la sucursal donde está esa unidad, no a un número general.
 * Cuando comercial defina los asesores reales, se cambian `nombre` y `whatsapp`
 * acá y todo el sitio los toma.
 *
 * `coordenadas`: APROXIMADAS, sacadas de la referencia de la dirección. Sirven
 * para centrar el mapa en la zona correcta, no para marcar el portón del
 * predio. Reemplazar por las exactas (Google Maps → clic derecho sobre el
 * predio → copiar coordenadas).
 */
export const SUCURSALES: Sucursal[] = [
  {
    id: 'bahia-blanca',
    nombre: 'Bahía Blanca',
    direccion: 'Ruta 3 km 696',
    localidad: 'Bahía Blanca',
    provincia: 'Buenos Aires',
    coordenadas: { lat: -38.6828, lng: -62.22 },
    asesor: { nombre: 'Asesor Bahía Blanca', whatsapp: '5492262414590' },
  },
  {
    id: 'quequen',
    nombre: 'Quequén',
    direccion: 'Av. Circunvalación 2815',
    localidad: 'Quequén',
    provincia: 'Buenos Aires',
    coordenadas: { lat: -38.5661, lng: -58.7003 },
    asesor: { nombre: 'Asesor Quequén', whatsapp: '5492262615392' },
  },
  {
    id: 'mar-del-plata',
    nombre: 'Mar del Plata',
    direccion: 'Ruta 88 km 1271',
    localidad: 'Mar del Plata',
    provincia: 'Buenos Aires',
    coordenadas: { lat: -38.051, lng: -57.611 },
    asesor: { nombre: 'Asesor Mar del Plata', whatsapp: '5492235927668' },
  },
  {
    id: 'allen',
    nombre: 'Allen',
    direccion: 'Ruta 22 km 1195,5',
    localidad: 'Allen',
    provincia: 'Río Negro',
    coordenadas: { lat: -38.982, lng: -67.833 },
    asesor: { nombre: 'Asesor Allen', whatsapp: '5492994534291' },
  },
  {
    id: 'comodoro-rivadavia',
    nombre: 'Comodoro Rivadavia',
    direccion: 'Hipólito Yrigoyen 5620',
    localidad: 'Comodoro Rivadavia',
    provincia: 'Chubut',
    coordenadas: { lat: -45.85, lng: -67.48 },
    asesor: { nombre: 'Asesor Comodoro', whatsapp: '5492974433415' },
  },
];

/** Número al que van las consultas que no dependen de una unidad puntual. */
export const WHATSAPP_GENERAL = '5492262414590';
