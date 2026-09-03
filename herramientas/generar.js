#!/usr/bin/env node
/* ==========================================================================
   Generador estático de cefaspanaderia — GitHub Pages
   --------------------------------------------------------------------------
   Lee  datos/negocio.json + datos/productos.json + plantillas/*.html
   Genera  index.html, menu/, encargos/, contacto/, 404.html, sitemap.xml,
           robots.txt, manifest.webmanifest, .nojekyll

   Uso:  node herramientas/generar.js
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');
const { sprite, ico } = require('./iconos');

const RAIZ = path.resolve(__dirname, '..');
const leerJSON = (p) => JSON.parse(fs.readFileSync(path.join(RAIZ, p), 'utf8'));

const N = leerJSON('datos/negocio.json');
const CAT = leerJSON('datos/productos.json');

const DOMINIO = N.dominio.replace(/\/$/, '');
const HOY = new Date().toISOString().slice(0, 10);

/* --- Helpers -------------------------------------------------------------- */
const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const money = (n) => `${N.simboloMoneda}${Number(n).toFixed(2)}`;
const jsonld = (obj) => JSON.stringify(obj, null, 2).replace(/</g, '\\u003c');

const DIRECCION_UNA_LINEA = [N.direccion.calle, N.direccion.zona, N.direccion.ciudad, 'Guatemala']
  .filter(Boolean).join(', ');

/* Foto de relleno mientras no haya fotos reales de cada producto.
   Poné el nombre del archivo en el campo "imagen" de datos/productos.json
   (categoría o producto) y se usa esa en lugar de la genérica.            */
const IMG_GENERICA = 'pan-img-generico.jpg';
const imagenDe = (obj) => `{{BASE}}assets/img/${esc(obj.imagen || IMG_GENERICA)}`;

/* Cuántas piezas trae una unidad de venta, cuando el texto lo dice sin
   ambigüedad ("docena", "paquete de 6", "bandeja 40 piezas"). Sirve para
   mostrar a cuánto sale cada pieza, que es el argumento de venta de los
   paquetes. Si no se puede deducir, devuelve 0 y no se muestra nada.   */
function piezasPorUnidad(unidad) {
  const u = String(unidad || '').toLowerCase();
  if (/docena/.test(u)) return 12;
  const paquete = u.match(/(?:paquete|caja|bolsa)\s+de\s+(\d+)/);
  if (paquete) return Number(paquete[1]);
  const piezas = u.match(/(\d+)\s*(?:piezas|unidades)/);
  if (piezas) return Number(piezas[1]);
  return 0;
}


const todosLosProductos = CAT.categorias.flatMap((c) =>
  c.productos.map((p) => ({ ...p, categoria: c.nombre, categoriaId: c.id })));

/* Productos que se venden por paquete y cuyo precio por pieza es calculable */
const PAQUETES = todosLosProductos
  .filter((p) => p.precio > 0 && piezasPorUnidad(p.unidad) > 1)
  .sort((a, b) => a.precio - b.precio);

