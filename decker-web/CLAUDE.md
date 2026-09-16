@AGENTS.md

# La API de Ruta Sur

El catálogo sale de `https://xapi.rutasurtrucks.com.ar`. **Está conectada y
andando**: 239 unidades reales del stock de Decker.

El dominio dice "Ruta Sur" y no "Decker" porque es la plataforma que administra
varias concesionarias. Es el stock correcto: las unidades traen
`company_email: jdecker@decker.com.ar` y las agencias de Bahía Blanca, Quequén,
Allen, Comodoro y Mar del Plata. Verificado contra datos reales.

## Para trabajar

El proyecto vive en **`C:\proyectos\decker-stock-online`** — NO en OneDrive
(ver "Este proyecto NO va en OneDrive" más abajo).

1. Copiar `.env.local.example` a `.env.local`.
2. Nada más. Los endpoints del catálogo son **públicos**: no hace falta API key.

Para volver a los datos de prueba, `USE_MOCK_DATA=true`.

## Lo que hay que saber antes de tocar nada

Cinco conductas de esta API que no están en su documentación y que se midieron
contra el server real. Cada una tiene código que la esquiva; si alguien "limpia"
ese código, vuelve el problema.

### 1. Corta las conexiones si se le pide de más

Desde una sola IP, después de unos treinta pedidos seguidos **deja de contestar
todo** —incluidos los endpoints que recién anduvieron— y tarda varios minutos en
volver. No manda 429: acepta la conexión, se queda callada y corta a los 21
segundos.

Por eso el `revalidate: 300` de `lib/rutasur/config.ts` **no es una
optimización, es un requisito**. Y por eso `cargarUnidades()` está envuelta en
`cache()` de React, y por eso el catálogo se pide entero una vez en vez de
filtrar del lado del servidor, y por eso no se prerenderiza ninguna ficha.

**Lo que más pesa, y no es obvio: las fotos.** El catálogo es UNA llamada para
todo el sitio; `/vehiculos/{id}/imagenes` es una llamada POR UNIDAD, y hay 239.
Un buscador recorriendo el catálogo las dispara todas. Medido: alcanzó con
visitar **doce fichas seguidas** para que la API dejara de contestar. Por eso
las fotos se cachean **un día** y no cinco minutos
(`SEGUNDOS_DE_REVALIDACION_FOTOS`): las fotos de una unidad publicada no
cambian, y un día de demora en una foto nueva es invisible al lado del catálogo
caído una hora.

### 2. La paginación miente de dos formas distintas

Es la trampa más cara de esta API. Se comporta de tres maneras según qué le
mandes, **las tres en silencio, las tres con un 200 y una respuesta bien
formada**:

| Pedido | Devuelve | Qué pasó |
| --- | --- | --- |
| `?limit=5000` | **281** | `limit` solo se ignora |
| `?offset=0&limit=5000` | **100** | con `offset`, `limit` se aplica… y se topa en 100 |
| sin parámetros | **281** | |

O sea que el "traeme todo" más natural del mundo —un `limit` grande con su
`offset=0`— devuelve un tercio del catálogo y **nada falla**: el sitio
simplemente publica menos camiones de los que Decker tiene. Esto ya pasó en
este proyecto: el catálogo salió con 83 unidades en vez de 239 y sólo se
descubrió contando.

Por eso `traerCrudos()` en `lib/rutasur/vehiculos.ts` **pagina de verdad**, de
a 100, hasta que una página vuelve incompleta. Son tres pedidos cada cinco
minutos. No cambiar eso por un pedido sin parámetros aprovechando que hoy
devuelve 281: es la misma apuesta que ya falló, con otro número.

### 3. Un id inexistente se cuelga, no da 404

`GET /vehiculos/999999` no contesta 404: espera 21 segundos y corta la conexión.
Desde este lado llega como un timeout. `traerUnidadPorId()` devuelve `null` ante
el timeout justamente por eso — es el caso de un favorito guardado de una unidad
ya vendida.

### 4. Una búsqueda sin resultados devuelve el cuerpo vacío

No `[]`: vacío. Un `.json()` sobre eso explota. `cliente.ts` lee la respuesta
como texto y traduce el cuerpo vacío a colección vacía.

En cambio, una colección vacía de `/vehiculos` **sí** llega como `[]` con 200.
Los 404 de esta API son siempre "recurso inexistente", nunca "sin resultados".

### 5. Las URLs de las fotos traen espacios sin escapar

Los archivos se subieron con el nombre que les puso WhatsApp
(`...WhatsApp Image 2025-06-05 at 15.10.09.jpeg`). Sin codificar, `next/image`
las rechaza y la tarjeta queda sin foto. `urlDeFoto()` les pasa `encodeURI`.

## Los archivos

