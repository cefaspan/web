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
const SERV = leerJSON('datos/servicios.json');

const DOMINIO = N.dominio.replace(/\/$/, '');
const HOY = new Date().toISOString().slice(0, 10);

/* Fecha del último cambio real del contenido, para el <lastmod> del sitemap.
   Antes era siempre "hoy": un lastmod que cambia sin que cambie nada es un
   lastmod que Google aprende a ignorar. Se toma del último commit que tocó
   lo que produce el sitio. Si hay cambios sin commitear —o no hay git— se
   usa hoy, que es cuando de verdad está cambiando.                      */
const FUENTES_DEL_SITIO = ['datos', 'plantillas', 'herramientas', 'assets'];
function fechaUltimoCambio() {
  try {
    const { execFileSync } = require('child_process');
    const opts = { cwd: RAIZ, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' };
    const sucio = execFileSync('git', ['status', '--porcelain', '--', ...FUENTES_DEL_SITIO], opts).trim();
    if (sucio) return HOY;
    const fecha = execFileSync('git', ['log', '-1', '--format=%cs', '--', ...FUENTES_DEL_SITIO], opts).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : HOY;
  } catch (e) {
    return HOY;
  }
}
const LASTMOD = fechaUltimoCambio();

/* --- Helpers -------------------------------------------------------------- */
const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const jsonld = (obj) => JSON.stringify(obj, null, 2).replace(/</g, '\\u003c');

const DIRECCION_UNA_LINEA = N.direccion.calle;

/* --- Qué se vende en este sitio -------------------------------------------
   El sitio vende para eventos y actividades: docenas, paquetes, bandejas,
   cajas, panes y mayoreo. La venta al menudeo (la pieza suelta) va por
   PedidosYa, así que los productos con "minorista": true en
   datos/productos.json no se publican acá: no salen en el menú, ni en los
   destacados, ni en el <select> del formulario, ni en el JSON-LD.
   -------------------------------------------------------------------------- */
const esDeEventos = (p) => !p.minorista;

/* Categorías con al menos un producto de eventos. Una categoría que se queda
   sin productos para eventos no se publica vacía. */
const CATEGORIAS = CAT.categorias
  .map((c) => ({ ...c, productos: c.productos.filter(esDeEventos) }))
  .filter((c) => c.productos.length > 0);

const CATEGORIAS_VACIAS = CAT.categorias
  .filter((c) => !c.productos.some(esDeEventos))
  .map((c) => c.nombre);

/* El horario en una sola cadena para el <body>, con el día de la semana en
   el número que devuelve Date.getDay() (0 = domingo):
   "1-5:06:00-20:00;6:06:00-12:00;0:cerrado". app.js lo usa para no aceptar
   entregas en día cerrado ni fuera de hora.                            */
const DIA_NUM = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6
};
const HORARIOS_DATA = N.horarios.flatMap((h) => {
  const nums = h.dias.map((d) => DIA_NUM[d]).filter((d) => d !== undefined).sort((a, b) => a - b);
  if (!nums.length) return [];
  const valor = h.cerrado ? 'cerrado' : `${h.abre}-${h.cierra}`;
  const contiguo = nums.length > 1 && nums[nums.length - 1] - nums[0] === nums.length - 1;
  return contiguo ? [`${nums[0]}-${nums[nums.length - 1]}:${valor}`] : nums.map((d) => `${d}:${valor}`);
}).join(';');

/* Todas las zonas donde se entrega, con su municipio */
const ZONAS = N.cobertura.flatMap((g) => g.zonas.map((z) => ({ zona: z, municipio: g.municipio })));

/* Las mismas zonas en prosa ("zonas 1, 2 y 4 de Ciudad de Guatemala, y en
   zonas 8 y 11 de Mixco"). Las preguntas frecuentes escriben {zonas} y acá se
   rellena desde cobertura: antes la lista estaba copiada a mano en
   datos/productos.json y se desincronizaba al cambiar la cobertura.      */
const ZONAS_TEXTO = N.cobertura.map((g) => {
  const nums = g.zonas.map((z) => z.replace(/^zona\s+/i, ''));
  const lista = nums.length > 1
    ? `${nums.slice(0, -1).join(', ')} y ${nums[nums.length - 1]}`
    : nums[0];
  return `${nums.length > 1 ? 'zonas' : 'zona'} ${lista} de ${g.municipio}`;
}).join(', y en ');

/* La FAQ ya resuelta, para que el texto visible y el JSON-LD digan lo mismo */
const resolverFAQ = (lista) => (lista || []).map((f) => ({ p: f.p, r: f.r.replace(/\{zonas\}/g, ZONAS_TEXTO) }));
const FAQ = resolverFAQ(CAT.faq);

/* Foto de relleno mientras no haya fotos reales de cada producto.
   Poné el nombre del archivo en el campo "imagen" de datos/productos.json
   (categoría o producto) y se usa esa en lugar de la genérica.            */
const IMG_GENERICA = 'pan-img-generico.jpg';

/* Imagen de 1200×630 para compartir el enlace en WhatsApp y redes.
   La genera herramientas/optimizar-imagenes.js. */
const OG_IMAGEN = 'og-cefas.jpg';

/* El logo de 512 px pesa 50 KB y en la interfaz se pinta a 44–56 px. Para
   cabecera, pie y favicon se usa la variante de 192 px si existe (la deja
   optimizar-imagenes.js); el de 512 queda para el manifest y el JSON-LD.
   La maskable lleva el logo al 80 % sobre fondo opaco: Android recorta el
   borde en círculo y, sin margen, el logo salía cortado.               */