/* --- Páginas -------------------------------------------------------------- */
const PAGINAS = [
  {
    archivo: 'index.html', ruta: '/', profundidad: 0, nav: 'inicio', prioridad: '1.0',
    plantilla: 'inicio.html',
    titulo: 'Cefas Panadería en Guatemala | Pan fresco y encargos',
    descripcion: 'Pedí pan francés, pan dulce, pan artesanal, repostería y pasteles. Armá tu pedido y envialo por WhatsApp. Entregamos sólo en Ciudad de Guatemala.'
  },
  {
    archivo: 'menu/index.html', ruta: '/menu/', profundidad: 1, nav: 'menu', prioridad: '0.9',
    plantilla: 'menu.html',
    titulo: 'Menú y precios | Cefas Panadería Guatemala',
    descripcion: 'Precios en quetzales de pan francés, champurradas, cubiletes, pan artesanal, croissants, pasteles y café. Agregá al pedido y envialo por WhatsApp en un clic.'
  },
  {
    archivo: 'encargos/index.html', ruta: '/encargos/', profundidad: 1, nav: 'encargos', prioridad: '0.9',
    plantilla: 'encargos.html',
    titulo: 'Pedidos por encargo | Pan y pasteles a domicilio en Guatemala',
    descripcion: 'Encargá pan, pasteles y bocadillos para casa, oficina y eventos con 24 horas de anticipación. Entregamos sólo dentro de Ciudad de Guatemala. Cotizá por WhatsApp.'
  },
  {
    archivo: 'contacto/index.html', ruta: '/contacto/', profundidad: 1, nav: 'contacto', prioridad: '0.7',
    plantilla: 'contacto.html',
    titulo: 'Contacto y horarios | Cefas Panadería Ciudad de Guatemala',
    descripcion: 'Dirección, teléfono, WhatsApp y horarios de Cefas Panadería en Ciudad de Guatemala. Escribinos para pedidos por encargo y entregas a domicilio.'
  },
  {
    archivo: '404.html', ruta: '/404.html', profundidad: 0, nav: '', prioridad: null, noindex: true,
    plantilla: '404.html',
    titulo: 'Página no encontrada | Cefas Panadería',
    descripcion: 'La página que buscás no existe o cambió de dirección. Volvé al menú de Cefas Panadería para ver nuestro pan, repostería y pasteles por encargo en Guatemala.'
  }
];

/* --- Bloques generados ---------------------------------------------------- */

function tarjetasCategorias() {
  return CAT.categorias.map((c) => `
        <a class="categoria" href="{{BASE}}menu/#${esc(c.id)}" data-reveal>
          <div class="foto foto--16-10">
            <img src="${imagenDe(c)}" alt="${esc(c.nombre)} en ${esc(N.nombre)}" width="554" height="554" loading="lazy" decoding="async">
            <span class="categoria__icono" aria-hidden="true">${ico(c.icono, 'ico--l')}</span>
          </div>
          <div class="categoria__cuerpo">
            <h3>${esc(c.nombre)}</h3>
            <p>${esc(c.descripcion)}</p>
            <span class="categoria__enlace">Ver ${c.productos.length} productos ${ico('flecha', 'ico--desliza')}</span>
          </div>
        </a>`).join('\n');
}

function tarjetaProducto(p, { conBoton = true, insignia = false, porPieza = false } = {}) {
  const precio = p.precio > 0 ? money(p.precio) : 'Cotización';
  const buscar = `${p.nombre} ${p.descripcion} ${p.categoria || ''}`;
  const piezas = piezasPorUnidad(p.unidad);
  const etiquetas = [
    p.encargo ? `<span class="etiqueta etiqueta--encargo">${ico('calendario')} Por encargo</span>` : '',
    insignia && !p.encargo ? `<span class="etiqueta etiqueta--favorito">${ico('estrella')} Favorito</span>` : ''
  ].filter(Boolean).join('');

  // Precio por pieza: es división del precio real, no un descuento inventado
  const equivalencia = porPieza && piezas > 1 && p.precio > 0
    ? `<p class="producto__pieza">${ico('check')} Sale a <strong>${esc(money(p.precio / piezas))}</strong> cada uno</p>`
    : '';

  // El contador (− 2 +) lo crea app.js la primera vez que se agrega el
  // producto: son 50 tarjetas por página y no hace falta enviarlo en el HTML.
  const acciones = p.precio > 0 && conBoton
    ? `<button class="btn btn--principal btn--compacto" type="button" data-agregar>${ico('mas')} Agregar al pedido</button>`
    : `<a class="btn btn--secundario btn--compacto" href="{{BASE}}encargos/#formulario">${ico('chat')} Pedir cotización</a>`;

  return `
          <article class="producto" data-producto data-id="${esc(p.id)}" data-nombre="${esc(p.nombre)}" data-precio="${p.precio}" data-unidad="${esc(p.unidad)}" data-buscar="${esc(buscar)}" data-reveal>
            <div class="foto foto--4-3">
              <img src="${imagenDe(p)}" alt="${esc(p.nombre)} en ${esc(N.nombre)}" width="554" height="554" loading="lazy" decoding="async">
              ${etiquetas ? `<div class="foto__etiquetas">${etiquetas}</div>` : ''}
            </div>
            <div class="producto__cuerpo">
              <div class="producto__cabecera">
                <h3 class="producto__nombre">${esc(p.nombre)}</h3>
                <div>
                  <span class="producto__precio">${esc(precio)}</span>
                  <span class="producto__unidad">${esc(p.unidad)}</span>
                </div>
              </div>
              <p class="producto__desc">${esc(p.descripcion)}</p>
              ${equivalencia}
              <div class="producto__pie">${acciones}
              </div>
            </div>
          </article>`;
}