```
lib/api.ts                  La ÚNICA puerta entre los componentes y los datos.
                            Adentro, `cargarUnidades()` es el interruptor:
                            array local o API. Nadie más toma esa decisión.

lib/rutasur/config.ts       Variables de entorno, timeout, revalidación.
lib/rutasur/cliente.ts      El fetch. TODA llamada sale de acá. SÓLO SERVIDOR.
lib/rutasur/errores.ts      `ErrorDeApi` y `RecursoInexistente`.
lib/rutasur/tipos.ts        La forma CRUDA de la API, transcripta del server real.
lib/rutasur/mapeo.ts        snake_case de la API → tipo `Unidad`.  ← EL QUE SE TOCA
lib/rutasur/vehiculos.ts    Catálogo, búsqueda, detalle, galería.
lib/rutasur/agencias.ts     Agencias y teléfonos.
lib/rutasur/contacto.ts     Los tres POST de leads.
lib/rutasur/clave.ts        API key. Preparado, no enchufado: todavía no la tenemos.

lib/leads.ts                La mitad de cliente de contacto.ts. Dispara el POST
                            sin esperarlo, para no perder el gesto que abre WhatsApp.

app/api/unidades/route.ts   El stock, para el navegador.
app/api/contacto/*/route.ts Los leads, para el navegador.
app/error.tsx               Pantalla cuando la API falla.
app/(home)/loading.tsx      Esqueleto de la home. El grupo (home) NO es cosmético:
                            ver "Las tres reglas de renderizado".
app/catalogo/loading.tsx    Esqueleto del catálogo.
```

**El que se toca cuando cambie el backend es `lib/rutasur/mapeo.ts`.**

## Qué se publica y qué no

La API mezcla en el mismo `/vehiculos` camiones y cosas que no lo son. De las
281 que devuelve, el catálogo publica **239**:

| Afuera | Cuántas | Por qué |
| --- | --- | --- |
| NEUMÁTICOS | 16 | No es una unidad. Rompe los rangos de año y km. |
| ACCESORIOS | 11 | Cajas volcadoras sueltas. Y una pileta. |
| MOTOS, LANCHAS | 6 | Cuatriciclos y una moto de agua. |
| VIALES | 5 | Bomba de hormigón, terminadora asfáltica, elevador. |
| BUSES, MOTORHOME | 2 | Son vehículos, pero no hay tipo donde entren sin mentir. |
| INMUEBLES Y LOTES | 2 | Dos departamentos en alquiler temporario. |

La tabla que lo decide es `CATEGORIAS_PUBLICADAS` en `mapeo.ts`. Publicar buses
o viales es agregar el tipo en `lib/types.ts` y una línea ahí.

Las 18 categorías de la API se resumen en los 5 tipos del sitio. Los remolques
—tanques, sider, playos, térmicos, carretones, acoplados— caen todos en "Semi",
que es como se llaman en el rubro; las volcables van con las bateas. La
categoría fina igual se conserva en `Unidad.categoria` y se muestra en la ficha.

## Las tres cosas que la API no tiene

### No hay precio EN LO PÚBLICO

Y no es que el mapeo se lo olvide. Verificado campo por campo: `/vehiculos`,
`/vehiculos/{id}` y `/agencias/{id}/vehiculos` devuelven **los mismos 48 campos
y ninguno es un precio** —ni `vehicle_price`, ni `valor`, ni nada parecido—.

El precio vive en `GET /precios`, que es protegido:

```
GET /precios              → 403 {"message":"Token Inválido"}
GET /vendedores/vehiculos → 403
GET /seller/vehiculos     → 403
```

**Qué falta para encenderlo:** una de estas dos, de parte de Eduardo.

```
RUTASUR_API_KEY=<token ya generado>
```

o, si prefiere que la generemos nosotros:

```
RUTASUR_API_USER=<usuario>
RUTASUR_API_PASSWORD=<contraseña>
```

Las dos están vacías hoy. Con cualquiera de ellas, `lib/rutasur/precios.ts`
empieza a traer precios y no hay ningún componente que tocar: el catálogo ya
esconde solo el filtro y el orden por precio mientras nadie tenga uno, y los
vuelve a mostrar cuando aparezcan.

**Lo único que queda por confirmar** es la forma de la respuesta de `/precios`:
la documentación dice "listas de precios" y no muestra un ejemplo.
`mapearPrecios` cubre las dos formas más probables y, si no encaja, deja las
claves recibidas en el log. Con esa línea el mapeo se termina en un minuto.

### No hay precio

**No existe el campo**, ni en `/vehiculos` ni en `/vehiculos/{id}`. El precio
vive en `/precios`, que es protegido y contesta `403 "Token Inválido"`.

Todas las unidades salen con `precio: null` y la interfaz muestra "Consultar".
El catálogo **esconde solo** el filtro de precio y el orden por precio, porque
un rango de precios sobre un stock sin precios deja la lista vacía apenas se
toca. Cuando `/precios` se enchufe, `precioMin` deja de ser `null` y los
controles vuelven sin tocar ningún componente.

