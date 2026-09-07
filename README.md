# Cefas Panadería — sitio web

Sitio estático para GitHub Pages, optimizado para búsquedas de pan en Guatemala y con
pedidos por encargo vía WhatsApp.

- **Sin dependencias**: HTML, CSS y JavaScript puros. No hay build de npm ni framework.
  Lo único que usa npm es la herramienta opcional que optimiza las fotos (ver más abajo);
  el sitio y `generar.js` no la necesitan.
- **Contenido en HTML estático**: los productos se sirven en el HTML, no por JavaScript.
  Esto es clave para que Google los indexe de forma fiable.
- **Datos estructurados**: `Bakery`, `Menu`, `FAQPage`, `Service`, `BreadcrumbList`, `WebSite`.
- **Cotizaciones**: la lista se arma en el navegador y se envía como mensaje de WhatsApp.

---

## En este sitio no hay precios de producto

**Todo se cotiza.** No es sólo que no se pinten: el precio de un producto no existe en el
proyecto. Los productos de `datos/productos.json` **no llevan campo `precio`**, y
`negocio.json` no lleva `moneda` ni `simboloMoneda`.

La única cifra publicada es `rangoPrecios` de `negocio.json` (`"Q100 - Q300"`), que sale como
`priceRange` en el JSON-LD del negocio: es la horquilla de una cotización típica, no el precio
de nada en concreto, y Search Console la pide para completar la ficha del negocio.

Antes los precios de cada producto seguían viajando en el HTML aunque no se vieran —en
`data-precio` de cada tarjeta y en `priceCurrency` del JSON-LD—, donde los lee Google y los ve
cualquiera abriendo el inspector. `verificar.js` **falla** si reaparece cualquiera de estas
cosas:

- `data-precio` o `data-moneda` en el HTML,
- `price` o `priceCurrency` en el JSON-LD,
- un importe en quetzales (`Q` seguido de dígito) en el texto —el `priceRange` del negocio se
  descuenta antes de mirar—,
- las clases de precio que había en el CSS (`producto__precio`, `panel__total`…),
- un campo `precio` en `datos/productos.json`.

En consecuencia, **todas** las tarjetas llevan «Agregar a mi cotización»: sin precios no hay
nada que distinga un producto «comprable» de uno «cotizable». El panel lateral es una lista
de cotización, no un carrito de compra.

---

## Dos canales: este sitio vende eventos, PedidosYa vende menudeo

**Este sitio es para pedidos de eventos y actividades**: docenas, paquetes, bandejas, cajas
de desayuno, coffee breaks, pasteles y mayoreo. **La venta por unidad va por PedidosYa.**

Eso está implementado, no es solo redacción:

- Un producto con `"minorista": true` en `datos/productos.json` **no se publica**: no sale en
  el menú, ni en los destacados, ni en el `<select>` del formulario, ni en el JSON-LD `Menu`.
- Una categoría que se queda sin productos de eventos **no se publica vacía**. El generador
  avisa en consola cuáles quedaron fuera.
- Inicio, menú y contacto llevan un bloque que manda a PedidosYa a quien busca pan por pieza,
  para que no llegue por WhatsApp un pedido de Q1.25.

Para mover un producto de un canal al otro: agregá o quitá `"minorista": true` y regenerá.

## Cobertura: solo lo que está en la lista

`datos/negocio.json` → `cobertura` es la única fuente. Está agrupada por municipio porque el
nombre del municipio se usa tal cual en el `areaServed` de los datos estructurados:

```json
"cobertura": [
  { "municipio": "Ciudad de Guatemala", "zonas": ["Zona 1", "Zona 2", "…"] },
  { "municipio": "Mixco", "zonas": ["Zona 8 (San Cristóbal)", "Zona 11"] }
]
```

Todo lo que se agregue ahí se publica como promesa de entrega en el inicio, el menú, contacto
y las preguntas frecuentes. **No agregues una zona a la que no se llega.** Para direcciones
fuera de la lista, la alternativa que ofrece el sitio es recoger en la panadería.

