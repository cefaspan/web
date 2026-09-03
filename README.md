# Cefas Panadería — sitio web

Sitio estático para GitHub Pages, optimizado para búsquedas de pan en Guatemala y con
pedidos por encargo vía WhatsApp.

- **Sin dependencias**: HTML, CSS y JavaScript puros. No hay build de npm ni framework.
- **Contenido en HTML estático**: los 50 productos se sirven en el HTML, no por JavaScript.
  Esto es clave para que Google los indexe de forma fiable.
- **Datos estructurados**: `Bakery`, `Menu`, `FAQPage`, `Service`, `BreadcrumbList`, `WebSite`.
- **Carrito y encargos**: se arma en el navegador y se envía como mensaje de WhatsApp.

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

> El texto de las preguntas frecuentes enumera las zonas a mano (`datos/productos.json` →
> `faq`). Si cambiás `cobertura`, actualizá también esa respuesta.

## El sitio está armado para vender

El orden del inicio es un embudo, no un folleto: primero para qué sirve y el botón de cotizar,
la historia del negocio al final.

1. Hero con la ocasión (eventos, oficinas, actividades) y dos botones de cotización.
2. Barra de datos de compra (mínimo, 1 clic, anticipación, zonas).
3. **Para qué ocasión**: las seis situaciones que se venden.
4. **Lo más pedido**, con `Agregar al pedido` a la vista.
5. **Docenas, paquetes y bandejas**, con el precio por pieza calculado.
6. Desvío a PedidosYa → 7. Cómo cotizar → 8. Cobertura → 9. Preguntas.
10. Quiénes horneamos (corto) → 11. Cierre con los dos botones.

Piezas de conversión que conviene no quitar:

- **Contador en cada tarjeta**: al agregar, el botón se convierte en `− 2 +`. Lo crea
  `app.js` al vuelo (son 50 tarjetas: mandarlo en el HTML sumaba ~20 KB por página).
- **Total en el botón de la cabecera** y **barra fija de pedido en móvil** con el total y
  "Ver mi pedido".
- **Precio por pieza** de los paquetes (`Sale a Q1.17 cada uno`). Es el precio real dividido
  entre las piezas que declara `unidad` (`docena` = 12, `paquete de 6` = 6, `bandeja 50
  piezas` = 50). No es un descuento inventado: si `unidad` no dice piezas, no se muestra nada.

> No hay reseñas, estrellas ni "clientes satisfechos" en el sitio. Poner testimonios
> inventados es lo que más rápido quema la confianza (y Google penaliza el marcado de
> reseñas falsas). Cuando tengas reseñas reales de Google, se enlazan y listo.

---

## ⚠️ Antes de publicar

El sitio está completo y funcional, pero **dos datos siguen siendo de ejemplo** y hay que
reemplazarlos:

| Qué | Dónde | Estado |
|---|---|---|
| Teléfono y WhatsApp | `datos/negocio.json` → `telefono`, `telefonoE164`, `whatsapp` | ✅ `+502 4637-9417` |
| Dirección exacta | `datos/negocio.json` → `direccion.calle`, `geo` | `PENDIENTE` |
| Enlace de Google Maps | `datos/negocio.json` → `redes.googleMaps` | vacío |
| Catálogo y precios | `datos/productos.json` | Menú realista de ejemplo, **no** el de PedidosYa |
| Zonas de entrega | `datos/negocio.json` → `cobertura` | ✅ 11 zonas de la capital + San Cristóbal y Mixco z11 |
| SKU de eventos que faltan | `datos/productos.json` | Repostería y Café quedaron sin nada para eventos |

**Faltan presentaciones de eventos en dos categorías.** Al separar el menudeo, «Repostería y
Postres» y «Café y Bebidas» se quedaron sin un solo producto de eventos, porque el catálogo
solo los tiene por pieza o por vaso. Esas dos categorías ya no se publican. Para recuperarlas
hay que agregar las presentaciones que sí se venden a una actividad, con tu precio real:

- Docena de croissants, docena de donas, bandeja de brownies, bandeja de milhojas,
  bandeja surtida de repostería.
