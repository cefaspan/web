#!/usr/bin/env node
/* Verificación del sitio generado: SEO, enlaces, accesibilidad y datos estructurados.
   Uso: node herramientas/verificar.js                                              */
'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const SERV = JSON.parse(fs.readFileSync(path.join(RAIZ, 'datos/servicios.json'), 'utf8'));
const N = JSON.parse(fs.readFileSync(path.join(RAIZ, 'datos/negocio.json'), 'utf8'));
const RUTA_BASE = (N.rutaBase || '').replace(/\/$/, '');
const PAGINAS = [
  'index.html', 'menu/index.html', 'encargos/index.html', 'contacto/index.html',
  ...SERV.servicios.map((s) => `${s.id}/index.html`),
  'cuanto-pan/index.html',
  '404.html'
];

let errores = 0;
let avisos = 0;
const fallo = (m) => { console.log(`  ✗ ${m}`); errores++; };
const aviso = (m) => { console.log(`  ! ${m}`); avisos++; };
const ok = (m) => console.log(`  ✓ ${m}`);

function comprobarPagina(rel) {
  console.log(`\n── ${rel}`);
  const html = fs.readFileSync(path.join(RAIZ, rel), 'utf8');

  // 1. Plantilla completamente resuelta
  const pendientes = html.match(/\{\{[^}]+\}\}|\{zonas\}/g);
  if (pendientes) fallo(`variables sin resolver: ${[...new Set(pendientes)].join(', ')}`);
  else ok('sin variables de plantilla pendientes');

  // 2. Etiquetas SEO obligatorias
  const titulo = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1];
  const canon = (html.match(/<link rel="canonical" href="([^"]*)"/) || [])[1];

  if (!titulo) fallo('falta <title>');
  else if (titulo.length > 62) aviso(`title de ${titulo.length} caracteres (Google corta cerca de 60)`);
  else ok(`title (${titulo.length} car.): ${titulo}`);

  if (!desc) fallo('falta meta description');
  else if (desc.length < 110 || desc.length > 165) aviso(`meta description de ${desc.length} caracteres (ideal 120-160)`);
  else ok(`meta description (${desc.length} car.)`);

  if (!canon) fallo('falta canonical'); else ok(`canonical: ${canon}`);
  if (!/lang="es-GT"/.test(html)) fallo('falta lang="es-GT"');
  if (!/property="og:image"/.test(html)) fallo('falta og:image');
  if (!/name="viewport"/.test(html)) fallo('falta viewport');

  // 3. Un único H1
  const h1 = html.match(/<h1[^>]*>/g) || [];
  if (h1.length !== 1) fallo(`hay ${h1.length} etiquetas <h1> (debe haber exactamente 1)`);
  else ok('un único <h1>');

  // 4. Imágenes con alt
  const imgs = html.match(/<img\b[^>]*>/g) || [];
  const sinAlt = imgs.filter((i) => !/\balt=/.test(i));
  if (sinAlt.length) fallo(`${sinAlt.length} <img> sin atributo alt`);
  else ok(`${imgs.length} imágenes, todas con alt`);

  // 5. Datos estructurados válidos
  const bloques = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (!bloques.length) fallo('sin datos estructurados JSON-LD');
  const tipos = [];
  bloques.forEach((b, i) => {
    try {
      const datos = JSON.parse(b[1]);
      tipos.push(datos['@type']);
    } catch (e) { fallo(`JSON-LD #${i + 1} inválido: ${e.message}`); }
  });
  if (tipos.length) ok(`JSON-LD válido: ${tipos.join(', ')}`);

  // 6. Todo recurso local existe: enlaces, imágenes, srcset, CSS y fuentes.
  //    Un nombre mal escrito dentro de un srcset no da ningún error visible,
  //    así que se comprueban también las variantes de cada foto.
  const referencias = new Set();
  for (const m of html.matchAll(/\s(?:src|href)="([^"]+)"/g)) referencias.add(m[1]);
  for (const m of html.matchAll(/\s(?:srcset|imagesrcset)="([^"]+)"/g)) {
    for (const parte of m[1].split(',')) referencias.add(parte.trim().split(/\s+/)[0]);
  }
  const locales = [...referencias]
    .filter((r) => r && !/^(https?:|mailto:|tel:|data:|#)/.test(r));

  const dirPagina = path.dirname(path.join(RAIZ, rel));
  const rotos = locales.filter((h) => {
    const limpio = h.split('#')[0].split('?')[0];
    if (!limpio) return false;
    // Las rutas absolutas (sólo el 404 las usa) cuelgan de rutaBase, no de la página
    let destino = limpio.startsWith('/')
      ? path.join(RAIZ, limpio.startsWith(RUTA_BASE + '/') ? limpio.slice(RUTA_BASE.length) : limpio)
      : path.resolve(dirPagina, limpio);
    if (limpio.endsWith('/')) destino = path.join(destino, 'index.html');
    return !fs.existsSync(destino);
  });
  if (rotos.length) fallo(`recursos locales que no existen: ${[...new Set(rotos)].join(', ')}`);
  else ok(`${locales.length} recursos locales, todos resuelven`);

  // 7. Anclas de categoría existentes (enlaces #id dentro del propio sitio)
  const anclasMenu = [...html.matchAll(/href="[^"]*menu\/#([\w-]+)"/g)].map((m) => m[1]);
  if (anclasMenu.length) {
    const menuHtml = fs.readFileSync(path.join(RAIZ, 'menu/index.html'), 'utf8');
    const faltan = [...new Set(anclasMenu)].filter((a) => !menuHtml.includes(`id="${a}"`));
    if (faltan.length) fallo(`anclas inexistentes en el menú: ${faltan.join(', ')}`);
    else ok(`${new Set(anclasMenu).size} anclas del menú válidas`);
  }

  // 8. Ningún precio de producto publicado
  /* En este sitio todo se cotiza: ni las tarjetas, ni los atributos data-*, ni
     el JSON-LD, ni el texto llevan el precio de un producto, porque ahí los lee
     Google y los ve cualquiera en el inspector. La única excepción es el
     priceRange del negocio —la horquilla de una cotización típica, que Search
     Console pide para la ficha—, así que se descuenta antes de rastrear.  */
  const sinRango = html.replace(/"(?:priceRange|currenciesAccepted)"\s*:\s*"[^"]*"/g, '');
  const rastrosDePrecio = [
    [/data-precio=/, 'atributo data-precio en una tarjeta'],
    [/data-moneda=/, 'atributo data-moneda en el <body>'],
    [/"price(?:Currency)?"\s*:/, 'price / priceCurrency en el JSON-LD'],
    [/\bQ\s?\d/, 'un precio en quetzales en el texto'],
    [/class="[^"]*(?:producto__precio|panel__total|carrito-btn__total)/, 'marcado de precio heredado']
  ];
  const conPrecio = rastrosDePrecio.filter(([re]) => re.test(sinRango));
  if (conPrecio.length) conPrecio.forEach(([, que]) => fallo(`precio publicado: ${que}`));
  else ok('sin precios publicados');

  // 9. Fotos responsivas y tipografías propias
  const conSrcset = (html.match(/<img\b[^>]*\bsrcset=/g) || []).length;
  const fotos = (html.match(/<img\b[^>]*assets\/img\/[^>]*>/g) || [])
    .filter((i) => !/logo-cefas/.test(i)).length;   // cualquier variante del logo
  if (fotos && !conSrcset) aviso(`${fotos} fotos sin srcset (pasá node herramientas/optimizar-imagenes.js --aplicar)`);
  else if (fotos) ok(`${conSrcset} de ${fotos} fotos con srcset`);

  // Se busca una referencia de recurso, no la simple mención del dominio: el
  // comentario de la cabecera lo nombra para explicar por qué ya no se usa.
  if (/(?:href|src)="https?:\/\/fonts\.(?:googleapis|gstatic)\.com/.test(html)) {
    fallo('la página sigue pidiendo tipografías a Google Fonts');
  }

  // 10. Peso
  const kb = Buffer.byteLength(html, 'utf8') / 1024;
  if (kb > 150) aviso(`página de ${kb.toFixed(0)} KB (considerá aligerarla)`);

  // 11. «Un solo botón principal». Un botón sólido (principal, claro, oscuro
  //     o wa; grande o no, con las clases en cualquier orden) sólo puede ser de
  //     cotizar o de armar la cotización. Lo demás va de contorno o como enlace.
  //     La lista es exacta a propósito: un texto nuevo obliga a decidirlo aquí.
  const SOLIDOS = ['btn--principal', 'btn--claro', 'btn--oscuro', 'btn--wa'];
  const BOTONES_PERMITIDOS = /^(?:Cotizar por WhatsApp|Pedir cotización por WhatsApp|Enviar mi encargo por WhatsApp|Llenar el formulario|Agregar a mi cotización|Agregar todo a mi cotización|Coordinar por WhatsApp)$/;
  const ajenos = [...html.matchAll(/<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/g)]
    .filter((m) => {
      const clases = ((m[2].match(/\bclass="([^"]*)"/) || [])[1] || '').split(/\s+/);
      return clases.includes('btn') && clases.some((c) => SOLIDOS.includes(c));
    })
    .map((m) => m[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
    .filter((t) => !BOTONES_PERMITIDOS.test(t) && !(rel === '404.html' && t === 'Ver el menú'));
  // Con el inicio corto ya no queda ninguno: desde aquí es error, no aviso.
  if (ajenos.length) fallo(`botón sólido que no es de cotizar: «${[...new Set(ajenos)].join('», «')}» (usá uno de contorno o un enlace)`);

  //     Un mismo trato en todo el sitio: el sitio habla de vos. Las reseñas
  //     (<blockquote>) son palabras del cliente y no se miran. Sólo se buscan
  //     formas que no pueden ser otra cosa que tú (quieres ≠ querés, escríbenos
  //     ≠ escribinos). «Elige», «pide», «agrega» o «llena» no se buscan: son
  //     también tercera persona («la mayoría elige…») y darían avisos falsos.
  const texto = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<blockquote[\s\S]*?<\/blockquote>/g, ' ')
    .replace(/<[^>]+>/g, ' ');
  const tuteo = texto.match(/(?<!\p{L})(?:tú|quieres|tienes|necesitas|puedes|prefieres|eliges|pides|sabes|vienes|escríbenos|cuéntanos|llámanos|pídenos|avísanos|pídelo|pídela|agrégalo|agrégala|llénalo|revísalo)(?!\p{L})/giu);
  if (tuteo) aviso(`tuteo en un sitio que habla de vos: ${[...new Set(tuteo)].join(', ')}`);
}

// El inicio no crece: «si se agrega algo, que sea reemplazando, no sumando».
// Se cuentan los bloques de primer nivel dentro de <main>, sea cual sea su
// etiqueta (section, div, aside, nav, figure…): reescribir un bloque como <div>
// no lo esconde. Hoy son 8: portada, tira de categorías, servicios, lo más
// pedido, reseñas, cómo pedir, preguntas y cierre. Para sumar un bloque hay que
// quitar otro; subir este número tiene que ser una decisión a propósito.
const MAX_BLOQUES_INICIO = 8;
const VACIAS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
function bloquesDeMain(html) {
  const main = (html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/) || [])[1] || '';
  const limpio = main.replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|template)\b[\s\S]*?<\/\1>/g, '<$1></$1>');
  const bloques = [];
  let nivel = 0;
  for (const m of limpio.matchAll(/<(\/?)([a-zA-Z][\w-]*)\b[^>]*?(\/?)>/g)) {
    const [, cierra, tag, auto] = m;
    const t = tag.toLowerCase();
    if (VACIAS.has(t) || auto) { if (!nivel && !cierra) bloques.push(t); continue; }
    if (cierra) { nivel--; continue; }
    if (!nivel) bloques.push(t);
    nivel++;
  }
  return bloques;
}