function bloquePaquetes() {
  return PAQUETES.map((p) => tarjetaProducto(p, { porPieza: true })).join('');
}

function menuCompleto() {
  return CAT.categorias.map((c) => `
      <section class="categoria-bloque" id="${esc(c.id)}" data-categoria-bloque="${esc(c.id)}" aria-labelledby="titulo-${esc(c.id)}">
        <h2 class="categoria-bloque__titulo" id="titulo-${esc(c.id)}"><span class="chapa" aria-hidden="true">${ico(c.icono, 'ico--l')}</span> ${esc(c.nombre)}</h2>
        <p>${esc(c.descripcion)}</p>
        <div class="rejilla rejilla--3">${c.productos.map((p) => tarjetaProducto({ ...p, categoria: c.nombre })).join('')}
        </div>
      </section>`).join('\n');
}

function botonesFiltro() {
  const botones = [`<button class="filtro" type="button" data-filtro="todas" aria-pressed="true">${ico('canasta')} Todo el menú</button>`]
    .concat(CAT.categorias.map((c) =>
      `<button class="filtro" type="button" data-filtro="${esc(c.id)}" aria-pressed="false">${ico(c.icono)} ${esc(c.nombre)}</button>`));
  return botones.join('\n          ');
}

function destacados() {
  return todosLosProductos.filter((p) => p.destacado).slice(0, 8)
    .map((p) => tarjetaProducto(p, { insignia: true })).join('');
}

function bloqueFAQ() {
  return CAT.faq.map((f) => `
          <details data-reveal>
            <summary>${esc(f.p)}<span class="faq__signo" aria-hidden="true">${ico('chevron')}</span></summary>
            <div>${esc(f.r)}</div>
          </details>`).join('');
}

function bloqueZonas() {
  return N.zonasCobertura.map((z) => `<li>${ico('pin')} ${esc(z)}</li>`).join('\n            ');
}

function bloqueHorarios() {
  return N.horarios.map((h) =>
    `<li><span>${ico('reloj')} ${esc(h.etiqueta)}</span><span>${esc(h.abre)} – ${esc(h.cierra)}</span></li>`).join('\n            ');
}

function opcionesProducto() {
  return CAT.categorias.map((c) =>
    `<optgroup label="${esc(c.nombre)}">${c.productos.map((p) => `<option value="${esc(p.nombre)}">${esc(p.nombre)}</option>`).join('')}</optgroup>`
  ).join('\n              ');
}

/* --- Datos estructurados -------------------------------------------------- */

const ID_NEGOCIO = `${DOMINIO}/#panaderia`;

