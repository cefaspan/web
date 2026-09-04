/* ==========================================================================
   Cefas Panadería — pedidos por encargo
   Sin dependencias. Los productos viven en el HTML (bueno para SEO); este
   script sólo los lee desde los atributos data-* de cada tarjeta.
   ========================================================================== */
(function () {
  'use strict';

  var CLAVE = 'cefas_pedido_v1';
  var cfg = document.body.dataset;
  var WHATSAPP = cfg.whatsapp || '';
  var MONEDA = cfg.moneda || 'Q';

  /* --- Utilidades --------------------------------------------------------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function precio(n) { return MONEDA + n.toFixed(2); }
  function normalizar(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  /* Icono del sprite SVG que ya viene en la página (ver herramientas/iconos.js) */
  function iconoHTML(nombre) {
    return '<svg class="ico" aria-hidden="true" focusable="false"><use href="#i-' + nombre + '"/></svg>';
  }

  /* --- Almacenamiento (tolerante a navegadores que lo bloquean) ----------- */
  function leerPedido() {
    try {
      var crudo = localStorage.getItem(CLAVE);
      var datos = crudo ? JSON.parse(crudo) : [];
      return Array.isArray(datos) ? datos : [];
    } catch (e) { return []; }
  }
  function guardarPedido(lista) {
    try { localStorage.setItem(CLAVE, JSON.stringify(lista)); } catch (e) { /* modo privado */ }
  }

  var pedido = leerPedido();

  /* --- Menú de navegación en móvil ---------------------------------------- */
  var btnMenu = $('[data-menu-btn]');
  var nav = $('[data-nav]');
  if (btnMenu && nav) {
    var esEscritorio = function () { return window.matchMedia('(min-width: 901px)').matches; };
    var sincronizarNav = function () {
      if (esEscritorio()) { nav.hidden = false; btnMenu.setAttribute('aria-expanded', 'false'); }
      else if (btnMenu.getAttribute('aria-expanded') !== 'true') { nav.hidden = true; }
    };
    btnMenu.addEventListener('click', function () {
      var abierto = btnMenu.getAttribute('aria-expanded') === 'true';
      btnMenu.setAttribute('aria-expanded', String(!abierto));
      nav.hidden = abierto;
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A' && !esEscritorio()) {
        btnMenu.setAttribute('aria-expanded', 'false');
        nav.hidden = true;
      }
    });
    window.addEventListener('resize', sincronizarNav);
    sincronizarNav();
  }

  /* --- Año en el pie ------------------------------------------------------ */
  $$('[data-anio]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* --- Preferencia de movimiento reducido --------------------------------- */
  var sinMovimiento = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- Entrada de secciones al hacer scroll ------------------------------- */
  (function animarEntradas() {
    var elementos = $$('[data-reveal]');
    if (!elementos.length) return;

    var mostrar = function (el, retardo) {
      if (retardo) el.style.transitionDelay = retardo + 'ms';
      el.classList.add('visible');
    };

    if (sinMovimiento || !('IntersectionObserver' in window)) {
      elementos.forEach(function (el) { mostrar(el, 0); });
      return;
    }

    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        var el = entrada.target;
        // Escalonado por posición dentro de su rejilla: las tarjetas de una
        // misma fila aparecen una detrás de otra, no todas de golpe.
        var hermanos = Array.prototype.slice.call(el.parentNode.children);
        var retardo = (hermanos.indexOf(el) % 4) * 70;
        mostrar(el, retardo);
        observador.unobserve(el);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    elementos.forEach(function (el) { observador.observe(el); });
  })();

  /* --- Cabecera: estado al hacer scroll y barra de progreso --------------- */
  (function cabeceraDinamica() {
    var cabecera = $('.cabecera');
    var barra = $('[data-progreso]');
    if (!cabecera && !barra) return;

    var pendiente = false;
    var pintar = function () {
      pendiente = false;
      var y = window.pageYOffset || document.documentElement.scrollTop;
      if (cabecera) cabecera.classList.toggle('cabecera--fija', y > 8);
      if (barra) {
        var alto = document.documentElement.scrollHeight - window.innerHeight;
        barra.style.transform = 'scaleX(' + (alto > 0 ? Math.min(y / alto, 1) : 0) + ')';
      }
    };
    window.addEventListener('scroll', function () {
      if (pendiente) return;
      pendiente = true;
      window.requestAnimationFrame(pintar);
    }, { passive: true });
    pintar();
  })();

  /* --- Contadores de la barra de confianza -------------------------------- */
  (function animarContadores() {
    var marcadores = $$('[data-contador]');
    if (!marcadores.length) return;

    var contar = function (el) {
      var destino = parseFloat(el.dataset.contador);
      var sufijo = el.dataset.sufijo || '';
      if (isNaN(destino)) return;
      if (sinMovimiento) { el.textContent = destino + sufijo; return; }

      var inicio = null;
      var duracion = 1100;
      var paso = function (ahora) {
        if (inicio === null) inicio = ahora;
        var t = Math.min((ahora - inicio) / duracion, 1);
        var suave = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(destino * suave) + sufijo;
        if (t < 1) window.requestAnimationFrame(paso);
      };
      window.requestAnimationFrame(paso);
    };

    if (!('IntersectionObserver' in window)) { marcadores.forEach(contar); return; }
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        contar(entrada.target);
        observador.unobserve(entrada.target);
      });
    }, { threshold: 0.5 });
    marcadores.forEach(function (el) { observador.observe(el); });
  })();

  /* --- Carrito ------------------------------------------------------------ */
  var panel = $('[data-panel]');
  var velo = $('[data-velo]');
  var cuerpo = $('[data-carrito-cuerpo]');
  var vacio = $('[data-carrito-vacio]');
  var totales = $$('[data-carrito-total]');
  var unidadesEls = $$('[data-carrito-unidades]');
  var contadores = $$('[data-carrito-contador]');
  var soloSiHayPedido = $$('[data-si-hay-pedido]');
  var barraVenta = $('[data-barra-venta]');
  var ultimoFoco = null;

  function totalPedido() {
    return pedido.reduce(function (s, l) { return s + l.precio * l.cantidad; }, 0);
  }
  function unidadesPedido() {
    return pedido.reduce(function (s, l) { return s + l.cantidad; }, 0);
  }

  function cantidadDe(id) {
    for (var i = 0; i < pedido.length; i++) {
      if (pedido[i].id === id) return pedido[i].cantidad;
    }
    return 0;
  }

  function pintarContador() {
    var n = unidadesPedido();
    var hay = n > 0;
    contadores.forEach(function (el) {
      el.textContent = n;
      el.hidden = !hay;
    });
    unidadesEls.forEach(function (el) {
      el.textContent = n + (n === 1 ? ' producto' : ' productos');
    });
    totales.forEach(function (el) { el.textContent = precio(totalPedido()); });
    soloSiHayPedido.forEach(function (el) { el.hidden = !hay; });
    // La barra fija de pedido sólo aparece cuando hay algo que cerrar
    if (barraVenta) barraVenta.hidden = !hay;
    document.body.classList.toggle('con-barra-venta', hay);
  }

  /* Crea el contador (− 2 +) de una tarjeta. No viene en el HTML: son 50
     tarjetas por página y sólo hace falta cuando el producto ya está pedido. */
  function crearContador(tarjeta) {
    var nombre = tarjeta.dataset.nombre || 'este producto';
    var caja = document.createElement('div');
    caja.className = 'contador';
    caja.setAttribute('data-contador-producto', '');

    var menos = document.createElement('button');
    menos.type = 'button';
    menos.setAttribute('data-quitar', '');
    menos.setAttribute('aria-label', 'Quitar uno de ' + nombre);
    menos.innerHTML = iconoHTML('menos');

    var cifra = document.createElement('span');
    cifra.setAttribute('data-cantidad', '');
    cifra.setAttribute('aria-live', 'polite');
    cifra.setAttribute('aria-label', 'Cantidad de ' + nombre);

    var mas = document.createElement('button');
    mas.type = 'button';
    mas.setAttribute('data-sumar', '');
    mas.setAttribute('aria-label', 'Agregar otro de ' + nombre);
    mas.innerHTML = iconoHTML('mas');

    caja.appendChild(menos);
    caja.appendChild(cifra);
    caja.appendChild(mas);

    var pie = $('.producto__pie', tarjeta) || tarjeta;
    pie.appendChild(caja);
    return caja;
  }

  /* Cada tarjeta muestra "Agregar al pedido" o, si ya está en el pedido, el
     contador con su cantidad. Así se puede subir y bajar sin abrir el panel. */
  function pintarTarjetas() {
    $$('[data-producto]').forEach(function (tarjeta) {
      var boton = $('[data-agregar]', tarjeta);
      if (!boton) return;                       // productos de sólo cotización
      var n = cantidadDe(tarjeta.dataset.id);
      var contador = $('[data-contador-producto]', tarjeta);
      if (n === 0) {
        if (contador) contador.hidden = true;
        boton.hidden = false;
        return;
      }
      if (!contador) contador = crearContador(tarjeta);
      $('[data-cantidad]', contador).textContent = n;
      contador.hidden = false;
      boton.hidden = true;
    });
  }

  function pintarCarrito() {
    pintarContador();
    pintarTarjetas();
    if (!cuerpo) return;

    $$('.linea-carrito', cuerpo).forEach(function (el) { el.remove(); });
    if (vacio) vacio.hidden = pedido.length > 0;

    pedido.forEach(function (linea, i) {
      var fila = document.createElement('div');
      fila.className = 'linea-carrito';

      if (linea.img) {
        var miniatura = document.createElement('img');
        miniatura.className = 'linea-carrito__foto';
        miniatura.src = linea.img;
        miniatura.alt = '';
        miniatura.width = 54;
        miniatura.height = 54;
        miniatura.loading = 'lazy';
        // Un pedido guardado de una versión anterior puede apuntar a una
        // imagen que ya no existe: en ese caso la fila sigue funcionando.
        miniatura.addEventListener('error', function () { miniatura.remove(); });
        fila.appendChild(miniatura);
      }

      var info = document.createElement('div');
      info.className = 'linea-carrito__info';
      var nombre = document.createElement('span');
      nombre.className = 'linea-carrito__nombre';
      nombre.textContent = linea.nombre;
      var det = document.createElement('span');
      det.className = 'linea-carrito__precio';
      det.textContent = linea.unidad || '';
      info.appendChild(nombre);
      info.appendChild(det);

      var ctrl = document.createElement('div');
      ctrl.className = 'cantidad';
      var menos = document.createElement('button');
      menos.type = 'button';
      menos.innerHTML = iconoHTML('menos');
      menos.setAttribute('aria-label', 'Quitar uno de ' + linea.nombre);
      menos.addEventListener('click', function () { cambiarCantidad(i, -1); });
      var cant = document.createElement('span');
      cant.textContent = linea.cantidad;
      cant.setAttribute('aria-label', linea.cantidad + ' unidades');
      var mas = document.createElement('button');
      mas.type = 'button';
      mas.innerHTML = iconoHTML('mas');
      mas.setAttribute('aria-label', 'Agregar uno de ' + linea.nombre);
      mas.addEventListener('click', function () { cambiarCantidad(i, 1); });
      ctrl.appendChild(menos); ctrl.appendChild(cant); ctrl.appendChild(mas);

      fila.appendChild(info);
      fila.appendChild(ctrl);
      if (vacio) cuerpo.insertBefore(fila, vacio); else cuerpo.appendChild(fila);
    });

    var enviar = $('[data-enviar-wa]');
    if (enviar) enviar.toggleAttribute('disabled', pedido.length === 0);
  }

  function cambiarCantidad(i, delta) {
    if (!pedido[i]) return;
    pedido[i].cantidad += delta;
    if (pedido[i].cantidad < 1) pedido.splice(i, 1);
    guardarPedido(pedido);
    pintarCarrito();
  }

  function agregar(datos) {
    var existente = null;
    for (var i = 0; i < pedido.length; i++) {
      if (pedido[i].id === datos.id) { existente = pedido[i]; break; }
    }
    if (existente) existente.cantidad += 1;
    else pedido.push({
      id: datos.id, nombre: datos.nombre, precio: datos.precio,
      unidad: datos.unidad, img: datos.img || '', cantidad: 1
    });
    guardarPedido(pedido);
    pintarCarrito();
  }

  function abrirPanel() {
    if (!panel || !velo) return;
    ultimoFoco = document.activeElement;
    velo.hidden = false; panel.hidden = false;
    requestAnimationFrame(function () { velo.classList.add('visible'); panel.classList.add('visible'); });
    document.body.style.overflow = 'hidden';
    var cerrar = $('[data-panel-cerrar]', panel);
    if (cerrar) cerrar.focus();
  }
  function cerrarPanel() {
    if (!panel || !velo) return;
    velo.classList.remove('visible'); panel.classList.remove('visible');
    document.body.style.overflow = '';
    window.setTimeout(function () { velo.hidden = true; panel.hidden = true; }, 260);
    if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
  }

  $$('[data-carrito-abrir]').forEach(function (b) { b.addEventListener('click', abrirPanel); });
  $$('[data-panel-cerrar]').forEach(function (b) { b.addEventListener('click', cerrarPanel); });
  if (velo) velo.addEventListener('click', cerrarPanel);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel && !panel.hidden) cerrarPanel();
  });

  function datosDeTarjeta(tarjeta) {
    var foto = tarjeta.querySelector('img');
    return {
      id: tarjeta.dataset.id,
      nombre: tarjeta.dataset.nombre,
      precio: parseFloat(tarjeta.dataset.precio) || 0,
      unidad: tarjeta.dataset.unidad || '',
      // .src (no getAttribute) devuelve la URL absoluta: el panel del carrito
      // vive en todas las páginas y las rutas relativas no coincidirían.
      img: foto ? foto.src : ''
    };
  }

  function quitarUno(id) {
    for (var i = 0; i < pedido.length; i++) {
      if (pedido[i].id === id) { cambiarCantidad(i, -1); return; }
    }
  }

  /* Un solo oyente para "Agregar al pedido" y para el + / − de las tarjetas */
  document.addEventListener('click', function (e) {
    if (!e.target.closest) return;
    var accion = e.target.closest('[data-agregar], [data-sumar], [data-quitar]');
    if (!accion) return;
    var tarjeta = accion.closest('[data-producto]');
    if (!tarjeta) return;

    if (accion.hasAttribute('data-quitar')) {
      quitarUno(tarjeta.dataset.id);
      return;
    }

    agregar(datosDeTarjeta(tarjeta));

    // Al agregar por primera vez el botón se reemplaza por el contador; se
    // mueve el foco al "+" para que el teclado no lo pierda. Con el ratón no
    // se ve nada porque el anillo de foco es :focus-visible.
    if (accion.hasAttribute('data-agregar')) {
      var mas = $('[data-sumar]', tarjeta);
      if (mas) mas.focus();
    }
  });

  /* --- Mensaje de WhatsApp ------------------------------------------------ */
  function resumenPedido() {
    if (!pedido.length) return '';
    var lineas = pedido.map(function (l) {
      return '• ' + l.cantidad + ' x ' + l.nombre +
        (l.unidad ? ' (' + l.unidad + ')' : '') +
        '';
    });
    return lineas.join('\n');
  }

  function abrirWhatsApp(texto) {
    if (!WHATSAPP) { window.alert('Configurá el número de WhatsApp en datos/negocio.json'); return; }
    var url = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(texto);
    window.open(url, '_blank', 'noopener');
  }

  var btnEnviar = $('[data-enviar-wa]');
  if (btnEnviar) {
    btnEnviar.addEventListener('click', function () {
      if (!pedido.length) return;
      abrirWhatsApp(
        '¡Hola Cefas Panadería! Quiero hacer un encargo:\n\n' + resumenPedido() +
        '\n\n¿Me confirman disponibilidad y hora de entrega, por favor?'
      );
    });
  }

  var btnVaciar = $('[data-vaciar]');
  if (btnVaciar) {
    btnVaciar.addEventListener('click', function () {
      if (!pedido.length) return;
      if (!window.confirm('¿Vaciar el pedido?')) return;
      pedido = [];
      guardarPedido(pedido);
      pintarCarrito();
    });
  }

  /* --- Filtros y buscador del menú ---------------------------------------- */
  var bloques = $$('[data-categoria-bloque]');
  if (bloques.length) {
    var filtros = $$('[data-filtro]');
    var buscador = $('[data-buscador]');
    var sinResultados = $('[data-sin-resultados]');
    var categoriaActiva = 'todas';

    function aplicar() {
      var q = normalizar(buscador ? buscador.value.trim() : '');
      var visibles = 0;

      bloques.forEach(function (bloque) {
        var coincideCat = categoriaActiva === 'todas' || bloque.dataset.categoriaBloque === categoriaActiva;
        var enBloque = 0;

        $$('[data-producto]', bloque).forEach(function (card) {
          var texto = normalizar(card.dataset.buscar || card.textContent);
          var coincide = coincideCat && (!q || texto.indexOf(q) !== -1);
          card.hidden = !coincide;
          if (coincide) enBloque++;
        });

        bloque.hidden = enBloque === 0;
        visibles += enBloque;
      });

      if (sinResultados) sinResultados.hidden = visibles > 0;
    }

    filtros.forEach(function (btn) {
      btn.addEventListener('click', function () {
        categoriaActiva = btn.dataset.filtro;
        filtros.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        aplicar();
      });
    });
    if (buscador) buscador.addEventListener('input', aplicar);
  }

  /* --- Formulario de encargos --------------------------------------------- */
  var form = $('[data-form-encargo]');
  if (form) {
    var hoy = new Date();
    hoy.setDate(hoy.getDate() + 1);
    var fecha = $('#fecha', form);
    if (fecha) fecha.min = hoy.toISOString().slice(0, 10);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var d = new FormData(form);
      var v = function (k) { return (d.get(k) || '').toString().trim(); };

      var partes = [
        '¡Hola Cefas Panadería! Quiero hacer un encargo.',
        '',
        '*Nombre:* ' + v('nombre'),
        '*Teléfono:* ' + v('telefono'),
        '*Tipo de pedido:* ' + v('tipo'),
        ...(v('producto') ? ['*Producto principal:* ' + v('producto')] : []),
        '*Fecha de entrega:* ' + v('fecha') + (v('hora') ? ' a las ' + v('hora') : ''),
        '*Entrega:* ' + v('entrega') + (v('zona') ? ' — ' + v('zona') : '')
      ];

      var resumen = resumenPedido();
      if (resumen) partes.push('', '*Productos seleccionados:*', resumen);
      if (v('detalle')) partes.push('', '*Detalle del pedido:*', v('detalle'));

      abrirWhatsApp(partes.join('\n'));

      var ok = $('[data-form-ok]', form.parentNode) || $('[data-form-ok]');
      if (ok) ok.hidden = false;
    });
  }

  pintarCarrito();
})();