- Café por termo o por galón, jugos por litro, atol por galón.

> El menú de PedidosYa está protegido con PerimeterX y no se pudo leer de forma automática.
> El catálogo actual es un menú de panadería guatemalteca plausible con precios de mercado,
> pensado para que reemplaces nombres, descripciones y precios por los reales.
> Publicar precios que no son los tuyos confunde clientes: cámbialos primero.

`node herramientas/verificar.js` te avisa mientras alguno siga sin configurar.

---

## Uso diario

```bash
node herramientas/generar.js    # regenera el sitio desde los JSON
node herramientas/verificar.js  # valida SEO, enlaces, JSON-LD y accesibilidad
```

**Nunca edites los `.html` de la raíz a mano**: se sobrescriben. Editá `plantillas/` y `datos/`.

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
  "precio": 1.25,               // 0 = muestra "Cotización" en vez del botón de agregar
  "unidad": "unidad",
  "destacado": true,            // aparece en "Lo más pedido" del inicio
  "encargo": true,              // muestra la etiqueta "Por encargo"
  "imagen": "pan-frances.jpg"   // opcional: archivo dentro de assets/img/
}
```

Cada categoría tiene además `icono` (una clave del set de iconos, ver abajo) y también
acepta `imagen`.

### Fotos de los productos

Hoy **todas las tarjetas usan la misma foto de relleno**: `assets/img/pan-img-generico.jpg`.
Para poner las fotos reales:

1. Guardá la imagen en `assets/img/` (cuadrada o 4:3, ~800 px de lado es suficiente).
2. Agregá `"imagen": "nombre-del-archivo.jpg"` al producto o a la categoría.
3. `node herramientas/generar.js`.

Lo que no tenga `imagen` sigue usando la genérica, así que se pueden ir cambiando de a poco.
El `alt` se arma solo con el nombre del producto.

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
datos/          negocio.json, productos.json   ← la única fuente de verdad
plantillas/     contenido de cada página con {{VARIABLES}} y {{ico:nombre}}
herramientas/   generar.js, verificar.js, iconos.js (set de iconos SVG)
assets/css/     estilos.css
assets/js/      app.js
assets/img/     logo-cefas.png, pan-img-generico.jpg (foto de relleno)
index.html  menu/  encargos/  contacto/  404.html   ← GENERADOS
sitemap.xml  robots.txt  manifest.webmanifest  .nojekyll
```

---

## Publicar en GitHub Pages

1. Creá el repositorio y subí todo:

   ```bash
   git init && git add . && git commit -m "Sitio de Cefas Panadería"
   git branch -M main
   git remote add origin https://github.com/WillianHuit/cefas-web.git
   git push -u origin main
   ```

2. En GitHub → **Settings → Pages** → *Source: Deploy from a branch* → `main` / `/ (root)`.
3. Queda en `https://willianhuit.github.io/cefas-web/`.

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
- `Bakery` con dirección, coordenadas, horarios, formas de pago y las 20 zonas que atienden.
- `Menu` completo con precios en quetzales: Google puede mostrar productos y precios.
- `FAQPage` con 8 preguntas que la gente busca tal cual.
- Sitemap, robots, canonical, hreflang `es-GT`, Open Graph y metadatos geográficos.
- Página rápida: CSS y JS propios, sin frameworks, sin imágenes pesadas.
- Accesible: un solo `<h1>` por página, `alt` en todo, foco visible, navegación por teclado.

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
3. **Fotos reales** — reemplazá el logo como imagen social por fotos del pan. Una foto por
   categoría en el menú sube la conversión notablemente.
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

- **Carrito**: `localStorage` (`cefas_pedido_v1`), envuelto en `try/catch` para navegación
  privada. Los precios del carrito se leen de los `data-*` del HTML, así que un cambio de
  precio en el JSON se refleja al regenerar.
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
- **Imágenes**: `loading="lazy"` + `decoding="async"` y `width`/`height` en todas, para que no
  haya salto de layout. La foto del hero va con `fetchpriority="high"` y `preload`.
