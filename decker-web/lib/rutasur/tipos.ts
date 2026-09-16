/**
 * La forma CRUDA de la API de Ruta Sur.
 *
 * Esto NO es una suposición: está transcripto de la respuesta real de
 * `xapi.rutasurtrucks.com.ar`, verificada sobre las 281 unidades del stock de
 * Decker. Los campos están todos, con los nombres tal cual llegan —incluidos
 * los typos del backend, como `company_whasapp`, que se escribe así de verdad y
 * corregirlo acá haría que el dato llegue vacío—.
 *
 * Nadie fuera de `lib/rutasur/` importa estos tipos. Lo que sale de la capa ya
 * es `Unidad`, `Sucursal` o un error.
 */

/**
 * Una unidad, tal como viene de `GET /vehiculos`, `GET /vehiculos/{id}`,
 * `GET /vehiculos/search` y `GET /agencias/{id}/vehiculos`. Los cuatro
 * endpoints devuelven exactamente la misma forma: la unidad ya trae adentro los
 * datos de su marca, su tipo y su concesionaria, sin necesidad de otra llamada.
 *
 * NO HAY PRECIO. Ni en el listado ni en el detalle: no existe el campo. El
 * precio vive en `/precios`, que es un endpoint protegido y contesta 403
 * "Token Inválido" sin API key. Hasta que tengamos la key, todas las unidades
 * se publican con "Consultar".
 */
export interface VehiculoApi {
  vehicle_id: number;
  vehicle_type_id: number;
  vehicle_brand_id: number;
  /** Sólo dos valores en todo el stock: `"Nuevo"` y `"Usado"`. */
  vehicle_state: string;
  vehicle_model: string;
  /** `0` significa "sin año cargado", no el año cero. 18 unidades lo tienen. */
  vehicle_year: number;
  vehicle_fuel: string;
  vehicle_brake: string;
  vehicle_traction: string;
  vehicle_direction: string;
  /** Igual a `company_id` en las 281 unidades. La sucursal donde está. */
  vehicle_city: number;
  vehicle_color: string;
  /** TEXTO, no número: llega `"1.145.960"`, `"0KM"`, `"0"` o vacío. */
  vehicle_km: string;
  vehicle_motor: string;
  vehicle_power: string;
  vehicle_description: string;
  vehicle_equipment: string;
  /** `"2025-06-05 15:14:53"`. Es la fecha de alta: con esto se eligen las destacadas. */
  vehicle_entry: string;
  /** Miniatura, en `/uploads/thumb/`. Las URLs traen ESPACIOS sin escapar. */
  vehicle_thumbnail_url: string;
  /** `"ONLINE"` en todo el stock actual. Se filtra igual, por las dudas. */
  vehicle_view: string;
  vehicle_notification: number;
  vehicle_long: string;
  /** `null` en las 281 unidades: el campo existe en la base pero nadie lo carga. */
  vehicle_destacado: number | null;
  vehicle_visits: number;
  vehicle_video: string;

  company_id: number;
  company_name: string;
  company_description: string;
  company_phone: string;
  company_address: string;
  /** Vacío en TODAS las agencias. No sirve para el mapa. */
  company_lat: string;
  company_long: string;
  company_email: string;
  company_schedule: string;
  /** Sí, `whasapp`. Así se llama el campo en el backend. */
  company_whasapp: string | null;
  company_whasapp_taller: string | null;
  company_whasapp_admin: string | null;
  company_whasapp_repuestos: string | null;

  brand_id: number;
  /** En MAYÚSCULAS: `"VOLVO"`, `"MERCEDES BENZ"`, `"RANDON"`. */
  brand_name: string;
  brand_logo: string | null;
  brand_position: number | null;

  type_id: number;
  /** En MAYÚSCULAS: `"CAMIONES"`, `"TANQUES"`, `"PICK UP, UTILITARIOS"`. */
  type_name: string;
  type_image: string;
  type_position: number;
  type_top: number | null;
  /**
   * CATEGORÍAS VS GRUPOS, resuelto empíricamente y no hace falta preguntarlo:
   * el grupo es un campo DE la categoría, no otra clasificación paralela.
   *
   * - Categoría (`type_id`): el tipo de unidad. Hay 18 en uso —CAMIONES,
   *   TANQUES, SIDER, BATEAS/TOLVAS, PICK UP…—.
   * - Grupo (`type_group`): la bolsa gruesa que las agrupa. Hay 4:
   *   `"camiones"`, `"remolques"`, `"plus"` y `"SINGRUPO"` (el literal que usa
   *   el backend para "esta categoría no está agrupada").
   *
   * Las rutas `/grupos/{group}/...` de la documentación NO EXISTEN: contestan
   * 404 en todas sus variantes. Lo que sí funciona es el query param
   * `?group=camiones` sobre `/vehiculos`.
   */
  type_group: string;
}

/** Una foto, de `GET /vehiculos/{id}/imagenes`. Están en `/uploads/croped/`. */
export interface ImagenApi {
  image_id: number;
  image_vehicle_id: number;
  /** También con espacios sin escapar. */
  image_url: string;
  /** `1` en la foto de portada. Puede no haber ninguna marcada. */
  image_primary: number;
  /** `1` si no se publica. Se filtran. */
  image_private: number;
}

/** Una concesionaria, de `GET /agencias`. */
export interface AgenciaApi {
  company_id: number;
  company_name: string;
  company_description: string;
  company_phone: string;
  company_address: string;
  company_lat: string;
  company_long: string;
  company_email: string;
  company_schedule: string;
  company_whasapp: string | null;
  company_whasapp_taller: string | null;
  company_whasapp_admin: string | null;
  company_whasapp_repuestos: string | null;
}
