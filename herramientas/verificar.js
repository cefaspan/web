#!/usr/bin/env node
/* Verificación del sitio generado: SEO, enlaces, accesibilidad y datos estructurados.
   Uso: node herramientas/verificar.js                                              */
'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const PAGINAS = ['index.html', 'menu/index.html', 'encargos/index.html', 'contacto/index.html', '404.html'];

let errores = 0;
let avisos = 0;
const fallo = (m) => { console.log(`  ✗ ${m}`); errores++; };
const aviso = (m) => { console.log(`  ! ${m}`); avisos++; };
const ok = (m) => console.log(`  ✓ ${m}`);

function comprobarPagina(rel) {
  console.log(`\n── ${rel}`);
  const html = fs.readFileSync(path.join(RAIZ, rel), 'utf8');

  // 1. Plantilla completamente resuelta
  const pendientes = html.match(/\{\{\w+\}\}/g);
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

  // 6. Enlaces internos que resuelven
  const hrefs = [...html.matchAll(/href="([^"#][^"]*)"/g)].map((m) => m[1])
    .filter((h) => !/^(https?:|mailto:|tel:|#)/.test(h));
  const dirPagina = path.dirname(path.join(RAIZ, rel));
  const rotos = hrefs.filter((h) => {
    const limpio = h.split('#')[0];
    if (!limpio) return false;
    let destino = path.resolve(dirPagina, limpio);
    if (limpio.endsWith('/')) destino = path.join(destino, 'index.html');
    return !fs.existsSync(destino);
  });
  if (rotos.length) fallo(`enlaces internos rotos: ${[...new Set(rotos)].join(', ')}`);
  else ok(`${new Set(hrefs).size} enlaces internos, todos resuelven`);

  // 7. Anclas de categoría existentes (enlaces #id dentro del propio sitio)
  const anclasMenu = [...html.matchAll(/href="[^"]*menu\/#([\w-]+)"/g)].map((m) => m[1]);
  if (anclasMenu.length) {
    const menuHtml = fs.readFileSync(path.join(RAIZ, 'menu/index.html'), 'utf8');
    const faltan = [...new Set(anclasMenu)].filter((a) => !menuHtml.includes(`id="${a}"`));
    if (faltan.length) fallo(`anclas inexistentes en el menú: ${faltan.join(', ')}`);
    else ok(`${new Set(anclasMenu).size} anclas del menú válidas`);
  }

  // 8. Peso
  const kb = Buffer.byteLength(html, 'utf8') / 1024;
  if (kb > 150) aviso(`página de ${kb.toFixed(0)} KB (considerá aligerarla)`);
}

console.log('Verificando el sitio generado…');
PAGINAS.forEach(comprobarPagina);

// --- Archivos de soporte ---------------------------------------------------
console.log('\n── archivos de soporte');
['sitemap.xml', 'robots.txt', 'manifest.webmanifest', '.nojekyll', 'assets/css/estilos.css',
 'assets/js/app.js', 'assets/img/logo-cefas.png'].forEach((f) => {
  if (fs.existsSync(path.join(RAIZ, f))) ok(f);
  else fallo(`falta ${f}`);
});

const sitemap = fs.readFileSync(path.join(RAIZ, 'sitemap.xml'), 'utf8');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
ok(`sitemap con ${locs.length} URLs`);
try { JSON.parse(fs.readFileSync(path.join(RAIZ, 'manifest.webmanifest'), 'utf8')); ok('manifest válido'); }
catch (e) { fallo(`manifest inválido: ${e.message}`); }

// --- Datos pendientes de configurar ---------------------------------------
console.log('\n── datos del negocio pendientes');
const N = JSON.parse(fs.readFileSync(path.join(RAIZ, 'datos/negocio.json'), 'utf8'));
if (/0000/.test(N.telefono) || /0000/.test(N.whatsapp)) aviso('teléfono / WhatsApp sigue siendo un valor de ejemplo');
if (/PENDIENTE/i.test(N.direccion.calle)) aviso('la dirección exacta sigue pendiente');
if (!N.redes.googleMaps) aviso('falta el enlace de Google Maps del negocio');
const P = JSON.parse(fs.readFileSync(path.join(RAIZ, 'datos/productos.json'), 'utf8'));
if (P._nota && /PLACEHOLDER/i.test(P._nota)) aviso('el catálogo sigue marcado como PLACEHOLDER (precios de ejemplo)');

console.log(`\n${errores === 0 ? '✓ Sin errores' : `✗ ${errores} error(es)`} · ${avisos} aviso(s)\n`);
process.exit(errores ? 1 : 0);