> La respuesta de las preguntas frecuentes **ya no enumera las zonas a mano**: escribí
> `{zonas}` en el texto de `datos/productos.json` → `faq` y `generar.js` lo rellena desde
> `cobertura` («zonas 1, 2 y 4 de Ciudad de Guatemala, y en zonas 8 (San Cristóbal) y 11 de
> Mixco»), tanto en el texto visible como en el JSON-LD. Antes estaba copiada a mano y se
> desincronizaba al cambiar la cobertura; `verificar.js` avisa si alguien la vuelve a
> escribir a pelo.

## El sitio está armado para vender

El orden del inicio es un embudo, no un folleto: primero para qué sirve y el botón de cotizar,
la historia del negocio al final.

1. Hero con la ocasión (eventos, oficinas, actividades) y dos botones de cotización.
2. Barra de datos de compra (mínimo, 1 clic, anticipación, zonas).
3. **Para qué ocasión**: las seis situaciones que se venden.
4. **Lo más pedido**, con `Agregar a mi cotización` a la vista.
5. **Docenas, paquetes y bandejas**, ordenadas de la presentación más chica a la más grande.
6. Desvío a PedidosYa → 7. Cómo cotizar → 8. Cobertura → 9. Preguntas.
10. Quiénes horneamos (corto) → 11. Cierre con los dos botones.

Piezas de conversión que conviene no quitar:

- **Contador en cada tarjeta**: al agregar, el botón se convierte en `− 2 +`. Lo crea
  `app.js` al vuelo (son 50 tarjetas: mandarlo en el HTML sumaba ~20 KB por página).
- **Total en el botón de la cabecera** y **barra fija de pedido en móvil** con el total y
  "Ver mi pedido".
- **Sección de paquetes**: entra ahí todo producto cuya `unidad` declara varias piezas
  (`docena` = 12, `paquete de 6` = 6, `bandeja 50 piezas` = 50), ordenado por número de
  piezas. Si `unidad` no dice piezas, el producto no aparece en esa sección.

> No hay reseñas, estrellas ni "clientes satisfechos" en el sitio. Poner testimonios
> inventados es lo que más rápido quema la confianza (y Google penaliza el marcado de
> reseñas falsas). Cuando tengas reseñas reales de Google, se enlazan y listo.

---

## ⚠️ Antes de publicar

El sitio está completo y funcional. Queda **un pendiente de contenido**:

| Qué | Dónde | Estado |
|---|---|---|
| Teléfono y WhatsApp | `datos/negocio.json` → `telefono`, `telefonoE164`, `whatsapp` | ✅ `+502 4637-9417` |
| Dirección pública | `datos/negocio.json` → `direccion` | ✅ zona 6, sin calle exacta (ver abajo) |
| Zonas de entrega | `datos/negocio.json` → `cobertura` | ✅ 11 zonas de la capital + San Cristóbal y Mixco z11 |
| Nombres y descripciones | `datos/productos.json` | ⚠️ **de ejemplo**, hay que reemplazarlos |
| Fotos de los productos | `assets/img/` | ⚠️ todas usan la misma foto de relleno |

El formulario de encargos pide la **zona en una lista cerrada** generada desde `cobertura`, con
una opción «Otra zona: paso a recoger»: así no llega por WhatsApp un pedido a domicilio a una
zona a la que no se llega. El campo sólo aparece —y sólo es obligatorio— si el cliente elige
entrega a domicilio.

### Dirección: sólo la zona 6, y a propósito

El negocio es una cocina de producción (*dark kitchen*), no un local de mostrador, así que
**no se publica dirección exacta ni mapa**. `redes.googleMaps` queda vacío y `verificar.js`
no lo reclama. La página de contacto no dice «cómo llegar»: explica que el punto y la hora de
recogida se coordinan por WhatsApp al confirmar la cotización.