function schemaNegocio() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Bakery',
    '@id': ID_NEGOCIO,
    name: N.nombre,
    alternateName: ['Cefas', 'Panadería Cefas', 'Cefas Panadería Guatemala'],
    description: N.descripcionCorta,
    url: `${DOMINIO}/`,
    logo: `${DOMINIO}/assets/img/logo-cefas.png`,
    image: `${DOMINIO}/assets/img/logo-cefas.png`,
    telephone: N.telefonoE164,
    email: N.email,
    priceRange: N.rangoPrecios,
    currenciesAccepted: N.moneda,
    paymentAccepted: 'Efectivo, Tarjeta de crédito, Transferencia bancaria',
    servesCuisine: ['Panadería', 'Repostería', 'Café'],
    hasMenu: `${DOMINIO}/menu/`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: N.direccion.calle,
      addressLocality: N.direccion.ciudad,
      addressRegion: N.direccion.departamento,
      postalCode: N.direccion.codigoPostal,
      addressCountry: N.direccion.pais
    },
    geo: { '@type': 'GeoCoordinates', latitude: N.geo.lat, longitude: N.geo.lng },
    openingHoursSpecification: N.horarios.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.dias.map((d) => `https://schema.org/${d}`),
      opens: h.abre,
      closes: h.cierra
    })),
    // Sólo Ciudad de Guatemala: no se listan municipios del área metropolitana
    areaServed: [{ '@type': 'City', name: 'Ciudad de Guatemala' }].concat(
      N.zonasCobertura.map((z) => ({ '@type': 'Place', name: `${z}, Ciudad de Guatemala` }))),
    sameAs: Object.values(N.redes).filter(Boolean),
    potentialAction: {
      '@type': 'OrderAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${DOMINIO}/encargos/`,
        actionPlatform: [
          'https://schema.org/DesktopWebPlatform',
          'https://schema.org/MobileWebPlatform'
        ]
      },
      deliveryMethod: ['https://schema.org/OnSitePickup', 'https://schema.org/ParcelService']
    }
  };
}

function schemaSitio() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${DOMINIO}/#sitio`,
    url: `${DOMINIO}/`,
    name: N.nombre,
    inLanguage: 'es-GT',
    publisher: { '@id': ID_NEGOCIO }
  };
}

function schemaMigas(pagina) {
  const items = [{ '@type': 'ListItem', position: 1, name: 'Inicio', item: `${DOMINIO}/` }];
  if (pagina.ruta !== '/') {
    items.push({
      '@type': 'ListItem', position: 2,
      name: pagina.nav === 'menu' ? 'Menú' : pagina.nav === 'encargos' ? 'Encargos' : 'Contacto',
      item: `${DOMINIO}${pagina.ruta}`
    });
  }
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items };
}

function schemaFAQ() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: CAT.faq.map((f) => ({
      '@type': 'Question',
      name: f.p,
      acceptedAnswer: { '@type': 'Answer', text: f.r }
    }))
  };
}

function schemaMenu() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    '@id': `${DOMINIO}/menu/#menu`,
    name: `Menú de ${N.nombre}`,
    inLanguage: 'es-GT',
    url: `${DOMINIO}/menu/`,
    hasMenuSection: CAT.categorias.map((c) => ({
      '@type': 'MenuSection',
      name: c.nombre,
      description: c.descripcion,
      hasMenuItem: c.productos.map((p) => ({
        '@type': 'MenuItem',
        name: p.nombre,
        description: p.descripcion,
        ...(p.precio > 0 ? {
          offers: {
            '@type': 'Offer',
            price: p.precio.toFixed(2),
            priceCurrency: N.moneda,
            availability: 'https://schema.org/InStock',
            url: `${DOMINIO}/menu/#${c.id}`
          }
        } : {})
      }))
    }))
  };
}

function schemaServicioEncargos() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Pedidos de pan y pasteles por encargo',
    serviceType: 'Panadería por encargo y entrega a domicilio',
    provider: { '@id': ID_NEGOCIO },
    areaServed: { '@type': 'City', name: 'Ciudad de Guatemala' },
    availableChannel: {
      '@type': 'ServiceChannel',
      serviceUrl: `${DOMINIO}/encargos/`,
      servicePhone: N.telefonoE164
    },
    offers: { '@type': 'Offer', priceCurrency: N.moneda, priceRange: N.rangoPrecios }
  };
}

