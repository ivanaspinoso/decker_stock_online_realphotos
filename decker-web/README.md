# Decker Camiones — Sitio web

Next.js 14 (App Router) + TypeScript + Tailwind CSS. Sin backend ni base de datos:
**todos los datos son locales y están tipados**, pensados para ser reemplazados por
Airtable (o una API propia) sin tocar los componentes.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # build de producción
npm start          # servir el build
npm run typecheck  # tsc --noEmit
```

---

## Qué contenido es de Decker y qué es de muestra

Esta es la distinción más importante del proyecto.

**Contenido real, tomado del prototipo original — no modificar sin consultar:**

- Los textos de todas las secciones del home: hero, "Unidades seleccionadas",
  "Compra segura" y sus 4 pilares, "Simulá tu operación", "Entregá tu usado…",
  "Agencias Decker", el cierre y el `<title>`/meta description.
- Las **6 primeras unidades** de `lib/data/unidades.ts`, con su nombre, tipo, marca,
  sucursal, estado, potencia, financiación y descripción tal cual estaban.
- Las 5 agencias con su dirección y su número de WhatsApp.
- Tasa anual orientativa (28%) y plazos (12, 24, 36, 48 cuotas).
- El vocabulario de tipos: Camión, Semi, Batea, Utilitario, Auto/Camioneta.

**Datos de muestra, a reemplazar por el stock real:**

- Las **30 unidades restantes** de `lib/data/unidades.ts`, con sus precios, años y
  kilómetros. Usan sólo las marcas y los tipos que ya existían en el sitio original
  (Volvo, Randon, Iveco, Ford, Mercedes-Benz, Volkswagen). Las descripciones son
  descriptivas a propósito: **no afirman garantías, revisiones ni certificaciones**
  que Decker no haya confirmado.
- Las coordenadas de las agencias, para centrar el mapa.
- Las fotos: hay 6 imágenes reales, todas de camiones Volvo, reutilizadas rotando.

Las 6 unidades originales no tenían año, kilómetros ni precio cargados. Esos campos
son `number | null` y la interfaz muestra **"Consultar"**, nunca un número inventado
ni un `0`. En las tarjetas directamente se omiten los datos que faltan en vez de
repetir "Consultar" tres veces.

---

## Dónde están los datos hardcodeados

Todo vive en `lib/`. Ningún componente lee datos por su cuenta.

| Archivo | Qué contiene | Cuándo se toca |
| --- | --- | --- |
| `lib/types.ts` | Interfaces de dominio: `Unidad`, `Sucursal`, `ParametrosFinanciacion`, `FiltrosCatalogo`, `OpcionesCatalogo`. | Al cambiar la forma de los datos. |
| `lib/data/unidades.ts` | 36 unidades: 6 originales + 30 de muestra. `destacada: true` marca las que salen en la home. | Al cargar o sacar stock. |
| `lib/data/sucursales.ts` | Las 5 agencias con dirección, coordenadas y el WhatsApp de su asesor. | Al cambiar direcciones, coordenadas o asesores. |
| `lib/data/financiacion.ts` | Tasa, plazos, entrega mínima y leyenda legal. | Cuando comercial cambia condiciones. |
| `lib/api.ts` | Capa de acceso a datos. **Única puerta entre los componentes y el origen de datos.** | Al conectar la fuente real. |
| `lib/filtros.ts` | Filtrado y orden puros, sin dependencias de datos. | Al agregar un criterio de filtro. |
| `lib/financiacion.ts` | Cálculo de cuota (sistema francés). | Al cambiar el sistema de amortización. |
| `lib/whatsapp.ts` | Armado de los links `wa.me` y de cada mensaje contextual. | Al cambiar los textos de las consultas. |

### Cambios rápidos y frecuentes

- **Tasa o plazos** → `lib/data/financiacion.ts`. Un solo objeto; no hay números
  comerciales sueltos en ningún componente.
- **Teléfono de una agencia** → `lib/data/sucursales.ts`, campo `asesor.whatsapp`.
  Cambia en toda la app a la vez (tarjetas, fichas, footer, catálogo).
- **Destacar / sacar de la home una unidad** → `destacada: true | false`.
- **Colores y tipografía** → `tailwind.config.ts` (tokens) y `app/globals.css`
  (clases base: `.contenedor`, `.seccion`, `.campo`, `.dato`, `.tarjeta`).

---

## Cómo se reemplazan los datos por una fuente real

`lib/api.ts` ya expone las funciones que va a usar la integración, y **todas son
`async`** aunque hoy no lo necesiten. Ese es el punto: el día que entre Airtable se
cambia el cuerpo de estas funciones y **ningún componente se modifica**.

```ts
// Hoy
export async function getCatalogoCompleto(filtros: FiltrosCatalogo = {}) {
  const filtradas = UNIDADES.filter((u) => cumpleFiltros(u, filtros));
  return ordenarUnidades(filtradas, filtros.orden);
}