`direccion.ciudad` sí tiene que estar puesto —hoy es `Ciudad de Guatemala`—, porque de ahí
sale `addressLocality` en los datos estructurados de las 5 páginas. Estuvo vacío y el JSON-LD
publicaba `"addressLocality": ""`, que para SEO local es peor que no poner el campo;
`verificar.js` ahora falla si se vuelve a vaciar.

### Categorías que no se publican

Una categoría sin productos de eventos no se publica vacía, y el generador lo avisa en
consola. Hoy queda fuera **Panes Artesanales**: baguette, ciabatta, masa madre y pan de
centeno se venden por pieza, así que van por PedidosYa.

«Café y Bebidas» **se eliminó del catálogo**: no hay café suelto que vender. El café va
incluido en los combos (caja de desayuno, coffee break), no como producto aparte.

> El menú de PedidosYa está protegido con PerimeterX y no se pudo leer de forma automática.
> El catálogo actual es un menú de panadería guatemalteca plausible, pensado para que
> reemplaces nombres y descripciones por los reales.

`node herramientas/verificar.js` te avisa mientras el catálogo siga marcado como ejemplo.

---

## Uso diario

```bash
node herramientas/generar.js    # regenera el sitio desde los JSON
node herramientas/verificar.js  # valida SEO, enlaces, JSON-LD y accesibilidad
```

**Nunca edites los `.html` de la raíz a mano**: se sobrescriben. Editá `plantillas/` y `datos/`.

Eso ya no es sólo una recomendación: `.github/workflows/verificar.yml` regenera el sitio en
cada push y **falla si el HTML del repositorio no coincide** con el que produce `generar.js`.
Si te olvidás de regenerar tras cambiar `datos/` o `plantillas/`, el CI te lo dice y te
muestra el diff. (`sitemap.xml` queda fuera de esa comparación: su `<lastmod>` es la fecha de
hoy y cambia solo cada día.)

### Optimizar las fotos — hacelo siempre que agregues una

Una foto de cámara o de IA pesa 2 o 3 MB, y la tarjeta la muestra a 370 px de ancho: sin
optimizar, el menú llegó a pesar **38 MB**, imposible de abrir en datos móviles. Después de
copiar fotos nuevas a `assets/img/`:

```bash
npm install                                        # una sola vez, instala sharp
node herramientas/optimizar-imagenes.js            # informe, no toca nada
node herramientas/optimizar-imagenes.js --aplicar  # convierte de verdad
node herramientas/generar.js                       # regenera con las medidas nuevas
```

Deja las fotos en JPEG de 800 px (suficiente incluso en pantallas retina), borra el original
y actualiza solo las referencias en `datos/`. El original siempre se puede recuperar con git.
El `logo-cefas.png` se queda en PNG porque el pie lo pinta con `filter: invert(1)` y necesita
transparencia. La primera pasada dejó las 17 fotos en **38.45 MB → 1.70 MB**.

Los `width`/`height` de cada `<img>` los lee `generar.js` de la cabecera del archivo, así que
no hay que tocarlos a mano cuando cambian las fotos.

#### Además genera las variantes responsivas

Las tarjetas se pintan a unos 300 px de ancho, así que servir el JPEG de 800 a todo el mundo
era mandar el triple de pixeles de los que se ven. Por cada `foo.jpg` el optimizador deja:

| Archivo | Para qué |
|---|---|
| `foo-400.jpg` | pantallas chicas |
| `foo.webp` | mismo tamaño, ~30 % menos peso |
| `foo-400.webp` | las dos cosas |

`generar.js` las monta en un `<picture>` con `srcset` y `sizes`, y **referencia sólo las que
existen en disco**: si no pasaste el optimizador, el sitio sigue funcionando con el JPEG de
800. Un WebP que pesa más que su JPEG se descarta (pasa en fotos con mucho grano: la genérica
es un caso), porque si no el navegador lo preferiría y el visitante bajaría más datos.

#### Y las variantes del logo