const LOGO = 'logo-cefas.png';
const LOGO_UI = fs.existsSync(path.join(RAIZ, 'assets/img/logo-cefas-192.png')) ? 'logo-cefas-192.png' : LOGO;
const LOGO_MASKABLE = fs.existsSync(path.join(RAIZ, 'assets/img/logo-cefas-maskable.png')) ? 'logo-cefas-maskable.png' : LOGO;
const archivoDe = (obj) => obj.imagen || IMG_GENERICA;
const imagenDe = (obj) => `{{BASE}}assets/img/${esc(archivoDe(obj))}`;

/* Dimensiones reales del archivo, leídas de la cabecera del PNG o del JPEG.
   Van en width/height del <img> para que el navegador reserve el espacio
   exacto y no haya salto de layout. Se leen acá y no se escriben a mano
   porque cambian cada vez que se optimizan las fotos.                    */
const _dimensiones = new Map();
function dimensionesDe(archivo) {
  if (_dimensiones.has(archivo)) return _dimensiones.get(archivo);
  let dim = null;
  try {
    const b = fs.readFileSync(path.join(RAIZ, 'assets/img', archivo));
    if (b.length > 24 && b.slice(1, 4).toString('latin1') === 'PNG') {
      dim = { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
    } else {
      // JPEG: buscar el marcador SOF, que trae alto y ancho
      let i = 2;
      while (i < b.length - 9) {
        if (b[i] !== 0xFF) { i++; continue; }
        const marca = b[i + 1];
        if (marca === 0xD8 || marca === 0x01 || (marca >= 0xD0 && marca <= 0xD7)) { i += 2; continue; }
        if (marca >= 0xC0 && marca <= 0xCF && marca !== 0xC4 && marca !== 0xC8 && marca !== 0xCC) {
          dim = { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
          break;
        }
        i += 2 + b.readUInt16BE(i + 2);
      }
    }
  } catch (e) { /* archivo ausente: se avisa abajo */ }

  if (!dim) {
    console.warn(`  ⚠ no pude leer las dimensiones de assets/img/${archivo}`);
    dim = { w: 800, h: 800 };
  }
  _dimensiones.set(archivo, dim);
  return dim;
}

const medidasImagen = (obj) => {
  const d = dimensionesDe(archivoDe(obj));
  return `width="${d.w}" height="${d.h}"`;
};

/* --- Fotos responsivas ----------------------------------------------------
   Las tarjetas se pintan a unos 300 px de ancho pero las fotos son de 800:
   servir el original a todo el mundo era mandar 3 veces los pixeles que se
   ven. herramientas/optimizar-imagenes.js deja, al lado de foo.jpg, las
   variantes foo-400.jpg, foo.webp y foo-400.webp; acá se referencia sólo lo
   que existe en disco, así que el sitio funciona igual si el optimizador no
   se ha pasado todavía.                                                  */
const existeImg = (archivo) => fs.existsSync(path.join(RAIZ, 'assets/img', archivo));

/* Cuánto ancho ocupa la foto en cada sitio donde se usa. Sin esto el
   navegador supone 100vw y vuelve a bajar la versión grande.            */
const SIZES = {
  hero: '(max-width: 900px) 92vw, 554px',
  tarjeta: '(max-width: 560px) 92vw, (max-width: 1000px) 45vw, 300px',
  ancha: '(max-width: 900px) 92vw, 560px'
};

function foto(archivo, contexto, alt, { prioridad = false } = {}) {
  const d = dimensionesDe(archivo);
  const sizes = SIZES[contexto] || SIZES.tarjeta;
  const url = (a) => `{{BASE}}assets/img/${esc(a)}`;
  const ext = (archivo.match(/\.(?:jpe?g|png)$/i) || ['.jpg'])[0];
  const raiz = archivo.slice(0, archivo.length - ext.length);

  const juego = (extension) => [
    existeImg(`${raiz}-400${extension}`) ? `${url(`${raiz}-400${extension}`)} 400w` : '',
    existeImg(`${raiz}${extension}`) ? `${url(`${raiz}${extension}`)} ${d.w}w` : ''
  ].filter(Boolean);

  const webp = juego('.webp');
  const nativo = juego(ext);

  const img = '<img ' + [
    `src="${url(archivo)}"`,
    nativo.length > 1 ? `srcset="${nativo.join(', ')}" sizes="${sizes}"` : '',
    `alt="${esc(alt)}"`,
    `width="${d.w}" height="${d.h}"`,
    prioridad ? 'fetchpriority="high"' : 'loading="lazy"',
    'decoding="async"'
  ].filter(Boolean).join(' ') + '>';

  if (!webp.length) return img;
  return `<picture><source type="image/webp" srcset="${webp.join(', ')}" sizes="${sizes}">${img}</picture>`;
}

/* Cuántas piezas trae una unidad de venta, cuando el texto lo dice sin
   ambigüedad ("docena", "paquete de 6", "bandeja 40 piezas"). Sirve para
   ordenar la sección de paquetes de la presentación más chica a la más
   grande. Si no se puede deducir, devuelve 0.                          */
function piezasPorUnidad(unidad) {
  const u = String(unidad || '').toLowerCase();
  if (/docena/.test(u)) return 12;
  const paquete = u.match(/(?:paquete|caja|bolsa)\s+de\s+(\d+)/);
  if (paquete) return Number(paquete[1]);
  const piezas = u.match(/(\d+)\s*(?:piezas|unidades)/);
  if (piezas) return Number(piezas[1]);
  return 0;
}


const todosLosProductos = CATEGORIAS.flatMap((c) =>
  c.productos.map((p) => ({ ...p, categoria: c.nombre, categoriaId: c.id })));

/* Presentaciones que traen varias piezas: la sección «Docenas, paquetes y
   bandejas» del inicio, de la más chica a la más grande.               */
const PAQUETES = todosLosProductos
  .filter((p) => piezasPorUnidad(p.unidad) > 1)
  .sort((a, b) => piezasPorUnidad(a.unidad) - piezasPorUnidad(b.unidad));

/* --- Páginas -------------------------------------------------------------- */
const PAGINAS = [
  {
    archivo: 'index.html', ruta: '/', profundidad: 0, nav: 'inicio', prioridad: '1.0',
    plantilla: 'inicio.html',
    titulo: 'Pan para eventos y empresas | Cefas Panadería Guatemala',
    descripcion: 'Coffee breaks, cajas de desayuno, bandejas de bocadillos y docenas de pan para tu evento u oficina. Cotizá por WhatsApp.'
  },
  {
    archivo: 'menu/index.html', ruta: '/menu/', profundidad: 1, nav: 'menu', prioridad: '0.9',
    plantilla: 'menu.html',
    titulo: 'Menú para eventos y coffee breaks | Cefas Panadería Guatemala',
    descripcion: 'Docenas, paquetes, bandejas, cajas de desayuno y coffee breaks por encargo para tu oficina o evento. Armá tu pedido y pedí la cotización por WhatsApp.'
  },
  {
    archivo: 'encargos/index.html', ruta: '/encargos/', profundidad: 1, nav: 'encargos', prioridad: '0.9',
    plantilla: 'encargos.html',
    titulo: 'Cotizar un encargo | Eventos y empresas en Guatemala',
    descripcion: 'Cotizá pan y bocadillos para tu evento, capacitación o celebración con 24 horas de anticipación. Entregas programadas en Ciudad de Guatemala y San Cristóbal.'
  },
  {
    archivo: 'contacto/index.html', ruta: '/contacto/', profundidad: 1, nav: 'contacto', prioridad: '0.7',
    plantilla: 'contacto.html',
    titulo: 'Contacto y horarios | Cefas Panadería Ciudad de Guatemala',
    descripcion: 'Dirección, teléfono, WhatsApp y horarios de Cefas Panadería. Escribinos para cotizar pan y bocadillos para eventos en Ciudad de Guatemala y San Cristóbal.'
  },
  {
    archivo: '404.html', ruta: '/404.html', profundidad: 0, nav: '', prioridad: null, noindex: true,
    plantilla: '404.html',
    titulo: 'Página no encontrada | Cefas Panadería',
    descripcion: 'La página que buscás no existe o cambió de dirección. Volvé al menú de Cefas Panadería para cotizar pan y bocadillos.'
  }
];

/* Una página por servicio (datos/servicios.json). Cada una es una búsqueda
   real —"coffee break empresas Guatemala", "cajas de desayuno oficina"— que
   antes sólo tenía la portada genérica para competir. Y la calculadora de
   cantidades, que responde a "cuánto pan para 50 personas".             */
const PAGINAS_SERVICIO = SERV.servicios.map((s) => ({
  archivo: `${s.id}/index.html`, ruta: `/${s.id}/`, profundidad: 1, nav: 'servicio', prioridad: '0.8',
  plantilla: 'servicio.html', titulo: s.titulo, descripcion: s.descripcion, miga: s.nombre, servicio: s
}));
const PAGINA_CALCULADORA = {
  archivo: 'cuanto-pan/index.html', ruta: '/cuanto-pan/', profundidad: 1, nav: 'calculadora', prioridad: '0.7',
  plantilla: 'cuanto-pan.html', titulo: SERV.calculadora.titulo, descripcion: SERV.calculadora.descripcion,
  miga: 'Cuánto pan necesito', calculadora: true
};
// Antes de la 404, que no va al sitemap
PAGINAS.splice(PAGINAS.length - 1, 0, ...PAGINAS_SERVICIO, PAGINA_CALCULADORA);

/* --- Bloques generados ---------------------------------------------------- */

function tarjetasCategorias() {
  return CATEGORIAS.map((c) => `
        <a class="categoria" href="{{BASE}}menu/#${esc(c.id)}" data-reveal>
          <div class="foto foto--16-10">
            ${foto(archivoDe(c), 'tarjeta', `${c.nombre} en ${N.nombre}`)}
            <span class="categoria__icono" aria-hidden="true">${ico(c.icono, 'ico--l')}</span>
          </div>
          <div class="categoria__cuerpo">
            <h3>${esc(c.nombre)}</h3>
            <p>${esc(c.descripcion)}</p>
            <span class="categoria__enlace">Ver ${c.productos.length} productos ${ico('flecha', 'ico--desliza')}</span>
          </div>
        </a>`).join('\n');
}

function tarjetaProducto(p, { conBoton = true, insignia = false } = {}) {
  const buscar = `${p.nombre} ${p.descripcion} ${p.categoria || ''}`;
  const etiquetas = [
    p.encargo ? `<span class="etiqueta etiqueta--encargo">${ico('calendario')} Por encargo</span>` : '',
    insignia && !p.encargo ? `<span class="etiqueta etiqueta--favorito">${ico('estrella')} Favorito</span>` : ''
  ].filter(Boolean).join('');

  // El contador (− 2 +) lo crea app.js la primera vez que se agrega el
  // producto: son decenas de tarjetas por página y no hace falta enviarlo en
  // el HTML. Todos los productos van a la cotización: en este sitio no hay
  // precios, así que no hay nada que distinga «comprable» de «cotizable».
  const acciones = conBoton
    ? `<button class="btn btn--principal btn--compacto" type="button" data-agregar>${ico('mas')} Agregar a mi cotización</button>`
    : `<a class="btn btn--secundario btn--compacto" href="{{BASE}}encargos/#formulario">${ico('chat')} Pedir cotización</a>`;

  return `
          <article class="producto" data-producto data-id="${esc(p.id)}" data-nombre="${esc(p.nombre)}" data-unidad="${esc(p.unidad)}" data-buscar="${esc(buscar)}" data-reveal>
            <div class="foto foto--4-3">
              ${foto(archivoDe(p), 'tarjeta', `${p.nombre} en ${N.nombre}`)}
              ${etiquetas ? `<div class="foto__etiquetas">${etiquetas}</div>` : ''}
            </div>
            <div class="producto__cuerpo">
              <div class="producto__cabecera">
                <h3 class="producto__nombre">${esc(p.nombre)}</h3>
                <span class="producto__unidad">${esc(p.unidad)}</span>
              </div>
              <p class="producto__desc">${esc(p.descripcion)}</p>
              <div class="producto__pie">${acciones}
              </div>
            </div>
          </article>`;
}

function bloquePaquetes() {
  return PAQUETES.map((p) => tarjetaProducto(p)).join('');
}

/* Desvío al menudeo: lo que se vende por pieza no se cotiza acá, se pide en
   PedidosYa. Va en inicio, menú y contacto para que nadie escriba por
   WhatsApp pidiendo un pan francés. */
function bloquePedidosYa() {
  if (!N.redes.pedidosya) return '';
  return `
    <div class="desvio" data-reveal>
      <span class="desvio__ico" aria-hidden="true">${ico('bolsa', 'ico--l')}</span>
      <div class="desvio__texto">
        <h3>¿Buscás pan para hoy, por unidad?</h3>
        <p>
          Este sitio es para pedidos de eventos y actividades: docenas, paquetes, bandejas,
          cajas y panes. El pan por pieza y el café se piden en
          PedidosYa, con entrega inmediata.
        </p>
      </div>
      <a class="btn btn--principal" href="${N.redes.pedidosya}" rel="noopener nofollow">
        ${ico('bolsa')} Pedir en PedidosYa
      </a>
    </div>`;
}

function menuCompleto() {
  return CATEGORIAS.map((c) => `
      <section class="categoria-bloque" id="${esc(c.id)}" data-categoria-bloque="${esc(c.id)}" aria-labelledby="titulo-${esc(c.id)}">
        <h2 class="categoria-bloque__titulo" id="titulo-${esc(c.id)}"><span class="chapa" aria-hidden="true">${ico(c.icono, 'ico--l')}</span> ${esc(c.nombre)}</h2>
        <p>${esc(c.descripcion)}</p>
        <div class="rejilla rejilla--3">${c.productos.map((p) => tarjetaProducto({ ...p, categoria: c.nombre })).join('')}
        </div>
      </section>`).join('\n');
}

function botonesFiltro() {
  const botones = [`<button class="filtro" type="button" data-filtro="todas" aria-pressed="true">${ico('canasta')} Todo el menú</button>`]
    .concat(CATEGORIAS.map((c) =>
      `<button class="filtro" type="button" data-filtro="${esc(c.id)}" aria-pressed="false">${ico(c.icono)} ${esc(c.nombre)}</button>`));
  return botones.join('\n          ');
}

function destacados() {
  return todosLosProductos.filter((p) => p.destacado).slice(0, 8)
    .map((p) => tarjetaProducto(p, { insignia: true })).join('');
}

function bloqueFAQ(lista = FAQ) {
  return lista.map((f) => `
          <details data-reveal>
            <summary>${esc(f.p)}<span class="faq__signo" aria-hidden="true">${ico('chevron')}</span></summary>
            <div>${esc(f.r)}</div>
          </details>`).join('');
}

function bloqueZonas() {
  return N.cobertura.map((g) => `
            <li class="zonas__grupo">
              <span class="zonas__municipio">${ico('pin')} ${esc(g.municipio)}</span>
              <span class="zonas__lista">${g.zonas.map((z) => `<span class="zonas__zona">${esc(z)}</span>`).join('')}</span>
            </li>`).join('');
}

function bloqueHorarios() {
  return N.horarios.map((h) =>
    `<li><span>${ico('reloj')} ${esc(h.etiqueta)}</span><span>${h.cerrado ? 'Cerrado' : `${esc(h.abre)} – ${esc(h.cierra)}`}</span></li>`).join('\n            ');
}

function opcionesProducto() {
  return CATEGORIAS.map((c) =>
    `<optgroup label="${esc(c.nombre)}">${c.productos.map((p) => `<option value="${esc(p.nombre)}">${esc(p.nombre)}</option>`).join('')}</optgroup>`
  ).join('\n              ');
}

/* Zonas de entrega para el <select> del formulario: la cobertura es una lista
   cerrada, así que el cliente elige en vez de escribir una zona a la que no se
   llega. El valor lleva el municipio para que el mensaje de WhatsApp no sea
   ambiguo ("Zona 11" existe en la capital y en Mixco).                  */
function opcionesZona() {
  return N.cobertura.map((g) =>
    `<optgroup label="${esc(g.municipio)}">${g.zonas.map((z) =>
      `<option value="${esc(`${z}, ${g.municipio}`)}">${esc(z)}</option>`).join('')}</optgroup>`
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
    paymentAccepted: 'Efectivo, Tarjeta de crédito, Transferencia bancaria',
    servesCuisine: ['Panadería', 'Café'],
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
    openingHoursSpecification: N.horarios.filter((h) => !h.cerrado).map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.dias.map((d) => `https://schema.org/${d}`),
      opens: h.abre,
      closes: h.cierra
    })),
    // Solo lo que está en negocio.json → cobertura, con su municipio real
    areaServed: N.cobertura.map((g) => ({ '@type': 'City', name: `${g.municipio}, Guatemala` }))
      .concat(ZONAS.map((z) => ({ '@type': 'Place', name: `${z.zona}, ${z.municipio}` }))),
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
      name: pagina.miga || (pagina.nav === 'menu' ? 'Menú' : pagina.nav === 'encargos' ? 'Encargos' : 'Contacto'),
      item: `${DOMINIO}${pagina.ruta}`
    });
  }
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items };
}