function schemasDe(pagina) {
  const lista = [schemaNegocio(), schemaSitio(), schemaMigas(pagina)];
  if (pagina.nav === 'inicio') lista.push(schemaFAQ());
  if (pagina.nav === 'menu') lista.push(schemaMenu());
  if (pagina.nav === 'encargos') lista.push(schemaServicioEncargos());
  if (pagina.nav === 'contacto') {
    lista.push({
      '@context': 'https://schema.org', '@type': 'ContactPage',
      url: `${DOMINIO}/contacto/`, mainEntity: { '@id': ID_NEGOCIO }
    });
  }
  return lista;
}

/* --- Layout --------------------------------------------------------------- */

function cabeza(pagina) {
  const base = '../'.repeat(pagina.profundidad);
  const url = `${DOMINIO}${pagina.ruta}`;
  const og = `${DOMINIO}/assets/img/logo-cefas.png`;
  const enlaces = schemasDe(pagina)
    .map((s) => `<script type="application/ld+json">\n${jsonld(s)}\n</script>`).join('\n');

  return `<!DOCTYPE html>
<html lang="es-GT">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(pagina.titulo)}</title>
<meta name="description" content="${esc(pagina.descripcion)}">
<link rel="canonical" href="${url}">
${pagina.noindex ? '<meta name="robots" content="noindex, follow">' : '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">'}
<meta name="author" content="${esc(N.nombre)}">
<meta name="theme-color" content="#171310">

<!-- Geolocalización (SEO local Guatemala) -->
<meta name="geo.region" content="GT-GU">
<meta name="geo.placename" content="Ciudad de Guatemala">
<meta name="geo.position" content="${N.geo.lat};${N.geo.lng}">
<meta name="ICBM" content="${N.geo.lat}, ${N.geo.lng}">

<!-- Open Graph / redes sociales -->
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(N.nombre)}">
<meta property="og:locale" content="es_GT">
<meta property="og:title" content="${esc(pagina.titulo)}">
<meta property="og:description" content="${esc(pagina.descripcion)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${og}">
<meta property="og:image:alt" content="Logo de ${esc(N.nombre)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(pagina.titulo)}">
<meta name="twitter:description" content="${esc(pagina.descripcion)}">
<meta name="twitter:image" content="${og}">

<link rel="alternate" hreflang="es-gt" href="${url}">
<link rel="alternate" hreflang="x-default" href="${url}">

<link rel="icon" type="image/png" href="${base}assets/img/logo-cefas.png">
<link rel="apple-touch-icon" href="${base}assets/img/logo-cefas.png">
<link rel="manifest" href="${base}manifest.webmanifest">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&amp;family=Inter:wght@400;500;600;700&amp;display=swap">
<link rel="stylesheet" href="${base}assets/css/estilos.css">
${pagina.nav === 'inicio' ? `<link rel="preload" as="image" href="${base}assets/img/${IMG_GENERICA}" fetchpriority="high">` : ''}

<!-- Marca .js para que las animaciones de entrada sólo se apliquen si hay
     JavaScript; sin él el contenido se ve de una vez. -->
<script>document.documentElement.classList.add('js');</script>

${enlaces}
</head>`;
}