`logo-cefas-192.png` para cabecera, pie y favicon (el de 512 pesa 50 KB y se pinta a 44 px), y
`logo-cefas-maskable.png` para el icono de la pantalla de inicio en Android, que recorta el
20 % exterior en círculo: el logo va al 80 % sobre fondo crema opaco. `generar.js` usa las
variantes si existen y el original si no.

#### Y la imagen para compartir

`og-cefas.jpg`, 1200×630, recortada de la primera foto que exista de `OG_FUENTES`. Es la
medida que esperan WhatsApp, Facebook y X: antes se compartía el logo cuadrado con
transparencia y salía recortado sobre fondo negro, justo en el enlace que más se pega por
WhatsApp. Cuando tengas una foto real de un evento, ponela primero en esa lista.

### Cambiar el menú

1. Editá `datos/productos.json`.
2. `node herramientas/generar.js`.
3. Commit y push. Se actualizan el menú, los destacados, el buscador, los filtros,
   el `<select>` del formulario, el pie y el JSON-LD `Menu`.

Campos de un producto:

```json
{
  "id": "pan-frances-unidad",   // único, sin espacios ni tildes
  "nombre": "Pan Francés",
  "descripcion": "Frase con las palabras que la gente busca.",
  "unidad": "unidad",           // si dice piezas ("docena", "paquete de 6",
                                // "bandeja 50 piezas") entra en la sección
                                // de paquetes del inicio, ordenada por piezas
  "destacado": true,            // aparece en "Lo más pedido" del inicio
  "encargo": true,              // muestra la etiqueta "Por encargo"
  "minorista": true,            // NO se publica: se vende por pieza en PedidosYa
  "imagen": "pan-frances.jpg"   // opcional: archivo dentro de assets/img/
}
```

**No hay campo `precio`** y no debe volver: ver «En este sitio no hay precios».

Cada categoría tiene además `icono` (una clave del set de iconos, ver abajo) y también
acepta `imagen`.

### Fotos de los productos

Hoy **todas las tarjetas usan la misma foto de relleno**: `assets/img/pan-img-generico.jpg`.
Para poner las fotos reales:

1. Guardá la imagen en `assets/img/` (cuadrada o 4:3, ~800 px de lado es suficiente).
2. Agregá `"imagen": "nombre-del-archivo.jpg"` al producto o a la categoría.
3. `node herramientas/generar.js`.

Lo que no tenga `imagen` sigue usando la genérica, así que se pueden ir cambiando de a poco.
El `alt` de las tarjetas se arma solo con el nombre del producto.

> **Los `alt` de las plantillas hay que revisarlos cuando entren las fotos reales.** Describían
> cosas que la foto de relleno no muestra («fachada de la panadería», «panaderos amasando»,
> «bandeja de bocadillos»), lo que engaña a quien usa lector de pantalla y a Google. Ahora
> describen lo que de verdad se ve: pan. Están en `plantillas/*.html`, en las directivas
> `{{foto:archivo|contexto|texto alternativo}}`.

### Iconos

No hay emojis en la interfaz: son SVG definidos en `herramientas/iconos.js`. El generador
inyecta un único sprite `<symbol>` por página y cada uso es un `<use href="#i-nombre">`, así
que heredan color y tamaño del CSS.

- En una plantilla: `{{ico:reloj}}` o con clase de tamaño `{{ico:pastel:ico--l}}`
  (tamaños disponibles: normal, `ico--l`, `ico--xl`).
- En `datos/productos.json`: el campo `icono` de cada categoría es una de esas claves
  (`baguette`, `pan`, `trigo`, `croissant`, `pastel`, `caja`, `cafe`…).
- Para agregar uno nuevo: sumá una entrada a `ICONOS` en `herramientas/iconos.js` con el
  interior del SVG dibujado sobre un lienzo de 24×24. Si una plantilla pide un icono que no
  existe, el generador falla con el nombre en el mensaje.

### Cambiar datos del negocio