function schemaFAQ(lista = FAQ) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: lista.map((f) => ({
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
    hasMenuSection: CATEGORIAS.map((c) => ({
      '@type': 'MenuSection',
      name: c.nombre,
      description: c.descripcion,
      hasMenuItem: c.productos.map((p) => ({
        '@type': 'MenuItem',
        name: p.nombre,
        description: p.descripcion
      }))
    }))
  };
}

function schemaServicioEncargos() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Pedidos de pan y bocadillos por encargo',
    serviceType: 'Panadería por encargo para eventos y empresas',
    provider: { '@id': ID_NEGOCIO },
    areaServed: N.cobertura.map((g) => ({ '@type': 'City', name: `${g.municipio}, Guatemala` })),
    availableChannel: {
      '@type': 'ServiceChannel',
      serviceUrl: `${DOMINIO}/encargos/`,
      servicePhone: N.telefonoE164
    }
  };
}

function schemasDe(pagina) {
  const lista = [schemaNegocio(), schemaSitio(), schemaMigas(pagina)];
  if (pagina.nav === 'inicio') lista.push(schemaFAQ());
  if (pagina.nav === 'menu') lista.push(schemaMenu());
  if (pagina.nav === 'encargos') lista.push(schemaServicioEncargos());
  if (pagina.servicio) {
    lista.push(schemaServicio(pagina.servicio));
    lista.push(schemaFAQ(resolverFAQ(pagina.servicio.faq)));
  }
  if (pagina.calculadora) lista.push(schemaFAQ(resolverFAQ(SERV.calculadora.faq)));
  if (pagina.nav === 'contacto') {
    lista.push({
      '@context': 'https://schema.org', '@type': 'ContactPage',
      url: `${DOMINIO}/contacto/`, mainEntity: { '@id': ID_NEGOCIO }
    });
  }
  return lista;
}