function cabecera(pagina) {
  const base = '../'.repeat(pagina.profundidad);
  const item = (href, texto, clave) =>
    `<a href="${base}${href}"${pagina.nav === clave ? ' aria-current="page"' : ''}>${texto}</a>`;

  return `
<a class="saltar-al-contenido" href="#contenido">Saltar al contenido</a>
<header class="cabecera">
  <div class="contenedor cabecera__inner">
    <a class="marca" href="${base}index.html" aria-label="${esc(N.nombre)} — inicio">
      <img src="${base}assets/img/logo-cefas.png" alt="Logo de ${esc(N.nombre)}" width="44" height="44">
      <span class="marca__texto">
        <span class="marca__nombre">Cefas</span>
        <span class="marca__sub">Panadería</span>
      </span>
    </a>

    <nav class="nav" id="nav-principal" data-nav aria-label="Navegación principal">
      ${item('index.html', 'Inicio', 'inicio')}
      ${item('menu/', 'Menú', 'menu')}
      ${item('encargos/', 'Encargos', 'encargos')}
      ${item('contacto/', 'Contacto', 'contacto')}
    </nav>

    <div class="cabecera__acciones">
      <button class="btn btn--principal carrito-btn" type="button" data-carrito-abrir aria-label="Ver mi pedido">
        ${ico('canasta')}<span class="btn--texto-largo">Mi pedido</span>
        <strong class="carrito-btn__total" data-carrito-total data-si-hay-pedido hidden>${N.simboloMoneda}0.00</strong>
        <span class="carrito-btn__contador" data-carrito-contador hidden>0</span>
      </button>
      <button class="menu-btn" type="button" data-menu-btn aria-label="Abrir menú de navegación" aria-expanded="false" aria-controls="nav-principal">
        <span></span>
      </button>
    </div>
  </div>
  <div class="cabecera__progreso" data-progreso aria-hidden="true"></div>
</header>`;
}

function pie(pagina) {
  const base = '../'.repeat(pagina.profundidad);
  const redes = [];
  const enlaceRed = (url, icono, texto, rel = 'noopener') =>
    `<li><a href="${url}" rel="${rel}">${ico(icono)} ${texto}</a></li>`;
  if (N.redes.facebook) redes.push(enlaceRed(N.redes.facebook, 'facebook', 'Facebook'));
  if (N.redes.instagram) redes.push(enlaceRed(N.redes.instagram, 'instagram', 'Instagram'));
  if (N.redes.tiktok) redes.push(enlaceRed(N.redes.tiktok, 'tiktok', 'TikTok'));
  if (N.redes.pedidosya) redes.push(enlaceRed(N.redes.pedidosya, 'bolsa', 'PedidosYa', 'noopener nofollow'));

  return `
<footer class="pie">
  <div class="contenedor">
    <div class="pie__grid">
      <div class="pie__marca">
        <img src="${base}assets/img/logo-cefas.png" alt="Logo de ${esc(N.nombre)}" width="56" height="56" loading="lazy">
        <p>${esc(N.descripcionCorta)}</p>
      </div>

      <div>
        <h3>Menú</h3>
        <ul>
          ${CAT.categorias.slice(0, 5).map((c) => `<li><a href="${base}menu/#${esc(c.id)}">${esc(c.nombre)}</a></li>`).join('\n          ')}
          <li><a href="${base}menu/">Ver menú completo</a></li>
        </ul>
      </div>

      <div>
        <h3>Pedidos</h3>
        <ul>
          <li><a href="${base}encargos/">${ico('caja')} Pedidos por encargo</a></li>
          <li><a href="${base}encargos/#eventos">${ico('usuarios')} Eventos y empresas</a></li>
          <li><a href="${base}contacto/">${ico('reloj')} Contacto y horarios</a></li>
          ${redes.join('\n          ')}
        </ul>
      </div>

      <div>
        <h3>Contacto</h3>
        <ul class="pie__contacto">
          <li>${ico('pin')} <span>${esc(DIRECCION_UNA_LINEA)}</span></li>
          <li><a href="tel:${esc(N.telefonoE164)}">${ico('telefono')} ${esc(N.telefono)}</a></li>
          <li><a href="mailto:${esc(N.email)}">${ico('correo')} ${esc(N.email)}</a></li>
          <li><a href="https://wa.me/${esc(N.whatsapp)}" rel="noopener">${ico('whatsapp')} WhatsApp</a></li>
        </ul>
      </div>
    </div>

    <div class="pie__legal">
      <span>&copy; <span data-anio>2026</span> ${esc(N.nombre)}. Ciudad de Guatemala, Guatemala.</span>
      <span>Pan francés, pan dulce, pan artesanal y pasteles por encargo.</span>
    </div>
  </div>
</footer>

<a class="wa-flotante" href="https://wa.me/${esc(N.whatsapp)}?text=${encodeURIComponent('¡Hola Cefas Panadería! Quiero hacer un pedido.')}" rel="noopener" aria-label="Escribinos por WhatsApp">
  ${ico('whatsapp')}
  <span class="wa-flotante__texto">Pedir por WhatsApp</span>
</a>`;
}