Todo está en `datos/negocio.json`: teléfono, dirección, horarios, redes, zonas de cobertura,
dominio. Al regenerar se propaga a las 5 páginas, al pie, al `sitemap.xml`, al `manifest`
y a los datos estructurados.

---

## Estructura

```
datos/          negocio.json, productos.json, servicios.json   ← la única fuente de verdad
plantillas/     contenido de cada página con {{VARIABLES}}, {{ico:…}} y {{foto:…}}
herramientas/   generar.js, verificar.js, iconos.js, optimizar-imagenes.js
assets/css/     estilos.css  (incluye las @font-face de las tipografías propias)
assets/js/      app.js
assets/fonts/   fraunces-*.woff2, inter-*.woff2   ← autohospedadas
assets/img/     logo-cefas.png, og-cefas.jpg, fotos + variantes -400 y .webp
.github/workflows/verificar.yml   ← regenera y compara en cada push
index.html  menu/  encargos/  contacto/  404.html   ← GENERADOS
coffee-break/  cajas-de-desayuno/  bandejas-de-bocadillos/  pan-al-mayoreo/  cuanto-pan/   ← GENERADOS
sitemap.xml  robots.txt  manifest.webmanifest  .nojekyll
```

### Directivas de plantilla

| Directiva | Qué produce |
|---|---|
| `{{VARIABLE}}` | un dato de `negocio.json` o un bloque generado |
| `{{ico:reloj}}`, `{{ico:pastel:ico--l}}` | un `<use>` del sprite SVG |
| `{{foto:foo.jpg\|tarjeta\|Texto alternativo}}` | un `<picture>` con WebP y `srcset` |

Los contextos de `{{foto:…}}` son `hero`, `tarjeta` y `ancha`, y cada uno fija el `sizes` que
corresponde a ese hueco. Añadí `|alta` al final para la foto que es el LCP de la página
(sale con `fetchpriority="high"` en vez de `loading="lazy"`).

---

## Publicar en GitHub Pages

1. Creá el repositorio y subí todo:

   ```bash
   git init && git add . && git commit -m "Sitio de Cefas Panadería"
   git branch -M main
   git remote add origin https://github.com/cefaspan/web.git
   git push -u origin main
   ```

2. En GitHub → **Settings → Pages** → *Source: Deploy from a branch* → `main` / `/ (root)`.
3. Queda en `https://cefaspan.github.io/web/`.

> **El dominio de `negocio.json` tiene que ser el publicado.** Estuvo apuntando a
> `willianhuit.github.io/cefas-web` mientras el sitio vivía en `cefaspan.github.io/web`: canonical,
> sitemap, `og:url` y JSON-LD le decían a Google que la versión oficial estaba en otro lado.

Si cambiás el nombre del repositorio o ponés dominio propio, actualizá `dominio` en
`datos/negocio.json` y regenerá: de ahí salen los `canonical`, el `sitemap` y el JSON-LD.

### Dominio propio (muy recomendado)

Un dominio como `cefaspanaderia.gt` o `.com` vale más que un subdominio de github.io para
posicionar la marca. Después de comprarlo:

1. `datos/negocio.json` → `"dominio": "https://cefaspanaderia.com"`, `"rutaBase": "/"`.
2. `node herramientas/generar.js`.
3. Creá un archivo `CNAME` en la raíz con una sola línea: `cefaspanaderia.com`.
4. En tu proveedor de DNS, apuntá los registros A a las IPs de GitHub Pages y activá
   *Enforce HTTPS* en Settings → Pages.

---

## Posicionamiento: qué hace el sitio y qué falta

### Lo que ya trae el sitio

- Títulos y descripciones únicos por página, orientados a las búsquedas reales
  (*panadería en Guatemala*, *pan francés*, *pan dulce guatemalteco*, *pasteles por encargo*).