/* --- Layout --------------------------------------------------------------- */

/* Precarga la foto grande del hero: es el LCP del inicio. Se precarga la
   variante que el navegador va a elegir de verdad, no el original. */
function preloadHero(base) {
  const ext = path.extname(IMG_GENERICA);
  const raiz = IMG_GENERICA.slice(0, IMG_GENERICA.length - ext.length);
  const webp = `${raiz}.webp`;
  const usa = existeImg(webp) ? webp : IMG_GENERICA;
  const tipo = usa.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
  const chica = `${raiz}-400${usa.endsWith('.webp') ? '.webp' : ext}`;
  // Las dimensiones se leen del JPEG: dimensionesDe() sabe de PNG y JPEG, y
  // el .webp sale del mismo original, así que mide lo mismo.
  const ancho = dimensionesDe(IMG_GENERICA).w;
  const srcset = existeImg(chica)
    ? ` imagesrcset="${base}assets/img/${chica} 400w, ${base}assets/img/${usa} ${ancho}w" imagesizes="${SIZES.hero}"`
    : '';
  return `<link rel="preload" as="image" type="${tipo}" href="${base}assets/img/${usa}"${srcset} fetchpriority="high">`;
}

function cabeza(pagina) {
  const base = '../'.repeat(pagina.profundidad);
  const url = `${DOMINIO}${pagina.ruta}`;
  // Imagen para compartir: 1200×630, la medida que esperan WhatsApp, Facebook
  // y X. Antes iba el logo cuadrado con transparencia y salía recortado sobre
  // fondo negro justo en el enlace que más se pega por WhatsApp.
  const og = `${DOMINIO}/assets/img/${existeImg(OG_IMAGEN) ? OG_IMAGEN : 'logo-cefas.png'}`;
  const ogAlto = existeImg(OG_IMAGEN) ? dimensionesDe(OG_IMAGEN) : null;
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
${ogAlto ? `<meta property="og:image:width" content="${ogAlto.w}">
<meta property="og:image:height" content="${ogAlto.h}">
<meta property="og:image:type" content="image/jpeg">` : ''}
<meta property="og:image:alt" content="Pan y bocadillos para eventos de ${esc(N.nombre)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(pagina.titulo)}">
<meta name="twitter:description" content="${esc(pagina.descripcion)}">
<meta name="twitter:image" content="${og}">

<link rel="alternate" hreflang="es-gt" href="${url}">
<link rel="alternate" hreflang="x-default" href="${url}">

<link rel="icon" type="image/png" sizes="192x192" href="${base}assets/img/${LOGO_UI}">
<link rel="apple-touch-icon" href="${base}assets/img/${LOGO_UI}">
<link rel="manifest" href="${base}manifest.webmanifest">

<!-- Tipografías autohospedadas: las declara assets/css/estilos.css. Antes
     venían de fonts.googleapis.com, que añadía dos conexiones TLS al camino
     crítico. Se precargan los dos subconjuntos latinos, los únicos que usa
     el español. -->
<link rel="preload" as="font" type="font/woff2" href="${base}assets/fonts/fraunces-latin.woff2" crossorigin>
<link rel="preload" as="font" type="font/woff2" href="${base}assets/fonts/inter-latin.woff2" crossorigin>
<link rel="stylesheet" href="${base}assets/css/estilos.css">
${pagina.nav === 'inicio' ? preloadHero(base) : ''}

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
      <img src="${base}assets/img/${LOGO_UI}" alt="Logo de ${esc(N.nombre)}" width="44" height="44">
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
  if (N.redes.threads) redes.push(enlaceRed(N.redes.threads, 'chat', 'Threads'));
  if (N.redes.youtube) redes.push(enlaceRed(N.redes.youtube, 'flecha', 'YouTube'));
  if (N.redes.pedidosya) redes.push(enlaceRed(N.redes.pedidosya, 'bolsa', 'PedidosYa', 'noopener nofollow'));

  return `
<footer class="pie">
  <div class="contenedor">
    <div class="pie__grid">
      <div class="pie__marca">
        <img src="${base}assets/img/${LOGO_UI}" alt="Logo de ${esc(N.nombre)}" width="56" height="56" loading="lazy">
        <p>${esc(N.descripcionCorta)}</p>
      </div>

      <div>
        <h3>Menú</h3>
        <ul>
          ${CATEGORIAS.slice(0, 5).map((c) => `<li><a href="${base}menu/#${esc(c.id)}">${esc(c.nombre)}</a></li>`).join('\n          ')}
          <li><a href="${base}menu/">Ver menú completo</a></li>
        </ul>
      </div>

      <div>
        <h3>Pedidos</h3>
        <ul>
          <li><a href="${base}encargos/">${ico('caja')} Pedidos por encargo</a></li>
          ${enlacesServicios(base)}
          <li><a href="${base}cuanto-pan/">${ico('check')} ¿Cuánto pan necesito?</a></li>
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
      <span>&copy; <span data-anio>2026</span> ${esc(N.nombre)}. Guatemala zona 6.</span>
      <span>Pan y bocadillos por encargo para eventos y empresas.</span>
    </div>
  </div>
</footer>

<a class="wa-flotante" href="https://wa.me/${esc(N.whatsapp)}?text=${encodeURIComponent('¡Hola Cefas Panadería! Quiero cotizar un encargo.')}" rel="noopener" aria-label="Escribinos por WhatsApp">
  ${ico('whatsapp')}
  <span class="wa-flotante__texto">Pedir por WhatsApp</span>
</a>`;
}