// Mañana — misma firma, mismo tipo de retorno
export async function getCatalogoCompleto(filtros: FiltrosCatalogo = {}) {
  const res = await fetch(`${process.env.API_URL}/unidades?${serializar(filtros)}`, {
    headers: { Authorization: `Bearer ${process.env.API_TOKEN}` },
    next: { revalidate: 300 },
  });
  return (await res.json()).map(mapearUnidad); // columnas → interfaz Unidad
}
```

Funciones a reimplementar: `getUnidadesDestacadas`, `getCatalogoCompleto`,
`getUnidadPorSlug`, `getUnidadesRelacionadas`, `getSlugsDeUnidades`, `getSucursales`,
`getSucursalPorId`, `getParametrosFinanciacion`, `getOpcionesCatalogo`,
`getConteoPorTipo`, `getConteoPorSucursal`.

**Puntos a tener en cuenta en esa migración:**

1. **Mapeo de columnas.** Escribir un `mapearUnidad(registro): Unidad` en `lib/api.ts`
   y no filtrar nombres de columna hacia afuera: los componentes sólo conocen la
   interfaz `Unidad`.
2. **`slug` estable.** Hoy está escrito a mano. Si la fuente no lo tiene, agregar una
   columna: las URLs de las fichas dependen de él y no deberían cambiar.
3. **Campos vacíos.** Mantener `null` para año, km y precio sin cargar. La interfaz ya
   sabe mostrar "Consultar" y omitir el dato; un `0` se vería como una unidad 0 km.
4. **Filtrado.** Hoy el catálogo recibe el stock completo y filtra en memoria (36
   unidades, instantáneo). Con volumen mayor, mover el filtrado al servidor:
   `CatalogoCliente` pasa a llamar a `getCatalogoCompleto(filtros)` con debounce y
   `lib/filtros.ts` queda como fallback.
5. **Revalidación.** `getSlugsDeUnidades` alimenta el `generateStaticParams` de la
   ficha. Con datos remotos, agregar `revalidate` o pasar la ruta a dinámica.
6. **Fotos.** Con imágenes remotas hay que declarar el host en `next.config.mjs`
   (`images.remotePatterns`).

---

## Estructura

```
app/
  layout.tsx              Header + Footer, fuentes, metadata, skip-link
  page.tsx                Home — lee los filtros del buscador por searchParams
  globals.css             Tokens base y clases compartidas
  icon.svg                Favicon
  not-found.tsx           404
  catalogo/page.tsx       Stock completo — lee filtros de la URL
  unidad/[slug]/page.tsx  Ficha ampliada — estática por unidad

components/
  layout/       Header (nav sticky + menú mobile), Footer
  home/         Hero, BuscadorRapido, TiposUnidad, CompraSegura, Agencias
  unidades/     UnidadCard, UnidadGrilla, UnidadTabla, GaleriaUnidad
  catalogo/     CatalogoCliente (estado + vista), PanelFiltros
  financiacion/ CalculadoraFinanciacion
  formularios/  FormCotizarUsado
  ui/           Boton, EstadoBadge, EncabezadoSeccion, Iconos