- `Bakery` con localidad, coordenadas, horarios, formas de pago y las zonas que atienden.
- Sitemap con la extensión de imágenes de Google (las fotos de cada página) y un `lastmod`
  que sale del último commit que tocó el contenido, no de la fecha de generación.
- `Menu` completo, sin precios: acá todo se cotiza.
- `FAQPage` con 11 preguntas que la gente busca tal cual («¿cuántos bocadillos por persona?»,
  «¿emiten factura?»), y la lista de zonas derivada de `cobertura` (no copiada a mano).
- **Una página por servicio** (`datos/servicios.json`): coffee break, cajas de desayuno, bandejas
  de bocadillos y pan al mayoreo. Cada una con el H1 que la gente busca, qué incluye, para quién,
  anticipación, productos del menú, FAQ propia y JSON-LD `Service` + `FAQPage`. Antes esas
  búsquedas sólo tenían la portada genérica.
- **Calculadora «¿Cuánto pan necesito?»** (`/cuanto-pan/`): personas + tipo de actividad →
  bandejas, docenas o cajas sugeridas, con un botón que lo pasa a la cotización. Las reglas
  (piezas por persona) están en `servicios.json` → `calculadora`; las piezas por unidad salen del
  campo `unidad` del producto. Sin JavaScript queda la lista de reglas, que es lo que indexa.
- Los H2 del inicio y el título del menú llevan la intención de búsqueda («Pan para eventos,
  oficinas y actividades en Guatemala», «Menú para eventos y coffee breaks»).
- Sitemap, robots, canonical, hreflang `es-GT`, Open Graph con imagen 1200×630 propia y
  metadatos geográficos.
- Página rápida: CSS y JS propios, sin frameworks; tipografías autohospedadas (sin las dos
  conexiones TLS a Google Fonts) y fotos en `<picture>` con WebP y `srcset`.
- Accesible: un solo `<h1>` por página, `alt` en todo, foco visible, navegación por teclado,
  y el panel de cotización es un `role="dialog"` con `aria-modal` y foco encerrado.

### Lo que decide el resultado (y no depende del código)

Sé directo en esto: **para búsquedas tipo "pan cerca de mí" o "panadería zona 10", quien
manda es Google Business Profile, no la web.** El sitio da respaldo y convierte; el perfil
es el que aparece en el mapa. Aspirar a ser el primer resultado nacional de la palabra
"pan" no es realista contra marcas grandes; sí lo es dominar *"panadería + tu zona"*,
*"pan por encargo Guatemala"* y todo lo que lleve la palabra *Cefas*.

Por orden de impacto:

1. **Google Business Profile** — reclamá la ficha en `business.google.com`. Categoría
   principal *Panadería*, dirección exacta, horarios, fotos reales del pan (10+), enlace a
   este sitio, y activá mensajes y productos. Es lo más importante de toda la lista.
2. **Reseñas** — pedí reseñas a los clientes habituales, con una tarjetita con QR en el
   mostrador. Respondé todas. Es el segundo factor de ranking local.
3. **Fotos reales** — es el pendiente más grande del sitio: hoy las 17 fotos son de relleno
   y todas las tarjetas muestran la misma. Una foto por producto sube la conversión
   notablemente, y de ahí sale también la imagen que se ve al compartir el enlace
   (`og-cefas.jpg`, ver arriba).
4. **Google Search Console** — `search.google.com/search-console`, verificá el dominio y
   enviá `sitemap.xml`. Te dice por qué palabras te encuentran.
5. **NAP consistente** — el mismo nombre, dirección y teléfono, escritos idéntico, en la
   web, en Google, en Facebook, en Instagram y en PedidosYa.
6. **Directorios locales** — Guatemala.com, Deguate, Waze, Apple Maps, Páginas Amarillas.
7. **Contenido** — cuando haya tiempo, una página por producto estrella
   (*pan francés*, *champurradas*, *pasteles de cumpleaños*) gana más búsquedas de cola larga
   que cualquier ajuste técnico.

### Medición