console.log('Verificando el sitio generado…');
PAGINAS.forEach(comprobarPagina);

console.log('\n── inicio corto');
const bloquesInicio = bloquesDeMain(fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8'));
if (bloquesInicio.length > MAX_BLOQUES_INICIO) {
  fallo(`el inicio tiene ${bloquesInicio.length} bloques (tope ${MAX_BLOQUES_INICIO}): reemplazá uno en vez de sumar otro`);
} else ok(`inicio con ${bloquesInicio.length} bloques (tope ${MAX_BLOQUES_INICIO}): ${bloquesInicio.join(', ')}`);

// --- Archivos de soporte ---------------------------------------------------
console.log('\n── archivos de soporte');
['sitemap.xml', 'robots.txt', 'manifest.webmanifest', '.nojekyll', 'assets/css/estilos.css',
 'assets/js/app.js', 'assets/img/logo-cefas.png', 'assets/img/logo-cefas-192.png',
 'assets/img/logo-cefas-maskable.png', 'assets/img/og-cefas.jpg',
 'assets/fonts/bricolage-latin.woff2', 'assets/fonts/inter-latin.woff2',
 'assets/fonts/bricolage-latin-ext.woff2', 'assets/fonts/inter-latin-ext.woff2'].forEach((f) => {
  if (fs.existsSync(path.join(RAIZ, f))) ok(f);
  else fallo(`falta ${f}`);
});

const sitemap = fs.readFileSync(path.join(RAIZ, 'sitemap.xml'), 'utf8');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const fotosSitemap = [...sitemap.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map((m) => m[1]);
ok(`sitemap con ${locs.length} URLs y ${fotosSitemap.length} imágenes`);
if (!fotosSitemap.length) aviso('el sitemap no lleva imágenes: ¿las páginas no tienen fotos?');
// Las fotos del sitemap tienen que existir: Google penaliza los 404 en el sitemap
// Se quita rutaBase («/web»), no «el primer directorio»: con dominio propio
// (rutaBase "/") la regla anterior cortaba «assets/» y todo salía roto.
const fotosRotas = fotosSitemap.filter((u) => {
  let ruta = decodeURIComponent(new URL(u).pathname);
  if (RUTA_BASE && ruta.startsWith(RUTA_BASE + '/')) ruta = ruta.slice(RUTA_BASE.length);
  return !fs.existsSync(path.join(RAIZ, ruta));
});
if (fotosRotas.length) fallo(`imágenes del sitemap que no existen: ${fotosRotas.join(', ')}`);
const lastmods = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
if (lastmods.some((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d))) fallo('lastmod con formato inválido en el sitemap');
try { JSON.parse(fs.readFileSync(path.join(RAIZ, 'manifest.webmanifest'), 'utf8')); ok('manifest válido'); }
catch (e) { fallo(`manifest inválido: ${e.message}`); }

// --- Datos pendientes de configurar ---------------------------------------
console.log('\n── datos del negocio pendientes');
if (/0000/.test(N.telefono) || /0000/.test(N.whatsapp)) aviso('teléfono / WhatsApp sigue siendo un valor de ejemplo');
if (/PENDIENTE/i.test(N.direccion.calle)) aviso('la dirección exacta sigue pendiente');
if (!N.direccion.ciudad) fallo('datos/negocio.json → direccion.ciudad vacío: addressLocality sale en blanco');
// No se comprueba redes.googleMaps: el negocio es una cocina de producción sin
// local a la calle, así que a propósito no se publica dirección exacta ni mapa.
for (const clave of ['moneda', 'simboloMoneda']) {
  if (N[clave] !== undefined) fallo(`datos/negocio.json → sobra "${clave}": en este sitio no hay precios`);
}

const P = JSON.parse(fs.readFileSync(path.join(RAIZ, 'datos/productos.json'), 'utf8'));
if (P._nota && /PLACEHOLDER/i.test(P._nota)) aviso('el catálogo sigue marcado como PLACEHOLDER (nombres y descripciones de ejemplo)');

const conPrecio = P.categorias.flatMap((c) => c.productos).filter((p) => p.precio !== undefined);
if (conPrecio.length) fallo(`${conPrecio.length} producto(s) con campo "precio" en datos/productos.json: acá no se publican precios`);
else ok('ningún producto trae precio');

// La lista de zonas de la FAQ se rellena desde cobertura con {zonas}. Si
// alguien la vuelve a escribir a mano, se desincroniza sin avisar.
const zonasSueltas = (P.faq || []).filter((f) => /\bzonas?\s+\d/i.test(f.r) && !/\{zonas\}/.test(f.r));
if (zonasSueltas.length) {
  aviso(`${zonasSueltas.length} respuesta(s) de la FAQ enumeran zonas a mano: usá {zonas} y se rellena desde cobertura`);
} else ok('la FAQ toma las zonas de cobertura');

const sinResolver = (P.faq || []).some((f) => /\{zonas\}/.test(f.r));
if (sinResolver) {
  const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  if (html.includes('{zonas}')) fallo('quedó un {zonas} sin resolver en index.html');
}

console.log(`\n${errores === 0 ? '✓ Sin errores' : `✗ ${errores} error(es)`} · ${avisos} aviso(s)\n`);
process.exit(errores ? 1 : 0);