/* Barra fija de cotización para móvil. */
function barraVenta() {
  return `
<div class="barra-venta" data-barra-venta hidden>
  <div class="barra-venta__info">
    <span><span data-carrito-unidades>0</span> en tu cotización</span>
  </div>
  <button class="btn btn--wa" type="button" data-carrito-abrir>
    ${ico('canasta')} Ver mi cotización
  </button>
</div>`;
}

function panelCarrito(pagina) {
  const base = '../'.repeat(pagina.profundidad);
  return `
<div class="velo" data-velo hidden></div>
<aside class="panel" data-panel hidden role="dialog" aria-modal="true" aria-label="Mi cotización">
  <div class="panel__cabecera">
    <h2>${ico('canasta')} Mi cotización</h2>
    <button class="panel__cerrar" type="button" data-panel-cerrar aria-label="Cerrar el panel de cotización">${ico('cerrar')}</button>
  </div>
  <div class="panel__cuerpo" data-carrito-cuerpo>
    <p class="carrito-vacio" data-carrito-vacio>
      <span class="carrito-vacio__ico" aria-hidden="true">${ico('canasta', 'ico--xl')}</span>
      Todavía no agregaste nada.<br>
      <a href="${base}menu/">Explorá el menú</a> y armá tu cotización.
    </p>
  </div>
  <div class="panel__pie">
    <p class="panel__nota">Te confirmamos la cotización final y la hora de entrega por WhatsApp.</p>
    <p class="panel__nota panel__enviado" data-enviado hidden>${ico('check')} Se abrió WhatsApp con tu lista. Cuando la hayas enviado, podés vaciarla para empezar otra.</p>
    <button class="btn btn--wa btn--bloque" type="button" data-enviar-wa disabled>${ico('whatsapp')} Pedir cotización por WhatsApp</button>
    <p class="panel__vaciar"><button class="btn btn--texto" type="button" data-vaciar>Vaciar la cotización</button></p>
  </div>
</aside>`;
}