Cuando quieras analítica, agregá el script de Google Analytics 4 o Plausible en
`herramientas/generar.js`, dentro de la función `cabeza()`, antes de `</head>`.

---

## Notas técnicas

- **Lista de cotización**: `localStorage` (`cefas_cotizacion_v1`), envuelto en `try/catch`
  para navegación privada. Guarda nombre, unidad y cantidad; no hay importes. La clave cambió
  de `cefas_pedido_v1` a propósito: las listas guardadas con la versión anterior traían
  precios y no se reutilizan.
- **El formulario no envía datos a ningún servidor**: sólo arma el texto de WhatsApp. No hay
  backend, ni cookies, ni tracking.
- **PedidosYa** se enlaza con `rel="nofollow"` para entregas inmediatas, sin ceder autoridad.
- Los `.html` generados se versionan a propósito: GitHub Pages los sirve tal cual, sin build.
- **Iconos**: sprite SVG inline (`herramientas/iconos.js`). Sin fuentes de iconos ni
  peticiones extra; el sprite pesa ~9 KB por página y comprime muy bien.
- **Animaciones**: entrada de secciones con `IntersectionObserver` (`[data-reveal]`), barra
  de progreso de scroll y contadores. El estado inicial oculto se aplica sólo bajo `html.js`
  —una línea en el `<head>`—, así que sin JavaScript el contenido se ve completo. Todo el
  movimiento se desactiva con `prefers-reduced-motion: reduce`.
- **Imágenes**: `<picture>` con WebP y `srcset` de 400/800 px, `loading="lazy"` +
  `decoding="async"` y `width`/`height` en todas, para que no haya salto de layout. La foto del
  hero va con `fetchpriority="high"` y un `preload` que apunta a la variante que el navegador
  va a elegir de verdad, no al original.
- **Tipografías**: Fraunces e Inter autohospedadas en `assets/fonts/`. Son fuentes variables,
  así que un solo `.woff2` por subconjunto cubre todos los pesos (`font-weight: 400 700`). Se
  precargan los dos subconjuntos latinos; el `latin-ext` sólo se baja si aparece un carácter
  que lo necesite. Para actualizarlas, bajá de nuevo los `.woff2` de Google Fonts
  conservando los nombres.
- **Fecha de entrega**: `app.js` valida fecha y hora contra el horario real del negocio, que
  llega en `<body data-horarios="1-5:06:00-20:00;6:06:00-12:00;0:cerrado">` y
  `data-anticipacion`. No acepta un día cerrado, ni una hora fuera del horario, ni menos de
  las horas de anticipación que pide `negocio.json`. El mínimo se calcula en hora local: con
  `toISOString()` saltaba un día a partir de las 18:00 en Guatemala (UTC−6).
- **Panel de cotización**: `role="dialog"` + `aria-modal="true"`, con el foco encerrado
  mientras está abierto y devuelto al botón de origen cuando ya está oculto. Tras abrir
  WhatsApp con la lista, el panel y el aviso del formulario ofrecen vaciarla: si no, en la
  siguiente visita el cliente reenviaba productos viejos.
- **Filtro del menú en la URL**: el filtro de categoría se guarda en el `hash` (`menu/#pan-dulce`),
  el mismo que usan las anclas de las tarjetas de categoría, así que un enlace filtrado se
  puede compartir y llegar desde el inicio a una categoría ya filtra. Otros hashes de la
  página (`#contenido`) no lo tocan.
- **Sin JavaScript** hay un `<noscript>` arriba que manda directo a WhatsApp: sin JS los
  botones de las tarjetas no hacen nada.
- **Sprite de iconos por página**: `generar.js` inyecta sólo los `<symbol>` que esa página usa
  (más `mas` y `menos`, que `app.js` pinta al vuelo), no el set completo.
- **`.gitattributes`** fuerza LF en todo el texto. Había archivos en CRLF y otros en LF; con
  `core.autocrlf` funcionaba, pero quien clone sin esa opción vería diffs de archivo entero.
