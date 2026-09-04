#!/usr/bin/env node
/* ==========================================================================
   Optimizador de las fotos de assets/img
   --------------------------------------------------------------------------
   Las fotos del catálogo se muestran en tarjetas de ~300 px de ancho como
   máximo, así que una foto de 1254 px y 3 MB manda 20 veces más datos de los
   que se ven. Este script hace tres cosas:

     1. Deja cada foto en JPEG de 800 px (suficiente incluso en retina).
     2. Genera las variantes que usa el <picture> de cada tarjeta:
        foo-400.jpg para pantallas chicas, y foo.webp / foo-400.webp, que
        pesan del orden de un 30 % menos que el JPEG equivalente.
     3. Arma og-cefas.jpg de 1200×630, la medida que esperan WhatsApp,
        Facebook y X al previsualizar el enlace.

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
const ANCHO_CHICO = 400;  // variante para móvil (la tarjeta mide ~300 px)
const CALIDAD_WEBP = 76;  // a igual calidad percibida, WebP aguanta menos

/* Imagen para compartir el enlace. 1200×630 es lo que piden Open Graph y
   Twitter Cards; el logo cuadrado con transparencia que se usaba antes salía
   recortado sobre fondo negro. Se recorta de la primera foto de esta lista
   que exista. Cuando haya una foto real de un evento, ponela primero.   */
const OG_ARCHIVO = 'og-cefas.jpg';
const OG_ANCHO = 1200;
const OG_ALTO = 630;
const OG_FUENTES = ['coffee-break.jpg', 'bandeja-bocadillos.jpg', 'caja-desayuno.jpg', 'pan-img-generico.jpg'];

/* Lo que este script produce y no debe volver a procesar como si fuera un
   original: si no se excluye, la siguiente pasada haría foo-400-400.jpg. */
const LOGO_CHICO = 192;      // px: cabecera, pie y favicon lo pintan a 44–56 px
const LOGO_MASKABLE = 'logo-cefas-maskable.png';
const FONDO_MASKABLE = '#FDF8F1'; // la crema del sitio (--crema)

const esDerivada = (f) => new RegExp('-' + ANCHO_CHICO + '\\.(?:jpe?g|png|webp)$', 'i').test(f) ||
  /\.webp$/i.test(f) || f === OG_ARCHIVO ||
  f === `logo-cefas-${LOGO_CHICO}.png` || f === LOGO_MASKABLE;

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
    .filter((f) => /\.(png|jpe?g)$/i.test(f) && !esDerivada(f))
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
    // Se lee a buffer: si se le pasa la ruta, sharp deja el archivo abierto y
    // en Windows la reescritura sobre la misma ruta falla.
    const entrada = fs.readFileSync(origen);
    const bytesAntes = entrada.length;
    const meta = await sharp(entrada).metadata();
    const esLogo = nombre === LOGO;
    const lado = esLogo ? LADO_LOGO : LADO_FOTO;

    // Nunca agrandar: si ya es más chica que el objetivo, se deja igual
    const redimensionar = Math.max(meta.width, meta.height) > lado;

    let tuberia = sharp(entrada).rotate();
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
    const vale = mejora > 8192 || path.basename(destino) !== nombre;

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

  // Las variantes se calculan sobre los .jpg ya optimizados, así que hay que
  // volver a leer el directorio: con --aplicar acaban de cambiar de nombre.
  await variantes();
  await variantesLogo();
  await imagenParaCompartir();

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

/* --- Variantes responsivas -----------------------------------------------
   Por cada foto se dejan al lado foo-400.jpg, foo.webp y foo-400.webp.
   generar.js referencia sólo las que existen, así que si esta pasada no se
   corre el sitio sigue funcionando con el JPEG de 800.                  */