### No hay destacadas

`vehicle_destacado` existe en la base pero llega `null` en las 281. La home
muestra las **8 más nuevas por `vehicle_entry`**. El día que alguien cargue el
campo desde el panel, `mapearListado()` pasa a leerlo.

### No hay financiación

No existe el campo. Todas salen como "Consultar" —afirmar "Disponible" sin que
nadie lo haya dicho es prometer un crédito— y el filtro se esconde igual que el
de precio.

## Sucursales

La API tiene **11 concesionarias** y el sitio describe **5**. Las otras seis
incluyen la id 9, "Todos los Concesionarios", que es un cajón común y no un
lugar.

`Unidad.sucursalId` puede ser **`null`**, y son 22 unidades reales. No se
descartan: se publican igual, la ficha muestra "Consultar" y su consulta va al
WhatsApp general en vez de al asesor de una sucursal.

Direcciones, localidades y coordenadas siguen en `lib/data/sucursales.ts`: la
API manda `company_lat` y `company_long` **vacíos** en las once. Lo único que se
toma de la API es el número de WhatsApp.

## Categorías vs. grupos

Resuelto empíricamente, no hace falta preguntarlo: **el grupo es un campo de la
categoría**, no otra clasificación paralela.

- Categoría (`type_id`): el tipo de unidad. 18 en uso.
- Grupo (`type_group`): la bolsa que las agrupa. Cuatro: `camiones`,
  `remolques`, `plus` y `SINGRUPO` (el literal que usa el backend para "sin
  agrupar").

Las rutas `/grupos/{group}/...` de la documentación **no existen** — 404 en
todas sus variantes. Lo que sí funciona es `?group=camiones` sobre `/vehiculos`.

## Los leads: el POST se suma al WhatsApp, no lo reemplaza

Al enviar el formulario de parte de pago o tocar "Consultar por WhatsApp":

```
1. sale el POST a /api/contacto/*   (no se espera la respuesta)
2. se abre WhatsApp                 (en el mismo tick)
```

**El no-await es lo que hace que funcione.** Los navegadores sólo dejan abrir
una pestaña dentro del gesto que la pidió: si esperáramos la respuesta del POST,
entre el clic y el `window.open` pasa un viaje de red y el navegador bloquea la
pestaña como popup. El pedido va con `keepalive` para sobrevivir a la
navegación. Ver `lib/leads.ts`.

Y por eso las rutas de `/api/contacto/` **siempre contestan 200**: nadie lee esa
respuesta. Los errores van al log del servidor.

### Los campos, según la documentación oficial

Salieron de la guía de integración que mandó Eduardo (v1.1, 16/09/2026), no de
adivinar. Tres cosas que los 422 NO decían y que estaban mal de nuestro lado:

- **`/contactos/vender` es JSON, no multipart.** Las fotos van adentro del JSON
  como Data URL Base64 en `fileSource1` … `fileSource4`, no como archivos. Un
  `FormData` con `imagenes[]` no lo lee nadie.
- **`anio` es entero y `kilometros` es número.** Los `<input>` los dan como
  texto y hay que convertirlos.
- **`agencia` y `vehiculo` de `/vehiculos/contacto` son TEXTO LIBRE**: el
  *nombre* de la agencia y el *nombre* de la unidad. Mandábamos los ids. El 422
  de `validation.string` se arreglaba con un `String()` —y el resultado seguía
  siendo inútil: el asesor leía "agencia 1, vehículo 3455"—. **Pasar una
  validación no es lo mismo que mandar el dato bien.**

`modelo`, `estado` y `mensaje` no existen en `/contactos/vender`: lo que hay es
`observaciones`, un texto libre de 5.000 caracteres. Los tres se juntan ahí.

Los topes de largo por campo están en `lib/rutasur/limites.ts`, que no importa
nada y lo leen tanto el servidor como el formulario.

### Los campos, ya confirmados contra la API

Salieron de los 422 de la API real, no de la documentación. Son **en castellano**
en dos rutas y con prefijo `contact_` en la tercera:

```
POST /vehiculos/contacto   nombre, email, localidad, telefono, mensaje,
                           agencia, vehiculo
POST /contactos/vender     nombre, email, telefono, marca, anio, kilometros
POST /contactos/contacto   contact_name, contact_email, contact_city,
                           contact_phone, contact_msj, contact_desde
POST /contactos/carrito    carrito_nombre, carrito_email, carrito_direccion,
                           carrito_telefono, contact_desde, productos
```

**`agencia` y `vehiculo` viajan como texto, no como número.** Son ids y se leen
como enteros, pero la API los valida con `string`: mandarlos como número de JSON
da `422 validation.string`. Ver el `String()` en `lib/rutasur/contacto.ts`.

### Los tres endpoints contestan 500 con los datos completos

Y es un bug del backend, no nuestro. Está verificado así:

- Con el cuerpo vacío o incompleto contesta **422** y nombra los campos que
  faltan. **La validación pasa.**
- Con todos los campos completos y del tipo correcto contesta
  **`500 {"message":"Server Error"}`**, que es la traza de una excepción de
  Laravel sin atrapar, no una respuesta pensada.
- Probado con JSON, `multipart/form-data` y `x-www-form-urlencoded`; con los
  valores como texto y como número; con el cuerpo mínimo y con campos de más.
  Siempre 500.

**Y tampoco es el payload.** Con la documentación en la mano se probó el cuerpo
EXACTO de cada endpoint, copiado de los ejemplos: los tres siguen en 500. La
prueba que cierra la discusión es `POST /servicios/contacto`, que recibe **un
solo campo**:

```
{"tipo_contacto":"WhatsApp"}   →   500 Server Error
```

Un endpoint de un campo, con el valor del ejemplo de la documentación, también
falla. No hay payload que arregle esto.

**No es la API key.** `PUT /key` acepta las credenciales igual por cabecera
(`user:`, `pass:`) que por cuerpo, y las rutas de contacto están documentadas
como públicas. Lo que sí confirma la prueba de `/key` es que **este backend
devuelve 500 para errores de negocio**: con un usuario inexistente contesta
`500 {"error":"Could not save the key. User inexistent."}` en vez de un 401.
Un 500 acá no significa necesariamente "se cayó el servidor".

Hipótesis para Eduardo, por probabilidad: que el lead **se guarde** y lo que
reviente sea el aviso por mail que va después (mailer mal configurado es la
causa número uno de este patrón en Laravel). Se resuelve mirando la tabla de
contactos y `storage/logs/laravel.log`.

**Mientras tanto el visitante no pierde la consulta**: el WhatsApp se abre
igual, `AvisoDeLead` le dice que insista por ahí, y `registrarLeadPerdido()`
deja los datos completos en el log del servidor con el prefijo
`[LEAD-NO-REGISTRADO]`.

### El rate limit de los formularios es por minuto y es corto

Medido: al **cuarto** POST seguido a `/contactos/contacto` la API deja de
contestar (`http=000`). No es el mismo freno que el del catálogo. Por eso no hay
reintentos automáticos en ningún flujo de lead: reintentar es la forma más
rápida de que el envío siguiente tampoco entre. Un 429 se muestra con
`mensajeParaElUsuario` y se deja quieto.

## La API key nunca llega al navegador

`RUTASUR_API_KEY` **no lleva el prefijo `NEXT_PUBLIC_`**, y no es un descuido.
Ese prefijo hace que Next escriba el valor dentro del JavaScript que baja el
navegador: la key quedaría a la vista de cualquiera que abra las herramientas de
desarrollo, y eso no se arregla con un deploy sino pidiéndole a Eduardo que la
rote.

`lib/rutasur/cliente.ts` y `lib/rutasur/clave.ts` tienen una guarda que tira si
llegan a ejecutarse en un navegador.

Si un componente **cliente** necesita datos de la API, se los pide a una ruta de
`/api`, que ya está armada:

```
navegador → GET /api/unidades   (mismo origen, sin key)
            → Ruta Sur          (con la key, desde Node)
```

**Lo que no hay que hacer** si un componente cliente lee `undefined`:
renombrarla a `NEXT_PUBLIC_RUTASUR_API_KEY`. Eso "arregla" el síntoma
publicando la key.

## Cuando la API falla

Importa entenderlo bien, porque esta API **se bloquea entre 25 y 50 minutos por
vez** —pasó tres veces en un solo día de trabajo— y de esto depende que el sitio
siga en pie durante esas ventanas.

### 1. Next sirve la copia vieja. Solo. Y es la protección principal.

Cuando el `revalidate` vence y el nuevo pedido falla, Next **no propaga el
error**: devuelve la respuesta cacheada anterior y reintenta en segundo plano.

Está medido, no supuesto: con el backend apagado y `revalidate` bajado a 5
segundos, el catálogo siguió sirviendo las 239 unidades **cinco minutos después
de vencida la caché** —sesenta veces la ventana— mientras el log del servidor se
llenaba de `ECONNREFUSED` de los reintentos.

Consecuencia práctica: un bloqueo de una hora con el sitio ya andando **no se
nota**. Los visitantes ven el catálogo de hace un rato, que para un stock de
camiones es el mismo catálogo.

> Se intentó agregar una segunda red en memoria (`lib/rutasur/respaldo.ts`) y se
> borró: en la prueba **nunca llegó a activarse**, porque Next resolvía el caso
> antes. Código que promete una protección que ya existe es peor que no tenerlo.
> Si alguna vez hace falta de verdad, el caso que NO está cubierto es el arranque
> en frío —un deploy nuevo, con `.next/cache` vacío, justo durante un bloqueo—.

### Lo que NO hay que agregar: un limitador de ritmo en el cliente HTTP

Se probó y se sacó. Es la idea que aparece sola al leer que el backend se
bloquea por volumen —"pongamos un freno en `pedir()`, que es por donde pasan
todas las llamadas"— y está mal por una razón que sólo se ve midiendo:

**Next intercepta ese `fetch` y lo sirve de su caché sin tocar la red.** Desde
`cliente.ts` no hay forma de saber si un pedido va a salir o se va a resolver de
memoria, así que el limitador frena los dos por igual.

Medido con seis fichas en paralelo, **todas ya cacheadas**:

| | |
| --- | --- |
| Con el limitador (balde de 6, 1 cada 700 ms) | **20.986 ms** |
| Sin el limitador | **436 ms** |

Cuarenta y ocho veces más lento, para proteger un tráfico que no existía: en esa
prueba no salió ni un pedido a la red.

Lo que sí limita el tráfico real ya está puesto y funciona:

- `revalidate: 300` — el catálogo sale a la red **una vez cada cinco minutos**,
  no una por visita
- Fotos cacheadas **un día** (`SEGUNDOS_DE_REVALIDACION_FOTOS`)
- Paginación de 24 — la grilla pide 24 fotos, no 239
- Escalonado de miniaturas en la galería — una cada 250 ms
- Tandas con descanso en `precalentar-fotos`, que es lo único que le pega fuerte
  al backend a propósito

Si alguna vez hace falta limitar de verdad, el lugar es **fuera** del `fetch`
—en un script o en un middleware que sepa que está saliendo a la red—, nunca
envolviendo la llamada que Next puede resolver de caché.

### 2. Ojo con borrar `.next` a mano

Ahí vive esa caché. Si la borrás mientras la API está bloqueada, te quedás sin
catálogo y sin de dónde sacarlo hasta que el backend vuelva. Pasó durante el
desarrollo.

### 3. La pantalla de error

Sólo llega acá el arranque en frío con la API caída: sin nada cacheado, no hay
copia vieja que servir. Las funciones de `lib/api.ts` **no atrapan el error**:
lo dejan subir hasta
`app/error.tsx`, que muestra una pantalla con "Reintentar". Es deliberado.
Devolver una lista vacía ante una falla de red convertiría "no pudimos consultar
el stock" en "Decker no tiene camiones": una afirmación falsa, creíble, y que
nadie reporta nunca.

Las excepciones están acotadas y explicadas donde viven:

- `app/layout.tsx`: los datos son de la barra del comparador —accesorio— y está
  por encima de `app/error.tsx`, así que una falla tumbaría el sitio entero.
- `getGaleriaDeUnidad()`: degrada a la miniatura sola. Una ficha con una foto es
  una ficha usable.
- `getSucursales()`: degrada a los números del repo.

**Para probar la pantalla de error** sin tocar la API, forzar la falla en
`cargarUnidades()` (`lib/api.ts`):

```ts
const cargarUnidades = cache(async (): Promise<Unidad[]> => {
  throw new ErrorDeApi('red', 'prueba');   // ← temporal
  if (usaDatosMock()) return UNIDADES;
  return traerCatalogo();
});
```

Borrar la línea después.

## Las fotos y la API son EL MISMO SERVIDOR

```
admin.usados.rutasurtrucks.com.ar  (fotos)  -> 167.250.5.68
xapi.rutasurtrucks.com.ar          (API)    -> 167.250.5.68
```

Verificado por DNS. **Quemar el rate limit probando los formularios tira las
fotos del sitio abajo**, y al revés. Los dos síntomas —`http=000` en la API y
504 en `/_next/image`— son el mismo bloqueo visto desde dos lados.

Consecuencias prácticas:

- **No probar los endpoints de contacto mientras alguien está mirando el
  sitio.** El bloqueo dura 25-50 minutos y en ese rato las fotos que no estén
  ya en `.next/cache/images` salen en gris.
- Un 504 de imagen justo después de una tanda de pruebas **no es un bug de las
  tarjetas**: es el bloqueo. Antes de investigar el componente, mirar si la API
  contesta.
- El precalentado y las pruebas de formularios **no se pueden correr a la vez**.

## Las fotos: por qué dan 504 y qué lo evita

**El síntoma:** `Failed to load resource: the server responded with a status of
504 (Gateway Timeout)` y tarjetas del catálogo en gris.

**La cadena, de atrás para adelante:**

1. Las fotos viven en `admin.usados.rutasurtrucks.com.ar`, no en este repo.
2. La primera vez que se pide una, Next baja el original de ahí, lo recodifica y
   lo guarda 30 días (`minimumCacheTTL`).
3. Ese server tiene un límite **acumulado**: sirvió exactamente **100 fotos
   seguidas** a razón de una cada 500 ms —sin ninguna concurrencia— y después
   dejó de contestar más de un minuto. No es concurrencia: es volumen total.
4. Cuando no contesta, nuestro optimizador espera y devuelve **504**.
5. **El navegador no reintenta un 504 nunca.** Esa foto queda gris hasta que
   alguien recargue la página.

**Las cuatro cosas que lo evitan, todas puestas:**

| Qué | Dónde | Por qué |
| --- | --- | --- |
| Reintento con espera creciente (1,5 s y 5 s) | `components/unidades/FotoUnidad.tsx` | Convierte un 504 —foto muerta— en una foto que tarda 3 s. Es lo único que arregla el síntoma en vivo |
| 30 días de caché de lo optimizado | `next.config.mjs` → `minimumCacheTTL` | Cada foto se baja del server de Decker **una sola vez** |
| Seis anchos en vez de dieciséis | `next.config.mjs` → `deviceSizes`/`imageSizes` | Con los valores por defecto, el mismo camión se bajaba hasta doce veces |
| Precalentado post-deploy | `npm run precalentar-fotos` | Cubre el único caso que la caché no puede cubrir: la caché vacía |

### El precalentado

Después de cada deploy la caché de imágenes arranca vacía, así que el peor caso
—239 fotos sin recodificar— le toca justo al primer visitante. El script se
adelanta y las pide él, de a una, con un descanso cada 80:

```bash
npm run precalentar-fotos                          # contra localhost:3000
npm run precalentar-fotos -- https://el-sitio.com  # contra producción
```

Tarda varios minutos y está bien: corre sin nadie esperándolo. **No subir
`TANDA` ni bajar `DESCANSO`** para apurarlo — son justo los valores que hacen
que el server no se bloquee.

### La ficha: por qué las miniaturas entran de a una

El 504 que más se veía no era el del catálogo sino **el de la ficha**, con URLs
de `/uploads/croped/` y `w=256`: las miniaturas de la galería.

La cuenta: abrir una ficha pedía la foto grande **más todas las miniaturas al
mismo tiempo**. Una unidad con diez fotos son once descargas simultáneas del
original, y ese server se bloquea por volumen. Las últimas volvían 504, y como
el navegador no reintenta un 504, quedaban grises hasta recargar.

`GaleriaUnidad` ahora las **escalona**: primero la foto grande —lo único que el
visitante está mirando— y recién cuando ésa llegó, las miniaturas de a una cada
250 ms.

Medido en una ficha real de 6 fotos, con el host vivo: los pedidos salen a los
60, 165 ms (logo, foto grande, relacionadas) y después **881, 1132, 1396, 1647,
1913** — uno cada 250 ms, ninguno superpuesto. Cero fotos rotas. Antes, las 6
miniaturas salían juntas en los primeros 200 ms.

Dos detalles que parecen de más y no lo son:

- **El marco de la miniatura existe desde el principio**, con su esqueleto. Si
  se montara junto con la imagen, la tira crecería de a saltos.
- **Hay un tope de 2 segundos.** Esperar a la foto grande está bien mientras
  llegue; si NO llega —el server bloqueado, que es el escenario para el que esto
  existe— `onTermino` recién avisa tras agotar los reintentos, 6,5 segundos.
  Medido: la primera miniatura tardaba 8,7 s. Con el tope, la galería empieza a
  llenarse sola a los 2 s.

### Una foto, UN tamaño: la regla del `sizes`

Cada combinación de ancho distinta hace que Next **baje el original otra vez**
del server de Decker. Dos componentes que muestran la misma foto con `sizes`
distintos la descargan dos veces.

Pasaba con la vista lista: tenía `sizes="64px"` propio, así que tocar "Lista"
disparaba **24 descargas nuevas** de fotos que la grilla ya tenía optimizadas.
Ahora comparte el `sizes` de la tarjeta y reusa la misma variante: medido, **0
pedidos nuevos** al cambiar de vista.

Se paga con unos kilobytes de más por fila —640px para mostrar 64— y se compra
no tocar el server. Al lado de un 504, no es nada.

**Antes de agregar un `sizes` nuevo**, mirar si alguno existente sirve. Hoy hay
tres contra el host de Decker: la tarjeta (`33vw`, la que se precalienta), la
foto grande de la ficha (`60vw`) y sus miniaturas (`180px`).

### Precalentar también las galerías

`GALERIAS=1 npm run precalentar-fotos` hace lo mismo con las fotos de cada
ficha, no sólo con la miniatura del listado. Son ~1500 imágenes en vez de 243 y
tarda unos 45 minutos, pero deja la ficha sin un solo 504 en su primera visita.

Para un deploy tranquilo vale la pena. Para uno apurado alcanza con el
precalentado normal: el escalonado ya evita que el visitante vea fotos rotas.

### Deployar en Vercel NO lo arregla

Es la pregunta obvia y la respuesta es no: el cuello de botella es el server de
Decker, y desde Vercel sigue siendo el mismo server con el mismo límite. En un
aspecto es peor — Vercel tiene varias regiones con cachés separadas, así que la
primera carga de cada foto se repite por región.

**La única forma de que las fotos anden SIEMPRE es que no dependan de ese
server**: bajarlas una vez y servirlas desde el mismo lugar que el sitio (Vercel
Blob, S3, Cloudinary). Son ~240 imágenes, una sola descarga por foto, y el 504
desaparece como categoría de problema. Es una decisión de infraestructura
pendiente, no algo que se arregle con código de este lado.

Con lo que hay hoy las fotos cargan bien **casi siempre**: los reintentos y la
caché tapan el hueco, pero una foto que nadie pidió nunca, justo durante un
bloqueo, queda gris hasta la próxima visita.

### Hubo un carrusel en las tarjetas y se sacó por esto

`FotosDeTarjeta.tsx` dejaba pasar las fotos con las flechas o el dedo sin entrar
a la ficha. La mecánica andaba —pedía las fotos recién al detectar interés y
precargaba la siguiente—. Lo que no andaba era el resultado.

Las fotos de galería viven en **`/uploads/croped/`**, una ruta que el
precalentado no cubre. La primera vez que alguien pasaba de foto, el optimizador
de Next tenía que bajarla del server de Decker en ese momento, y ese server
contesta 504 apenas se le pide de más. El visitante tocaba la flecha y veía un
rectángulo gris.

**Un carrusel que a veces no muestra la foto es peor que no tener carrusel**: la
tarjeta parece rota en vez de simple. Se puede volver a poner el día que las
fotos no dependan de ese server —cuando el precalentado cubra `croped/` de
punta a punta, o cuando las fotos estén en un CDN—.

### Si igual ves fotos grises

1. Probá una foto directo: `curl -I "https://admin.usados.rutasurtrucks.com.ar/uploads/thumb/<archivo>"`.
   Si da `000` o cuelga 21 segundos, el server está bloqueado y **no es el
   código**: se recupera solo en unos minutos.
2. Recargar la página basta: las que ya se cachearon salen de disco.
3. Si pasa siempre y en todas, revisá que `remotePatterns` en `next.config.mjs`
   siga cubriendo el host — sin eso `next/image` las rechaza a todas.

## Las tres reglas de renderizado que no hay que romper

Se llegó a esto probando, y cada una tapa un agujero que no avisa cuando vuelve.

### La ficha NO lleva `loading.tsx`, y el de la home vive en `app/(home)/`

Un `loading.tsx` abre un límite de Suspense: el envase de la página sale por la
red antes de terminar de renderizar y el código de respuesta queda mandado. En
la ficha eso convierte el `notFound()` de una unidad vendida en un **200 OK**
con la pantalla de "no encontramos esta unidad" — un soft 404, que es lo que
hace que Google no saque del índice las URLs de camiones que ya no existen.

Y un `loading.tsx` en la raíz de `app/` cubre por herencia **todas** las rutas
que no tengan el suyo, la ficha incluida. Por eso el esqueleto de la home está
en `app/(home)/loading.tsx`: `(home)` es un grupo de rutas, no cambia la URL
—la home sigue siendo `/`— pero acota el esqueleto a la home.

Si alguien agrega un `loading.tsx` en `app/` o en `app/unidad/[slug]/`, el soft
404 vuelve y nada falla ni avisa.

### `notFound()` va también en `generateMetadata`

Es lo único que corre antes de que se mande el primer byte. Ver el comentario en
`app/unidad/[slug]/page.tsx`.

### Ninguna ficha se prerenderiza contra la API

Prerenderizar es correr la página entera durante el build, pedidos incluidos.
Con una API que se bloquea, cada ficha prerenderizada es una chance más de que
el build muera y el deploy no salga. Ya pasó dos veces. El sitemap las lleva a
las 239 igual, así que a Google no le falta ninguna.

Medido: una ficha nunca visitada tarda entre 0,28 y 0,43 segundos.

## El stock se actualiza solo

Medido, no supuesto. Se borró un camión del backend y se cronometró:

| Qué | Cuánto tarda |
| --- | --- |
| La ficha del camión borrado pasa a 404 | **Inmediato** |
| Desaparece del catálogo y de los contadores | ≤ 5 min (una ventana de `revalidate`) |
| Sale del `sitemap.xml` | ≤ 5 min |
| Entra un camión nuevo y aparece en todo | ≤ 5 min |

Nadie tiene que tocar nada ni redeployar. El único número que gobierna esto es
`SEGUNDOS_DE_REVALIDACION` en `lib/rutasur/config.ts`, y no conviene bajarlo:
cinco minutos ya es más rápido de lo que se vende un camión, y menos que eso
empieza a acercarse al límite de la API.

**El 404 inmediato costó una decisión y vale entenderla.** La ficha se resuelve
buscando en el catálogo cacheado y **nada más**. La versión anterior, si no
encontraba la unidad ahí, pedía `GET /vehiculos/{id}` por si fuera una unidad
recién cargada — y en esta API un id inexistente **se cuelga 21 segundos** en vez
de contestar 404. O sea que el caso más común de todos (alguien abre el link de
un camión vendido desde Google, un favorito o un WhatsApp reenviado) se comía 21
segundos de pantalla en blanco. Ver `traerUnidadPorSlug` en
`lib/rutasur/vehiculos.ts`.

## El catálogo pagina de 24 en 24

`components/catalogo/Paginacion.tsx`, y `POR_PAGINA` en `CatalogoCliente.tsx`.

Antes dibujaba las 239 unidades de una: scroll interminable y —peor— 239 fotos
pedidas al mismo tiempo al server de Decker, que corta las conexiones cuando se
le piden muchas juntas, así que la mitad de las tarjetas quedaba gris.

Detalles que ya están resueltos y se rompen fácil si se toca:

- **24 es múltiplo de 2, 3 y 4**: la última fila queda completa en las tres
  anchuras de la grilla, sin un hueco al final.
- **Al cambiar un filtro vuelve a la página 1.** Sin eso, alguien parado en la
  página 8 que filtra por "Batea" —23 unidades, una sola página— se queda
  mirando una lista vacía. Es el bug clásico de toda paginación filtrable.
- **Cambiar de página sube al encabezado del listado**, no al tope de la página:
  los filtros y el conteo quedan a la vista. Los controles están al final de la
  lista, así que sin eso el clic deja al visitante mirando el final de la página
  nueva.
- **Con una sola página no se dibuja nada.** Un paginador sobre 23 unidades es
  ruido: ocupa lugar y sugiere que hay más.
- El filtrado sigue siendo **sobre las 239 en memoria**, no sobre la página: los
  contadores y los filtros hablan del stock entero.

## Este proyecto NO va en OneDrive

**Ubicación correcta: `C:\proyectos\decker-stock-online`.**

Vivía en `OneDrive\Documentos` y se movió, porque OneDrive sincronizaba
`node_modules` (355 MB) y `.next` (65 MB) y eso producía **dos fallas que
parecen bugs del código y no lo son**:

1. **El build falla con un módulo que sí existe.**
   `Failed to load external module next/dist/compiled/next-server/app-page-turbo.runtime.prod.js`
   OneDrive deshidrata archivos de `node_modules` para liberar espacio —se
   encontraron **9281 convertidos en placeholders**— y Node no puede cargar uno
   deshidratado. Falla con un archivo distinto cada vez, así que parece azar.

2. **El build "pasa" pero sirve código viejo.** Se encontraron **71 archivos de
   conflicto** (`*-Ivana*`) en `.next`. Una paginación recién escrita no
   aparecía en el sitio y el build no daba ningún error.

Las dos desaparecen con el proyecto afuera: `node_modules` y `.next` se
regeneran solos, no hay nada que sincronizar, y el código sigue respaldado en
git. Si alguna vez hay que volver a mover el proyecto, **que no sea a una
carpeta sincronizada**.

### Lo que NO funciona — probado, no supuesto

No perder tiempo repitiendo estos intentos. Se probaron todos antes de mover:

| Intento | Qué pasa |
| --- | --- |
| **Junction en `.next`** (`mklink /J`) | **Rompe el build.** Turbopack no lo tolera: `Failed to load external module` |
| **Junction en `node_modules`** | `npm ci` **borra el junction** y recrea la carpeta real |
| **`distDir` fuera del proyecto** | No soportado. La doc de Next: *"distDir should not leave your project directory"* |
| **`attrib +U`** (solo en la nube) | Es lo contrario de lo que hace falta: **garantiza** la falla (1) |
| **`attrib +P`** (siempre local) | Evita la falla (1) pero NO los conflictos de la (2): OneDrive sigue sincronizando |

### Si un cambio no aparece en el sitio

Ya no debería pasar, pero el reflejo correcto sigue siendo:

```bash
rm -rf .next && npm run build
```

## Lo que sigue saliendo de `lib/data/`

| Qué | Dónde | Por qué |
| --- | --- | --- |
| Favoritos, comparador, vistos recientemente | `localStorage` | Son del navegador de cada uno. No hay cuentas. |
| Parámetros de financiación (dólar, margen, tasas, plazos) | `lib/data/financiacion.ts` | El dólar oficial se actualiza **a mano**: no hay API de cotización. |
| Direcciones y coordenadas de las agencias | `lib/data/sucursales.ts` | La API manda lat/long vacíos. |

## Pendiente

- **`/precios`.** Hace falta la API key. Es lo único que separa al catálogo de
  tener precios.
- **Panel de carga/edición.** En veremos, esperando a Eduardo. Los endpoints de
  escritura no están documentados.
- **Los nombres de campo de los tres POST de contacto.** Se confirman con el
  primer 422 real.
