#!/usr/bin/env node
/* ==========================================================================
   Optimizador de las fotos de assets/img
   --------------------------------------------------------------------------
   Las fotos del catálogo se muestran en tarjetas de ~370 px de ancho como
   máximo, así que una foto de 1254 px y 3 MB manda 20 veces más datos de los
   que se ven. Este script las deja en JPEG de 800 px, que es suficiente
   incluso en pantallas retina.

   Uso:
     node herramientas/optimizar-imagenes.js            informe, no toca nada
     node herramientas/optimizar-imagenes.js --aplicar  convierte de verdad

   Con --aplicar, cada foto se convierte a .jpg, se borra el original y se
   actualizan las referencias en datos/productos.json y datos/negocio.json.
   El original queda siempre recuperable con git.

   Requiere sharp, que NO hace falta para el sitio ni para generar.js:
     npm install
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const IMG = path.join(RAIZ, 'assets/img');
const APLICAR = process.argv.includes('--aplicar');

/* El logo se queda en PNG: el pie lo pinta con filter:invert(1) sobre fondo
   oscuro y necesita transparencia. Solo se le baja la resolución. */
const LOGO = 'logo-cefas.png';

const LADO_FOTO = 800;    // px del lado mayor de una foto de producto
const LADO_LOGO = 512;    // px del logo (lo pide el manifest como icono)
const CALIDAD = 82;

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('\nFalta sharp. Instalalo con:\n\n  npm install\n');
  console.error('(sharp solo se usa acá; el sitio y generar.js no lo necesitan.)\n');
  process.exit(1);
}

const kb = (n) => (n / 1024).toFixed(0) + ' KB';
const mb = (n) => (n / 1048576).toFixed(2) + ' MB';

/* Rutas de archivo que aparecen en los JSON de datos */
function actualizarReferencias(renombres) {
  const archivos = ['datos/productos.json', 'datos/negocio.json'];
  const tocados = [];
  for (const rel of archivos) {
    const p = path.join(RAIZ, rel);
    if (!fs.existsSync(p)) continue;
    let texto = fs.readFileSync(p, 'utf8');
    const antes = texto;
    for (const [viejo, nuevo] of Object.entries(renombres)) {
      texto = texto.split('"' + viejo + '"').join('"' + nuevo + '"');
    }
    if (texto !== antes) {
      JSON.parse(texto);               // no escribir si quedó inválido
      fs.writeFileSync(p, texto);
      tocados.push(rel);
    }
  }
  return tocados;
}

async function principal() {
  const fotos = fs.readdirSync(IMG)
    .filter((f) => /\.(png|jpe?g)$/i.test(f))
    .sort();

  if (!fotos.length) {
    console.log('\nNo hay imágenes en assets/img.\n');
    return;
  }

  console.log(`\n${APLICAR ? 'Optimizando' : 'Informe (nada se modifica)'} — assets/img\n`);
  console.log('  archivo'.padEnd(34) + 'antes'.padStart(10) + '   ' + 'después'.padStart(10) + '   ahorro');
  console.log('  ' + '-'.repeat(70));

  const renombres = {};
  let totalAntes = 0;
  let totalDespues = 0;

  for (const nombre of fotos) {
    const origen = path.join(IMG, nombre);
    const bytesAntes = fs.statSync(origen).size;
    const meta = await sharp(origen).metadata();
    const esLogo = nombre === LOGO;
    const lado = esLogo ? LADO_LOGO : LADO_FOTO;

    // Nunca agrandar: si ya es más chica que el objetivo, se deja igual
    const redimensionar = Math.max(meta.width, meta.height) > lado;

    let tuberia = sharp(origen).rotate();
    if (redimensionar) {
      tuberia = tuberia.resize({ width: lado, height: lado, fit: 'inside', withoutEnlargement: true });
    }

    let destino;
    if (esLogo) {
      destino = origen;                                  // sigue siendo PNG
      tuberia = tuberia.png({ compressionLevel: 9, palette: true });
    } else {
      destino = path.join(IMG, path.basename(nombre, path.extname(nombre)) + '.jpg');
      tuberia = tuberia.jpeg({ quality: CALIDAD, progressive: true, mozjpeg: true });
    }

    const buffer = await tuberia.toBuffer();
    const bytesDespues = buffer.length;

    // Si la conversión no mejora nada, no vale la pena tocar el archivo
    const mejora = bytesAntes - bytesDespues;
    const vale = mejora > 1024 || path.basename(destino) !== nombre;

    totalAntes += bytesAntes;
    totalDespues += vale ? bytesDespues : bytesAntes;

    const porcentaje = bytesAntes ? Math.round((mejora / bytesAntes) * 100) : 0;
    console.log('  ' + nombre.padEnd(32) + kb(bytesAntes).padStart(10) + ' → ' +
      kb(bytesDespues).padStart(10) + '   ' + (vale ? porcentaje + '%' : 'se deja igual') +
      (redimensionar ? `   ${meta.width}px → ${lado}px` : ''));

    if (!APLICAR || !vale) continue;

    fs.writeFileSync(destino, buffer);
    if (destino !== origen) {
      fs.unlinkSync(origen);
      renombres[nombre] = path.basename(destino);
    }
  }

  console.log('  ' + '-'.repeat(70));
  console.log('  ' + 'TOTAL'.padEnd(32) + mb(totalAntes).padStart(10) + ' → ' +
    mb(totalDespues).padStart(10) + '   ' +
    Math.round(((totalAntes - totalDespues) / totalAntes) * 100) + '%');

  if (!APLICAR) {
    console.log('\n  Nada se modificó. Para aplicarlo:\n' +
      '    node herramientas/optimizar-imagenes.js --aplicar\n');
    return;
  }

  const tocados = actualizarReferencias(renombres);
  const n = Object.keys(renombres).length;
  console.log(`\n  ${n} archivo(s) convertido(s) a .jpg y original(es) borrado(s).`);
  if (tocados.length) console.log(`  Referencias actualizadas en: ${tocados.join(', ')}`);
  console.log('\n  Ahora regenerá el sitio:\n    node herramientas/generar.js\n');
}

principal().catch((e) => {
  console.error('\nFalló la optimización:', e.message, '\n');
  process.exit(1);
});