async function variantes() {
  const fotos = fs.readdirSync(IMG)
    .filter((f) => /\.jpe?g$/i.test(f) && !esDerivada(f))
    .sort();
  if (!fotos.length) return;

  console.log(`\n  Variantes responsivas (${ANCHO_CHICO} px y WebP)\n`);
  let generadas = 0;
  let peso = 0;

  for (const nombre of fotos) {
    const entrada = fs.readFileSync(path.join(IMG, nombre));
    const raiz = path.basename(nombre, path.extname(nombre));
    const meta = await sharp(entrada).metadata();

    const codificar = async (ancho, webp) => {
      let t = sharp(entrada);
      if (ancho) t = t.resize({ width: ancho, withoutEnlargement: true });
      t = webp
        ? t.webp({ quality: CALIDAD_WEBP })
        : t.jpeg({ quality: CALIDAD, progressive: true, mozjpeg: true });
      return t.toBuffer();
    };

    const partes = [];
    const guardar = (archivo, buffer) => {
      partes.push(`${archivo} ${kb(buffer.length)}`);
      peso += buffer.length;
      generadas++;
      if (APLICAR) fs.writeFileSync(path.join(IMG, archivo), buffer);
    };
    /* Un WebP que pesa más que su JPEG no sirve de nada: el <picture> lo
       preferiría y el visitante bajaría más datos. En fotos con mucho grano
       pasa de verdad, así que se compara y, si pierde, se borra el que
       hubiera quedado de una pasada anterior.                          */
    const descartar = (archivo) => {
      const p = path.join(IMG, archivo);
      const habia = fs.existsSync(p);
      if (APLICAR && habia) fs.unlinkSync(p);
      partes.push(`${archivo} descartado (más grande que el JPEG)`);
    };

    // 800 px: el JPEG ya está en disco, sólo se evalúa el WebP
    const webpGrande = await codificar(null, true);
    if (webpGrande.length < entrada.length) guardar(`${raiz}.webp`, webpGrande);
    else descartar(`${raiz}.webp`);

    // 400 px: sólo si el original es más grande
    if (meta.width > ANCHO_CHICO) {
      const jpgChico = await codificar(ANCHO_CHICO, false);
      guardar(`${raiz}-${ANCHO_CHICO}.jpg`, jpgChico);
      const webpChico = await codificar(ANCHO_CHICO, true);
      if (webpChico.length < jpgChico.length) guardar(`${raiz}-${ANCHO_CHICO}.webp`, webpChico);
      else descartar(`${raiz}-${ANCHO_CHICO}.webp`);
    }

    if (partes.length) console.log('  ' + nombre.padEnd(28) + '→ ' + partes.join('   '));
  }

  console.log(`\n  ${generadas} variante(s), ${mb(peso)} en total` +
    (APLICAR ? '' : ' (no escritas)'));
}

/* --- Logo: variante chica y maskable -------------------------------------
   El PNG de 512 pesa ~50 KB y en la interfaz se pinta a 44–56 px, así que
   cabecera, pie y favicon usan una de 192. La maskable es para el icono de
   la pantalla de inicio en Android, que recorta el 20 % exterior en círculo:
   el logo va al 80 % sobre fondo opaco para que no salga cortado.       */
async function variantesLogo() {
  const origen = path.join(IMG, LOGO);
  if (!fs.existsSync(origen)) return;
  const entrada = fs.readFileSync(origen);
  const png = (t) => t.png({ compressionLevel: 9, palette: true });

  const chico = await png(sharp(entrada).resize(LOGO_CHICO, LOGO_CHICO, { fit: 'inside' })).toBuffer();

  const interior = await sharp(entrada)
    .resize(Math.round(LADO_LOGO * 0.8), Math.round(LADO_LOGO * 0.8), { fit: 'inside' })
    .png().toBuffer();
  const maskable = await png(sharp({
    create: { width: LADO_LOGO, height: LADO_LOGO, channels: 4, background: FONDO_MASKABLE }
  }).composite([{ input: interior, gravity: 'centre' }])).toBuffer();

  console.log(`\n  ${LOGO.padEnd(28)}→ logo-cefas-${LOGO_CHICO}.png ${kb(chico.length)}   ${LOGO_MASKABLE} ${kb(maskable.length)}`);
  if (APLICAR) {
    fs.writeFileSync(path.join(IMG, `logo-cefas-${LOGO_CHICO}.png`), chico);
    fs.writeFileSync(path.join(IMG, LOGO_MASKABLE), maskable);
  }
}

/* --- Imagen para compartir ---------------------------------------------- */
async function imagenParaCompartir() {
  const fuente = OG_FUENTES.map((f) => path.join(IMG, f)).find((p) => fs.existsSync(p));
  if (!fuente) {
    console.log(`\n  ⚠ no encontré ninguna foto para armar ${OG_ARCHIVO}`);
    return;
  }
  const buffer = await sharp(fs.readFileSync(fuente))
    .resize({ width: OG_ANCHO, height: OG_ALTO, fit: 'cover', position: 'centre' })
    .jpeg({ quality: CALIDAD, progressive: true, mozjpeg: true })
    .toBuffer();

  console.log(`\n  ${OG_ARCHIVO.padEnd(28)}→ ${OG_ANCHO}×${OG_ALTO} ${kb(buffer.length)}` +
    `   (recortada de ${path.basename(fuente)})`);
  if (APLICAR) fs.writeFileSync(path.join(IMG, OG_ARCHIVO), buffer);
}

principal().catch((e) => {
  console.error('\nFalló la optimización:', e.message, '\n');
  process.exit(1);
});