lib/            types, api, filtros, financiacion, whatsapp, format, data/
public/         marca/ (logo) · unidades/ (fotos)
```

---

## Sistema de diseño

Público objetivo: dueño de flota, transportista, gerente de compras. Viene a resolver.

**Superficie.** Las tarjetas se separan del fondo con elevación suave (`shadow-tarjeta`)
y no con bordes de 1px. Los bordes quedan sólo donde hace falta leer una grilla: la
tabla del catálogo y las filas de la ficha técnica. Radios de 6/10/12/16 px.

**Tipografía, tres familias con función:**

- **Oswald** — sólo títulos de sección y `h1`. Usarla también en cada tarjeta es lo que
  apelmaza la página.
- **Inter** — texto, títulos de tarjeta y botones, en caja normal.
- **IBM Plex Mono** — todo dato técnico: precios, km, años, tasas, teléfonos. La clase
  `.dato` agrega `tabular-nums` para que las columnas de la tabla queden alineadas.

Las mayúsculas con tracking se reservan para etiquetas chicas y badges.

**Color.** Negro para nav, hero y footer; blanco y `gris-50` para contenido; rojo Decker
para marca y CTA; **amarillo industrial reservado a las unidades 0 km**. Sin gradientes
decorativos ni glassmorphism.

**Movimiento.** Sólo con propósito: la foto de la tarjeta escala un 3% en hover, la
flecha de un link se corre 2px, los botones bajan 1px al presionar. Todo respeta
`prefers-reduced-motion`.

**Densidad.** El aire domina en el home; la vista lista del catálogo es lo contrario a
propósito, porque es la que se usa para comparar muchas unidades a la vez.

**Accesibilidad.** Foco visible en todo elemento interactivo, skip-link, `aria-pressed`
en los toggles, `role="status"` en los resultados del catálogo, tabla con `<caption>` y
`<th scope>`, tabs de agencias con patrón ARIA completo (flechas, Home/End, roving
tabindex).

---

## Financiación

`lib/financiacion.ts` implementa el sistema francés:

```
cuota = C · [ i · (1+i)^n ] / [ (1+i)^n − 1 ]
```

con `i = TNA / 12 / 100`. Validado contra casos de control: caso de libro
(C=100.000, TNA 12%, n=12 → 8.884,88), tasa 0 (cuota = capital / plazo), y una
simulación de amortización cuota a cuota que cierra el saldo en 0. Los valores
inválidos devuelven `null` en vez de `NaN` o `Infinity`.

La calculadora recalcula al tipear y arma un WhatsApp con el resultado. En la ficha de
una unidad con precio, arranca con ese precio y deriva al asesor de esa sucursal.

---

## WhatsApp

No hay backend: **ningún formulario guarda datos**. Todo termina en un link
`https://wa.me/<numero>?text=<mensaje>` con el mensaje armado por `encodeURIComponent`.

| Origen | Mensaje | Va a |
| --- | --- | --- |
| Tarjeta / tabla / ficha | Unidad, estado, sucursal + año, km y precio si están cargados | Asesor de la sucursal de la unidad |
| Calculadora | Monto, plazo, tasa, cuota y total simulados | Asesor de la sucursal (o general si no hay unidad) |
| Cotizar usado | Datos de contacto y de la unidad a entregar | Asesor de la sucursal elegida |
| Nav / footer / cierre | Consulta genérica | Número general |

---

## Mapas de las agencias

Se centran por `lat`/`lng` y no por texto de dirección: Google interpreta "Ruta 3 km
696" como una ruta y devuelve un mapa de direcciones a cientos de kilómetros. Las
coordenadas actuales son **aproximadas** (nivel zona, no predio) y están etiquetadas
como "Ubicación de referencia" en la interfaz, con un "Cómo llegar" que abre Maps con
la dirección completa.

Para las exactas: Google Maps → clic derecho sobre el predio → copiar coordenadas →
`coordenadas` en `lib/data/sucursales.ts`.

---

## Pendientes

- **Fotos.** 6 imágenes reales, todas Volvo, reutilizadas en las 36 unidades. Las
  unidades de otras marcas muestran una foto que no les corresponde.
- **Stock real.** Las 30 unidades de muestra y sus precios, años y kilómetros.
- **Asesores.** Está el WhatsApp real de cada agencia; el nombre del asesor es genérico
  ("Asesor Bahía Blanca").
- **Coordenadas exactas** de los cinco predios.
- **Sin backend.** Airtable, panel de administración y carga de fotos son etapa
  posterior.