/* Barra fija de pedido para móvil: mientras hay algo en el carrito, el total
   y el botón de cerrar la compra quedan siempre a la vista. */
function barraVenta() {
  return `
<div class="barra-venta" data-barra-venta hidden>
  <div class="barra-venta__info">
    <strong data-carrito-total>${N.simboloMoneda}0.00</strong>
    <span><span data-carrito-unidades>0</span> en tu pedido</span>
  </div>
  <button class="btn btn--wa" type="button" data-carrito-abrir>
    ${ico('canasta')} Ver mi pedido
  </button>
</div>`;
}

function panelCarrito(pagina) {
  const base = '../'.repeat(pagina.profundidad);
  return `
<div class="velo" data-velo hidden></div>
<aside class="panel" data-panel hidden aria-label="Mi pedido">
  <div class="panel__cabecera">
    <h2>${ico('canasta')} Mi pedido</h2>
    <button class="panel__cerrar" type="button" data-panel-cerrar aria-label="Cerrar el panel de pedido">${ico('cerrar')}</button>
  </div>
  <div class="panel__cuerpo" data-carrito-cuerpo>
    <p class="carrito-vacio" data-carrito-vacio>
      <span class="carrito-vacio__ico" aria-hidden="true">${ico('canasta', 'ico--xl')}</span>
      Todavía no agregaste nada.<br>
      <a href="${base}menu/">Explorá el menú</a> y armá tu encargo.
    </p>
  </div>
  <div class="panel__pie">
    <div class="panel__total"><span>Total estimado</span><strong data-carrito-total>${N.simboloMoneda}0.00</strong></div>
    <p class="panel__nota">Los precios son referenciales. Te confirmamos el total final y la hora de entrega por WhatsApp.</p>
    <button class="btn btn--wa btn--bloque" type="button" data-enviar-wa disabled>${ico('whatsapp')} Enviar pedido por WhatsApp</button>
    <p class="panel__vaciar"><button class="btn btn--texto" type="button" data-vaciar>Vaciar pedido</button></p>
  </div>
</aside>`;
}

/* --- Sustitución de variables --------------------------------------------- */

function sustituir(html, pagina) {
  const base = '../'.repeat(pagina.profundidad);
  const mapa = {
    BASE: base,
    NOMBRE: esc(N.nombre),
    ESLOGAN: esc(N.eslogan),
    DESCRIPCION_CORTA: esc(N.descripcionCorta),
    TELEFONO: esc(N.telefono),
    TELEFONO_E164: esc(N.telefonoE164),
    WHATSAPP: esc(N.whatsapp),
    EMAIL: esc(N.email),
    DIRECCION: esc(DIRECCION_UNA_LINEA),
    CIUDAD: esc(N.direccion.ciudad),
    DOMINIO,
    PEDIDOSYA: N.redes.pedidosya || '',
    MAPA_EMBED: N.redes.googleMapsEmbed || '',
    MAPA_ENLACE: N.redes.googleMaps || `https://www.google.com/maps/search/${encodeURIComponent(N.nombre + ' ' + DIRECCION_UNA_LINEA)}`,
    ANTICIPACION: String(N.anticipacionEncargoHoras),
    ENTREGA_SOLO: esc(N.entregaSolo),
    PRECIO_DESDE: money(Math.min(...todosLosProductos.filter((p) => p.precio > 0).map((p) => p.precio))),
    TOTAL_PRODUCTOS: String(todosLosProductos.length),
    TOTAL_CATEGORIAS: String(CAT.categorias.length),
    TOTAL_ZONAS: String(N.zonasCobertura.length),
    CATEGORIAS_TARJETAS: tarjetasCategorias(),
    MENU_COMPLETO: menuCompleto(),
    FILTROS: botonesFiltro(),
    DESTACADOS: destacados(),
    PAQUETES: bloquePaquetes(),
    FAQ: bloqueFAQ(),
    ZONAS: bloqueZonas(),
    HORARIOS: bloqueHorarios(),
    OPCIONES_PRODUCTO: opcionesProducto(),
    IMG_GENERICA: `${base}assets/img/${IMG_GENERICA}`
  };

  let salida = html;
  // Dos pasadas: los bloques generados también contienen {{BASE}} y {{ico:…}}
  for (let i = 0; i < 2; i++) {
    // {{ico:nombre}} → <svg><use href="#i-nombre"></svg>
    salida = salida.replace(/\{\{ico:([\w-]+)(?::([\w -]+))?\}\}/g, (_, nombre, clase) => ico(nombre, clase));
    salida = salida.replace(/\{\{(\w+)\}\}/g, (coincidencia, clave) =>
      Object.prototype.hasOwnProperty.call(mapa, clave) ? mapa[clave] : coincidencia);
  }

  const pendientes = salida.match(/\{\{[^}]+\}\}/g);
  if (pendientes) {
    console.warn(`  ⚠ variables sin resolver en ${pagina.archivo}: ${[...new Set(pendientes)].join(', ')}`);
  }
  return salida;
}