/* --- Páginas de servicio y calculadora ------------------------------------ */

const PRODUCTO_POR_ID = new Map(todosLosProductos.map((p) => [p.id, p]));

function productosDe(ids, contexto) {
  return ids.map((id) => {
    const p = PRODUCTO_POR_ID.get(id);
    if (!p) console.warn(`  ⚠ ${contexto}: el producto "${id}" no existe o es de menudeo`);
    return p;
  }).filter(Boolean);
}

function schemaServicio(s) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: s.h1,
    serviceType: s.nombre,
    description: s.descripcion,
    url: `${DOMINIO}/${s.id}/`,
    image: `${DOMINIO}/assets/img/${archivoDe(s)}`,
    provider: { '@id': ID_NEGOCIO },
    areaServed: N.cobertura.map((g) => ({ '@type': 'City', name: `${g.municipio}, Guatemala` })),
    availableChannel: {
      '@type': 'ServiceChannel',
      serviceUrl: `${DOMINIO}/encargos/`,
      servicePhone: N.telefonoE164
    }
  };
}

function varsServicio(s) {
  const productos = productosDe(s.productos, s.id);
  return {
    SERVICIO_NOMBRE: esc(s.nombre),
    SERVICIO_NOMBRE_MIN: esc(s.nombre.charAt(0).toLowerCase() + s.nombre.slice(1)),
    SERVICIO_EYEBROW: esc(s.eyebrow),
    SERVICIO_ICONO: `{{ico:${s.icono}}}`,          // lo resuelve la segunda pasada
    SERVICIO_H1: esc(s.h1),
    SERVICIO_INTRO: esc(s.intro),
    SERVICIO_PARA_QUIEN: esc(s.paraQuien),
    SERVICIO_INCLUYE: s.incluye.map((t) => `<li>{{ico:check}} <span>${esc(t)}</span></li>`).join('\n          '),
    SERVICIO_DATOS: s.datos.map((d) =>
      `<div><span class="confianza__ico" aria-hidden="true">{{ico:${d.icono}}}</span><strong>${esc(d.valor)}</strong><span>${esc(d.etiqueta)}</span></div>`
    ).join('\n    '),
    SERVICIO_PRODUCTOS: productos.map((p) => tarjetaProducto(p)).join(''),
    SERVICIO_FAQ: bloqueFAQ(resolverFAQ(s.faq)),
    SERVICIO_FOTO: foto(archivoDe(s), 'ancha', s.alt || s.nombre, { prioridad: true }),
    SERVICIO_WA: `https://wa.me/${esc(N.whatsapp)}?text=${encodeURIComponent(s.whatsapp)}`
  };
}

