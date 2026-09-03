/* ==========================================================================
   Cefas Panadería — set de iconos SVG
   --------------------------------------------------------------------------
   Reemplaza los emojis del sitio. Se inyecta un único sprite <symbol> por
   página y cada uso es un <svg><use href="#i-nombre"></svg>, así que el
   dibujo viaja una sola vez y hereda color y tamaño del CSS (currentColor).

   Para agregar un icono: añadí una entrada a ICONOS con el interior del SVG
   dibujado sobre un lienzo de 24x24.
   ========================================================================== */

'use strict';

/* Los iconos de trazo heredan fill="none" stroke="currentColor" del <symbol>.
   Los que se declaran como { macizo: true, d } usan fill="currentColor".   */
const ICONOS = {
  /* --- Categorías del menú ---------------------------------------------- */
  baguette: '<path d="M8.1 20.1 20.1 8.1a3 3 0 0 0-4.2-4.2L3.9 15.9a3 3 0 0 0 4.2 4.2Z"/><path d="m8.5 13.3 2.2 2.2M10.9 10.9l2.2 2.2M13.3 8.5l2.2 2.2"/>',
  pan: '<path d="M3 14a9 5 0 0 1 18 0v3a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3Z"/><path d="M9 20v-6M15 20v-6"/>',
  trigo: '<path d="M3 21 14 10"/><path d="M4.47 11.53 6 10l1.53 1.53a3.5 3.5 0 0 1 0 4.94L6 18l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M8.47 7.53 10 6l1.53 1.53a3.5 3.5 0 0 1 0 4.94L10 14l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M12.47 3.53 14 2l1.53 1.53a3.5 3.5 0 0 1 0 4.94L14 10l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M12.47 16.47 14 18l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L6 18l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"/><path d="M16.47 12.47 18 14l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L10 14l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"/><path d="M20.47 8.47 22 10l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L14 10l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"/>',
  croissant: '<path d="M3 15.5c0-5 4-9.5 9-9.5s9 4.5 9 9.5c0 1.1-.9 2-2 2h-2c-1.1 0-2-.9-2-2 0-1.7-1.3-3-3-3s-3 1.3-3 3c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2Z"/><path d="M8.2 9.6 6.6 6.9M15.8 9.6l1.6-2.7"/>',
  pastel: '<path d="M20 21v-7.5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2V21"/><path d="M3 21h18"/><path d="M12 11.5V8"/><path d="M12 8a2 2 0 0 1 0-4 2 2 0 0 0 0 4Z"/><path d="M4 16c2 0 2 1.4 4 1.4s2-1.4 4-1.4 2 1.4 4 1.4 2-1.4 4-1.4"/>',
  caja: '<path d="m7.5 4.3 9 5.1"/><path d="M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  cafe: '<path d="M6 2v2M10 2v2M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/>',

  /* --- Interfaz ---------------------------------------------------------- */
  canasta: '<path d="M2 11h20"/><path d="m3.6 11 1.6 7.4a2 2 0 0 0 2 1.6h9.6a2 2 0 0 0 2-1.6L20.4 11"/><path d="m5 11 4-7M19 11l-4-7"/><path d="m9.3 14.5.5 3.5M14.7 14.5l-.5 3.5"/>',
  lupa: '<circle cx="11" cy="11" r="7.5"/><path d="m21 21-4.6-4.6"/>',
  pin: '<path d="M20 10.5c0 6-8 11.5-8 11.5S4 16.5 4 10.5a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10.2" r="2.8"/>',
  telefono: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.1 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7A2 2 0 0 1 22 16.9Z"/>',
  chat: '<path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5Z"/>',
  correo: '<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3 7 8.1 5.4a2 2 0 0 0 2.2 0L21.5 7"/>',
  check: '<path d="M20 6.5 9.5 17 4 11.5"/>',
  reloj: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3.4 2"/>',
  camion: '<path d="M14 17.5V6.5a1 1 0 0 0-1-1H2.5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1H4"/><path d="M14 9h3.6l3.4 3.6v3.9a1 1 0 0 1-1 1h-1"/><circle cx="6.8" cy="17.5" r="2"/><circle cx="17.2" cy="17.5" r="2"/><path d="M8.8 17.5h6.4"/>',
  fuego: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4.1 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5Z"/>',
  estrella: '<path d="m12 3.2 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.7l6.1-.9Z"/>',
  flecha: '<path d="M4.5 12h14"/><path d="m13 6.5 5.5 5.5L13 17.5"/>',
  chevron: '<path d="m6.5 9.5 5.5 5.5 5.5-5.5"/>',
  mas: '<path d="M12 5.5v13M5.5 12h13"/>',
  menos: '<path d="M5.5 12h13"/>',
  cerrar: '<path d="M18 6 6 18M6 6l12 12"/>',
  calendario: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10.5h17"/>',
  bolsa: '<path d="M6.2 2.5 3.5 6.4V19a2.5 2.5 0 0 0 2.5 2.5h12a2.5 2.5 0 0 0 2.5-2.5V6.4l-2.7-3.9Z"/><path d="M3.5 6.5h17"/><path d="M15.5 10.5a3.5 3.5 0 0 1-7 0"/>',
  usuarios: '<path d="M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20"/><circle cx="9" cy="7.5" r="3.5"/><path d="M22 20v-1.5a4 4 0 0 0-3-3.9"/><path d="M16.5 4.1a3.5 3.5 0 0 1 0 6.8"/>',

  /* --- Redes sociales (macizos) ------------------------------------------ */
  whatsapp: {
    macizo: true,
    d: '<path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.86 1.21 3.06c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35M12.04 21.3h-.02a9.3 9.3 0 0 1-4.74-1.3l-.34-.2-3.53.93.94-3.44-.22-.35a9.3 9.3 0 0 1-1.42-4.96c0-5.12 4.17-9.29 9.31-9.29a9.24 9.24 0 0 1 6.58 2.73 9.23 9.23 0 0 1 2.72 6.57c0 5.12-4.17 9.3-9.28 9.3m7.91-17.2A11.07 11.07 0 0 0 12.04 1C5.88 1 .87 6.01.87 12.17c0 1.97.51 3.9 1.5 5.59L.78 23.5l5.88-1.54a11.12 11.12 0 0 0 5.38 1.37c6.16 0 11.18-5.01 11.18-11.17 0-2.99-1.17-5.8-3.27-7.91"/>'
  },
  facebook: {
    macizo: true,
    d: '<path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12"/>'
  },
  instagram: '<rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.1" cy="6.9" r="1.15" fill="currentColor" stroke="none"/>',
  tiktok: {
    macizo: true,
    d: '<path d="M16.7 2h-2.9v13.2a2.55 2.55 0 1 1-1.83-2.44V9.83a5.62 5.62 0 1 0 4.73 5.55V8.9A6.9 6.9 0 0 0 21 10.2V7.28A4.04 4.04 0 0 1 16.7 3.9Z"/>'
  }
};

/* Sprite: un solo bloque oculto por página. */
function sprite() {
  const simbolos = Object.keys(ICONOS).map((nombre) => {
    const valor = ICONOS[nombre];
    const macizo = typeof valor === 'object';
    const cuerpo = macizo ? valor.d : valor;
    const atributos = macizo
      ? 'fill="currentColor" stroke="none"'
      : 'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
    return `<symbol id="i-${nombre}" viewBox="0 0 24 24" ${atributos}>${cuerpo}</symbol>`;
  }).join('');

  return `<svg class="sprite-iconos" aria-hidden="true" focusable="false" width="0" height="0">${simbolos}</svg>`;
}

/* Uso de un icono. `clase` agrega modificadores (ico--xl, ico--dorado…). */
function ico(nombre, clase) {
  if (!Object.prototype.hasOwnProperty.call(ICONOS, nombre)) {
    throw new Error(`Icono desconocido: "${nombre}" (revisá herramientas/iconos.js)`);
  }
  return `<svg class="ico${clase ? ' ' + clase : ''}" aria-hidden="true" focusable="false"><use href="#i-${nombre}"/></svg>`;
}

module.exports = { ICONOS, sprite, ico, nombres: Object.keys(ICONOS) };
