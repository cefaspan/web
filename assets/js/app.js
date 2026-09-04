/* ==========================================================================
   Cefas Panadería — cotizaciones por encargo
   Sin dependencias. Los productos viven en el HTML (bueno para SEO); este
   script sólo los lee desde los atributos data-* de cada tarjeta.
   En este sitio no hay precios: el panel arma una lista de lo que querés
   cotizar y la manda por WhatsApp.
   ========================================================================== */
(function () {
  'use strict';

  // Clave nueva: las cotizaciones guardadas con la versión anterior traían
  // precios y ya no aplican, así que no se reutilizan.
  var CLAVE = 'cefas_cotizacion_v1';
  var cfg = document.body.dataset;
  var WHATSAPP = cfg.whatsapp || '';

  /* --- Utilidades --------------------------------------------------------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
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
  // Se enciende al abrir WhatsApp con la lista y se apaga con cualquier cambio:
  // mientras está encendido, el panel y el formulario ofrecen vaciar la lista.
  var recienEnviado = false;

  function guardarPedido(lista) {
    recienEnviado = false;
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
  var unidadesEls = $$('[data-carrito-unidades]');
  var contadores = $$('[data-carrito-contador]');
  var barraVenta = $('[data-barra-venta]');
  var notaEnviado = $('[data-enviado]');
  var trasEnviar = $$('[data-si-enviado]');
  var ultimoFoco = null;

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
    // La barra fija sólo aparece cuando hay algo que cotizar
    if (barraVenta) barraVenta.hidden = !hay;
    document.body.classList.toggle('con-barra-venta', hay);
    // Tras abrir WhatsApp con la lista, se ofrece vaciarla; si no queda
    // nada o el cliente sigue editando, el ofrecimiento se retira.
    var ofrecerVaciar = recienEnviado && hay;
    if (notaEnviado) notaEnviado.hidden = !ofrecerVaciar;
    trasEnviar.forEach(function (el) { el.hidden = !ofrecerVaciar; });
  }

  /* Crea el contador (− 2 +) de una tarjeta. No viene en el HTML: son decenas
     de tarjetas por página y sólo hace falta cuando ya está en la lista. */
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
      det.className = 'linea-carrito__unidad';
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

  /* cantidad: cuántas unidades sumar (1 por defecto). fijar: en vez de sumar,
     dejar exactamente esa cantidad; lo usa la calculadora para que apretar
     "Agregar todo" dos veces no duplique la sugerencia.                 */
  function agregar(datos, cantidad, fijar) {
    var n = Math.max(1, parseInt(cantidad, 10) || 1);
    var existente = null;
    for (var i = 0; i < pedido.length; i++) {
      if (pedido[i].id === datos.id) { existente = pedido[i]; break; }
    }
    if (existente) existente.cantidad = fijar ? n : existente.cantidad + n;
    else pedido.push({
      id: datos.id, nombre: datos.nombre,
      unidad: datos.unidad, img: datos.img || '', cantidad: n
    });
    guardarPedido(pedido);
    pintarCarrito();
  }

  /* El panel es un diálogo modal: bloquea el scroll del fondo y lo tapa con
     el velo, así que el tabulador no puede salirse a un contenido que no se
     ve. El marcado lleva role="dialog" y aria-modal="true"; el encierro del
     foco lo hace este código.                                            */
  var FOCALIZABLES = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

  function focoDelPanel() {
    return $(FOCALIZABLES, panel).filter(function (el) {
      return !el.hidden && el.offsetParent !== null;
    });
  }

  function encerrarFoco(e) {
    if (e.key !== 'Tab' || !panel || panel.hidden) return;
    var lista = focoDelPanel();
    if (!lista.length) return;
    var primero = lista[0];
    var ultimo = lista[lista.length - 1];
    if (!panel.contains(document.activeElement)) {
      e.preventDefault();
      primero.focus();
    } else if (e.shiftKey && document.activeElement === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primero.focus();
    }
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
    // El foco se devuelve cuando el panel ya está oculto: si se devolvía antes,
    // un Tab durante los 260 ms de la animación volvía a entrar al panel.
    window.setTimeout(function () {
      velo.hidden = true; panel.hidden = true;
      if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
      ultimoFoco = null;
    }, 260);
  }

  $$('[data-carrito-abrir]').forEach(function (b) { b.addEventListener('click', abrirPanel); });
  $$('[data-panel-cerrar]').forEach(function (b) { b.addEventListener('click', cerrarPanel); });
  if (velo) velo.addEventListener('click', cerrarPanel);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel && !panel.hidden) { cerrarPanel(); return; }
    encerrarFoco(e);
  });

  function datosDeTarjeta(tarjeta) {
    var foto = tarjeta.querySelector('img');
    return {
      id: tarjeta.dataset.id,
      nombre: tarjeta.dataset.nombre,
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
        '¡Hola Cefas Panadería! Quiero cotizar este encargo:\n\n' + resumenPedido() +
        '\n\n¿Me pasan la cotización y la hora de entrega, por favor?'
      );
      recienEnviado = true;
      pintarContador();
    });
  }

  /* Hay un botón de vaciar en el panel y otro en el aviso de éxito del formulario */
  $$('[data-vaciar]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!pedido.length) return;
      if (!window.confirm('¿Vaciar la cotización?')) return;
      pedido = [];
      guardarPedido(pedido);
      pintarCarrito();
    });
  });

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

    var idsCategoria = bloques.map(function (b) { return b.dataset.categoriaBloque; });

    function activar(id, actualizarUrl) {
      categoriaActiva = idsCategoria.indexOf(id) !== -1 ? id : 'todas';
      filtros.forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.filtro === categoriaActiva));
      });
      aplicar();
      // El filtro vive en el hash (#pan-dulce), el mismo que usan las anclas
      // de categoría: así el enlace se puede compartir y "atrás" lo respeta.
      // replaceState no hace scroll ni ensucia el historial.
      if (actualizarUrl && window.history && history.replaceState) {
        var url = location.pathname + location.search + (categoriaActiva === 'todas' ? '' : '#' + categoriaActiva);
        history.replaceState(null, '', url);
      }
    }

    filtros.forEach(function (btn) {
      btn.addEventListener('click', function () { activar(btn.dataset.filtro, true); });
    });
    if (buscador) buscador.addEventListener('input', aplicar);

    // Al llegar con menu/#pan-dulce (desde una tarjeta de categoría o un
    // enlace compartido) se filtra esa categoría. Otros hashes de la página
    // (#contenido del enlace de salto, por ejemplo) no tocan el filtro.
    var desdeHash = function () {
      var id = location.hash.replace('#', '');
      if (!id || idsCategoria.indexOf(id) !== -1) activar(id || 'todas', false);
    };
    window.addEventListener('hashchange', desdeHash);
    if (location.hash) desdeHash();
  }

  /* --- Fecha y hora de entrega ---------------------------------------------
     El campo de fecha tenía min = mañana, y con eso se colaban tres cosas:
     mañana a las 06:00 son menos de las {anticipacion} horas que pedimos si
     hoy ya es tarde; los domingos se aceptaban con la panadería cerrada; y el
     mínimo se calculaba con toISOString(), que en Guatemala (UTC−6) salta un
     día a partir de las 18:00. Acá se valida fecha y hora juntas contra el
     horario real, que llega en data-horarios como "1-5:06:00-20:00;…".   */
  function parsearHorarios(txt) {
    var mapa = {};
    String(txt || '').split(';').forEach(function (bloque) {
      var corte = bloque.indexOf(':');
      if (corte === -1) return;
      var dias = bloque.slice(0, corte);
      var resto = bloque.slice(corte + 1);
      var rango = resto === 'cerrado' ? null : resto.split('-');
      var nums = [];
      if (dias.indexOf('-') !== -1) {
        var ext = dias.split('-');
        for (var d = Number(ext[0]); d <= Number(ext[1]); d++) nums.push(d);
      } else {
        nums.push(Number(dias));
      }
      nums.forEach(function (dia) {
        mapa[dia] = rango ? { abre: rango[0], cierra: rango[1] } : null;
      });
    });
    return mapa;
  }

  function minutosDe(hhmm) {
    var p = String(hhmm).split(':');
    return Number(p[0]) * 60 + Number(p[1]);
  }
  /* Fecha local en formato YYYY-MM-DD. No se usa toISOString(): eso da UTC. */
  function isoLocal(d) {
    var mes = String(d.getMonth() + 1);
    var dia = String(d.getDate());
    return d.getFullYear() + '-' +
      (mes.length < 2 ? '0' + mes : mes) + '-' +
      (dia.length < 2 ? '0' + dia : dia);
  }
  function fechaDeCampo(valor) {
    var p = String(valor).split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }
  function conMinutos(base, min) {
    var d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    d.setMinutes(min);
    return d;
  }

  /* --- Formulario de encargos --------------------------------------------- */
  var form = $('[data-form-encargo]');
  if (form) {
    var ANTICIPACION = Number(cfg.anticipacion) || 24;
    var HORARIO = parsearHorarios(cfg.horarios);
    var fecha = $('#fecha', form);
    var hora = $('#hora', form);

    /* Primer día que todavía deja una ventana de entrega después del mínimo */
    function primerDiaValido() {
      var limite = new Date(Date.now() + ANTICIPACION * 3600000);
      var d = limite;
      for (var i = 0; i < 21; i++) {
        var h = HORARIO[d.getDay()];
        if (h && (i > 0 || conMinutos(d, minutosDe(h.cierra)) >= limite)) return d;
        d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      }
      return limite;
    }

    var MINIMO = primerDiaValido();
    if (fecha) fecha.min = isoLocal(MINIMO);

    function validarEntrega() {
      if (!fecha) return;
      fecha.setCustomValidity('');
      if (hora) hora.setCustomValidity('');
      if (!fecha.value) return;

      var elegido = fechaDeCampo(fecha.value);
      var h = HORARIO[elegido.getDay()];
      if (!h) {
        fecha.setCustomValidity('Ese día no horneamos. Elegí otro día, por favor.');
        return;
      }
      // Acota el selector de hora al horario de ese día concreto
      if (hora) { hora.min = h.abre; hora.max = h.cierra; }

      var limite = new Date(Date.now() + ANTICIPACION * 3600000);
      if (!hora || !hora.value) {
        // Sin hora sólo se puede comprobar que el día no cierre antes del mínimo
        if (conMinutos(elegido, minutosDe(h.cierra)) < limite) {
          fecha.setCustomValidity(
            'Necesitamos al menos ' + ANTICIPACION + ' horas de anticipación: ' +
            'la fecha más próxima es el ' + isoLocal(MINIMO) + '.'
          );
        }
        return;
      }

      var m = minutosDe(hora.value);
      if (m < minutosDe(h.abre) || m > minutosDe(h.cierra)) {
        hora.setCustomValidity('Ese día entregamos entre ' + h.abre + ' y ' + h.cierra + '.');
        return;
      }
      if (conMinutos(elegido, m) < limite) {
        hora.setCustomValidity('Necesitamos al menos ' + ANTICIPACION + ' horas de anticipación.');
      }
    }

    if (fecha) fecha.addEventListener('change', validarEntrega);
    if (hora) hora.addEventListener('change', validarEntrega);

    // La zona sólo hace falta si el pedido va a domicilio. Para recoger, el
    // campo se esconde y no se exige.
    var entrega = $('#entrega', form);
    var zona = $('#zona', form);
    if (entrega && zona) {
      var campoZona = zona.closest('.campo') || zona;
      var sincronizarZona = function () {
        var domicilio = /domicilio/i.test(entrega.value);
        zona.required = domicilio;
        campoZona.hidden = !domicilio;
        if (!domicilio) zona.value = '';
      };
      entrega.addEventListener('change', sincronizarZona);
      sincronizarZona();
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      validarEntrega();
      if (!form.reportValidity()) return;
      var d = new FormData(form);
      var v = function (k) { return (d.get(k) || '').toString().trim(); };

      var partes = [
        '¡Hola Cefas Panadería! Quiero cotizar un encargo.',
        '',
        '*Nombre:* ' + v('nombre'),
        '*Teléfono:* ' + v('telefono'),
        '*Tipo de pedido:* ' + v('tipo'),
        ...(v('producto') ? ['*Producto principal:* ' + v('producto')] : []),
        '*Fecha de entrega:* ' + v('fecha') + (v('hora') ? ' a las ' + v('hora') : ''),
        '*Entrega:* ' + v('entrega') + (v('zona') ? ' — ' + v('zona') : '')
      ];

      var resumen = resumenPedido();
      if (resumen) partes.push('', '*Productos a cotizar:*', resumen);
      if (v('detalle')) partes.push('', '*Detalle del pedido:*', v('detalle'));

      abrirWhatsApp(partes.join('\n'));

      var ok = $('[data-form-ok]', form.parentNode) || $('[data-form-ok]');
      if (ok) ok.hidden = false;
      recienEnviado = true;
      pintarContador();
    });
  }

  /* --- Calculadora ¿cuánto pan necesito? -----------------------------------
     Las reglas (piezas por persona y piezas por unidad de venta) vienen en
     un <script type="application/json"> generado desde datos/servicios.json.
     Se redondea hacia arriba a la presentación completa: nadie pide media
     bandeja. Si el grupo es más chico que el mínimo del tipo, se calcula
     para el mínimo y se avisa.                                            */
  var calc = $('[data-calculadora]');
  if (calc) {
    var TIPOS = [];
    try { TIPOS = JSON.parse(($('[data-calc-datos]') || {}).textContent || '[]'); } catch (e) { TIPOS = []; }

    var personasEl = $('#personas', calc);
    var tipoEl = $('#tipo-actividad', calc);
    var resultado = $('[data-calc-resultado]', calc);
    var lineasEl = $('[data-calc-lineas]', calc);
    var tituloEl = $('[data-calc-nota]', calc);
    var avisoEl = $('[data-calc-aviso]', calc);
    var btnCalcAgregar = $('[data-calc-agregar]', calc);
    var sugerencia = [];

    function tipoActivo() {
      for (var i = 0; i < TIPOS.length; i++) {
        if (TIPOS[i].id === tipoEl.value) return TIPOS[i];
      }
      return TIPOS[0] || null;
    }

    function calcular() {
      var personas = parseInt(personasEl.value, 10);
      var tipo = tipoActivo();
      if (!tipo || !personas || personas < 1) {
        resultado.hidden = true;
        sugerencia = [];
        return;
      }
      var base = Math.max(personas, tipo.minimo || 1);

      sugerencia = tipo.lineas.map(function (l) {
        var piezas = Math.ceil(base * l.porPersona);
        var unidades = Math.max(1, Math.ceil(piezas / l.piezas));
        return { linea: l, unidades: unidades, piezas: unidades * l.piezas };
      });

      tituloEl.textContent = 'Para ' + base + (base === 1 ? ' persona' : ' personas') + ', ' +
        tipo.nombre.charAt(0).toLowerCase() + tipo.nombre.slice(1) + ':';

      lineasEl.innerHTML = '';
      sugerencia.forEach(function (s) {
        var li = document.createElement('li');
        li.innerHTML = iconoHTML('check') + ' ';
        var texto = document.createElement('span');
        var detalle = s.linea.piezas > 1 ? ' — ' + s.piezas + ' piezas' : '';
        texto.textContent = s.unidades + ' × ' + s.linea.nombre + ' (' + s.linea.unidad + ')' + detalle;
        li.appendChild(texto);
        lineasEl.appendChild(li);
      });

      var pocos = personas < (tipo.minimo || 1);
      avisoEl.hidden = !pocos;
      if (pocos) {
        avisoEl.textContent = 'Este tipo de actividad lo servimos desde ' + tipo.minimo +
          ' personas, así que la sugerencia está calculada para ' + tipo.minimo + '.';
      }
      resultado.hidden = false;
    }

    calc.addEventListener('input', calcular);
    calc.addEventListener('submit', function (e) { e.preventDefault(); calcular(); });

    if (btnCalcAgregar) {
      btnCalcAgregar.addEventListener('click', function () {
        if (!sugerencia.length) return;
        sugerencia.forEach(function (s) {
          var l = s.linea;
          // La imagen viene relativa a la página; el panel vive en todas las
          // páginas, así que se guarda absoluta (igual que hace datosDeTarjeta).
          var img = '';
          try { img = new URL(l.img, window.location.href).href; } catch (e) { img = l.img; }
          agregar({ id: l.id, nombre: l.nombre, unidad: l.unidad, img: img }, s.unidades, true);
        });
        abrirPanel();
      });
    }
  }

  pintarCarrito();
})();