/* La calculadora recibe las reglas ya cruzadas con el catálogo: nombre,
   unidad, piezas por unidad y foto de cada producto, para que app.js pueda
   sugerir cantidades y pasarlas a la cotización sin volver a consultar. */
function varsCalculadora(base) {
  const C = SERV.calculadora;
  const tipos = C.tipos.map((t) => ({
    id: t.id,
    nombre: t.nombre,
    minimo: t.minimo || 1,
    lineas: productosDe(t.lineas.map((l) => l.producto), `calculadora/${t.id}`).map((p) => {
      const regla = t.lineas.find((l) => l.producto === p.id);
      return {
        id: p.id, nombre: p.nombre, unidad: p.unidad,
        piezas: piezasPorUnidad(p.unidad) || 1,
        porPersona: regla.porPersona,
        img: `${base}assets/img/${archivoDe(p)}`
      };
    })
  }));
  return {
    CALC_H1: esc(C.h1),
    CALC_DATOS: jsonld(tipos),
    CALC_OPCIONES: C.tipos.map((t) => `<option value="${esc(t.id)}">${esc(t.nombre)}</option>`).join('\n            '),
    CALC_REGLAS: C.tipos.map((t) => `<li>{{ico:check}} <span><strong>${esc(t.nombre)}:</strong> ${esc(t.descripcion)}</span></li>`).join('\n        '),
    CALC_FAQ: bloqueFAQ(resolverFAQ(C.faq))
  };
}

function varsExtra(pagina, base) {
  if (pagina.servicio) return varsServicio(pagina.servicio);
  if (pagina.calculadora) return varsCalculadora(base);
  return {};
}

/* Enlaces a los servicios para el pie */
function enlacesServicios(base) {
  return SERV.servicios.map((s) =>
    `<li><a href="${base}${esc(s.id)}/">${ico(s.icono)} ${esc(s.nombre)}</a></li>`).join('\n          ');
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
    ANTICIPACION: String(N.anticipacionEncargoHoras),
    ENTREGA_SOLO: esc(N.entregaSolo),
    COBERTURA_RESUMEN: esc(N.coberturaResumen),
    TOTAL_MUNICIPIOS: String(N.cobertura.length),
    TOTAL_PRODUCTOS: String(todosLosProductos.length),
    TOTAL_CATEGORIAS: String(CATEGORIAS.length),
    TOTAL_ZONAS: String(ZONAS.length),
    CATEGORIAS_TARJETAS: tarjetasCategorias(),
    MENU_COMPLETO: menuCompleto(),
    FILTROS: botonesFiltro(),
    DESTACADOS: destacados(),
    PAQUETES: bloquePaquetes(),
    PEDIDOSYA_BLOQUE: bloquePedidosYa(),
    FAQ: bloqueFAQ(),
    ZONAS: bloqueZonas(),
    ZONAS_TEXTO: esc(ZONAS_TEXTO),
    HORARIOS: bloqueHorarios(),
    OPCIONES_PRODUCTO: opcionesProducto(),
    OPCIONES_ZONA: opcionesZona(),
    LOGO_UI: `${base}assets/img/${LOGO_UI}`,
    ...varsExtra(pagina, base),
    IMG_GENERICA: `${base}assets/img/${IMG_GENERICA}`
  };

  let salida = html;
  // Dos pasadas: los bloques generados también contienen {{BASE}} y {{ico:…}}
  for (let i = 0; i < 2; i++) {
    // {{ico:nombre}} → <svg><use href="#i-nombre"></svg>
    salida = salida.replace(/\{\{ico:([\w-]+)(?::([\w -]+))?\}\}/g, (_, nombre, clase) => ico(nombre, clase));
    // {{foto:archivo.jpg|contexto|texto alternativo}} (|alta para el LCP)
    salida = salida.replace(
      /\{\{foto:([^|}]+)\|([^|}]+)\|([^|}]+?)(?:\|(alta))?\}\}/g,
      (_, archivo, contexto, alt, alta) => foto(archivo.trim(), contexto.trim(), alt.trim(), { prioridad: !!alta })
    );
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