/* --- Construcción --------------------------------------------------------- */

function escribir(rutaRelativa, contenido) {
  const destino = path.join(RAIZ, rutaRelativa);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, contenido, 'utf8');
  const kb = (Buffer.byteLength(contenido, 'utf8') / 1024).toFixed(1);
  console.log(`  ✓ ${rutaRelativa.padEnd(24)} ${kb.padStart(7)} KB`);
}

function construirPagina(pagina) {
  const cuerpo = fs.readFileSync(path.join(RAIZ, 'plantillas', pagina.plantilla), 'utf8');
  const base = '../'.repeat(pagina.profundidad);

  const html = [
    cabeza(pagina),
    `<body data-whatsapp="${esc(N.whatsapp)}" data-moneda="${esc(N.simboloMoneda)}">`,
    sprite(),
    cabecera(pagina),
    '<main id="contenido">',
    sustituir(cuerpo, pagina).trim(),
    '</main>',
    pie(pagina),
    barraVenta(),
    panelCarrito(pagina),
    `<script src="${base}assets/js/app.js" defer></script>`,
    '</body>',
    '</html>',
    ''
  ].join('\n');

  escribir(pagina.archivo, html);
}

function construirSitemap() {
  const urls = PAGINAS.filter((p) => p.prioridad).map((p) => `  <url>
    <loc>${DOMINIO}${p.ruta}</loc>
    <lastmod>${HOY}</lastmod>
    <changefreq>${p.nav === 'menu' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${p.prioridad}</priority>
  </url>`).join('\n');

  escribir('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`);
}

function construirRobots() {
  escribir('robots.txt', `# ${N.nombre} — Ciudad de Guatemala
User-agent: *
Allow: /

Sitemap: ${DOMINIO}/sitemap.xml
`);
}

function construirManifest() {
  escribir('manifest.webmanifest', JSON.stringify({
    name: N.nombre,
    short_name: 'Cefas',
    description: N.descripcionCorta,
    lang: 'es-GT',
    start_url: './',
    scope: './',
    display: 'standalone',
    background_color: '#FDF8F1',
    theme_color: '#171310',
    icons: [
      { src: 'assets/img/logo-cefas.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'assets/img/logo-cefas.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  }, null, 2) + '\n');
}

/* --- Main ----------------------------------------------------------------- */

console.log(`\nGenerando ${N.nombre} → ${DOMINIO}\n`);
PAGINAS.forEach(construirPagina);
construirSitemap();
construirRobots();
construirManifest();
escribir('.nojekyll', '');

console.log(`\n${CAT.categorias.length} categorías · ${todosLosProductos.length} productos · listo.\n`);