/* Sin JavaScript no hay lista de cotización: los botones de las tarjetas no
   hacen nada. Se avisa arriba y se manda directo a WhatsApp.            */
function noscript() {
  return `<noscript><p class="aviso-noscript">Esta página arma tu cotización con JavaScript. Si lo tenés desactivado, escribinos directo por <a href="https://wa.me/${esc(N.whatsapp)}" rel="noopener">WhatsApp</a> al ${esc(N.telefono)}.</p></noscript>`;
}

/* Fotos que muestra una página, para el sitemap de imágenes: los JPEG
   grandes, sin variantes de 400, sin la OG y sin el logo. */
function fotosDe(html) {
  const vistas = new Set();
  for (const m of html.matchAll(/src="(?:\.\.\/)*assets\/img\/([\w-]+\.jpg)"/g)) {
    if (!/-400\.jpg$/.test(m[1]) && m[1] !== OG_IMAGEN) vistas.add(m[1]);
  }
  return [...vistas];
}

/* Devuelve las fotos de la página, que el sitemap necesita después. */
function construirPagina(pagina) {
  const cuerpo = fs.readFileSync(path.join(RAIZ, 'plantillas', pagina.plantilla), 'utf8');
  const base = '../'.repeat(pagina.profundidad);

  const contenido = [
    cabecera(pagina),
    '<main id="contenido">',
    sustituir(cuerpo, pagina).trim(),
    '</main>',
    pie(pagina),
    barraVenta(),
    panelCarrito(pagina)
  ].join('\n');

  // Sólo los iconos que esta página usa de verdad. "mas" y "menos" van
  // siempre: los pone app.js al crear el contador (− n +) de cada tarjeta.
  const iconos = new Set(['mas', 'menos']);
  for (const m of contenido.matchAll(/href="#i-([\w-]+)"/g)) iconos.add(m[1]);

  const html = [
    cabeza(pagina),
    `<body data-whatsapp="${esc(N.whatsapp)}" data-anticipacion="${esc(N.anticipacionEncargoHoras)}" data-horarios="${esc(HORARIOS_DATA)}">`,
    sprite([...iconos]),
    noscript(),
    contenido,
    `<script src="${base}assets/js/app.js" defer></script>`,
    '</body>',
    '</html>',
    ''
  ].join('\n');

  escribir(pagina.archivo, html);
  return fotosDe(html);
}

/* El sitemap lleva también las fotos de cada página (extensión de imágenes
   de Google): para una panadería, Google Imágenes es un canal real. */
function construirSitemap(fotosPorPagina) {
  const urls = PAGINAS.filter((p) => p.prioridad).map((p) => {
    const fotos = (fotosPorPagina.get(p.archivo) || []).map((f) => `
    <image:image><image:loc>${DOMINIO}/assets/img/${f}</image:loc></image:image>`).join('');
    return `  <url>
    <loc>${DOMINIO}${p.ruta}</loc>
    <lastmod>${LASTMOD}</lastmod>
    <changefreq>${p.nav === 'menu' ? 'weekly' : 'monthly'}</changefreq>
    <priority>${p.prioridad}</priority>${fotos}
  </url>`;
  }).join('\n');

  escribir('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
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
      { src: `assets/img/${LOGO}`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `assets/img/${LOGO_MASKABLE}`, sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  }, null, 2) + '\n');
}

/* --- Main ----------------------------------------------------------------- */

console.log(`\nGenerando ${N.nombre} → ${DOMINIO}\n`);
const fotosPorPagina = new Map();
PAGINAS.forEach((p) => fotosPorPagina.set(p.archivo, construirPagina(p)));
construirSitemap(fotosPorPagina);
construirRobots();
construirManifest();
escribir('.nojekyll', '');

const MENUDEO = CAT.categorias.reduce((n, c) => n + c.productos.filter((p) => p.minorista).length, 0);
if (CATEGORIAS_VACIAS.length) {
  console.log(`\n  ⚠ sin productos de eventos, no se publican: ${CATEGORIAS_VACIAS.join(', ')}`);
}
console.log(`\n${CATEGORIAS.length} categorías · ${todosLosProductos.length} productos de eventos` +
  ` · ${MENUDEO} de menudeo van por PedidosYa · listo.\n`);
