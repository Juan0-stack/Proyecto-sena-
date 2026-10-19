(function () {
    'use strict';

    var REDUCE = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var TIENE_GSAP = typeof window.gsap !== 'undefined';
    var MOTION = (window.Motion && window.Motion.animado) ? window.Motion : null;
    var DURACION = { micro: 0.18, transicion: 0.18, entrada: 0.2, modal: 0.24, salidaModal: 0.18, stagger: 0.04 };
    var EASE = { entrada: 'power2.out', salida: 'power2.out' };
    var BODY = document.body;
    var ROL = BODY.getAttribute('data-rol') || '';
    var ID_USUARIO = parseInt(BODY.getAttribute('data-usuario-id') || '0', 10);
    /* Dos roles administrativos (spec §4): el Administrador conserva todo el
       poder; Gestión de Calidad tiene menos. */
    var ES_ADMIN = ROL === 'Administrador';
    var ES_CALIDAD = ROL === 'Gestión de Calidad';
    var ES_GESTION = ES_ADMIN || ES_CALIDAD;
    var ROLES_ADMINISTRATIVOS = ['Administrador', 'Gestión de Calidad'];
    var ENTRADA_DESDE_LOGIN = false;

    function completarEntradaLogin() {
        var esEntradaLogin = false;
        try {
            esEntradaLogin = sessionStorage.getItem('isailo-login-transition') === '1';
            if (esEntradaLogin) sessionStorage.removeItem('isailo-login-transition');
        } catch (error) { /* El panel sigue funcionando si el almacenamiento está bloqueado. */ }

        document.documentElement.classList.remove('transicion-login-entrada');
        if (!esEntradaLogin) return;
        if (MOTION) {
            ENTRADA_DESDE_LOGIN = true;
            MOTION.animateIn([BODY], { y: 6, duration: 420, stagger: 0 });
            return;
        }
        if (REDUCE || !TIENE_GSAP) return;

        ENTRADA_DESDE_LOGIN = true;
        gsap.set(BODY, { autoAlpha: 0, y: 6 });
        gsap.to(BODY, { autoAlpha: 1, y: 0, duration: DURACION.entrada, ease: EASE.entrada,
            clearProps: 'opacity,visibility,transform' });
    }

    var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    var DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    function $(sel, ctx) { return (ctx || document).querySelector(sel); }
    function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

    function esc(texto) {
        var div = document.createElement('div');
        div.textContent = texto === null || texto === undefined ? '' : String(texto);
        return div.innerHTML;
    }

    function animarEntrada(elementos, opciones) {
        opciones = opciones || {};
        if (elementos && elementos.length && MOTION) {
            MOTION.animateIn(elementos, {
                y: opciones.y === undefined ? 12 : opciones.y,
                duration: (opciones.duration || DURACION.entrada) * 1000,
                stagger: (opciones.stagger === undefined ? DURACION.stagger : opciones.stagger) * 1000
            });
            return;
        }
        if (REDUCE || !TIENE_GSAP || !elementos || !elementos.length) return;
        gsap.fromTo(elementos,
            { autoAlpha: 0, y: opciones.y === undefined ? 12 : opciones.y },
            { autoAlpha: 1, y: 0, duration: opciones.duration || DURACION.entrada,
                ease: EASE.entrada, stagger: opciones.stagger === undefined ? DURACION.stagger : opciones.stagger });
    }

    function scrollContenidoTop() {
        if (MOTION) { MOTION.scrollTop(true); return; }
        var cont = document.getElementById('contenido');
        if (cont) cont.scrollTop = 0;
        window.scrollTo({ top: 0 });
    }

    function dos(n) { return n < 10 ? '0' + n : '' + n; }

    function iso(d) { return d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' + dos(d.getDate()); }

    function hoyISO() { return iso(new Date()); }

    function fmtFecha(isoFecha) {
        if (!isoFecha) return '';
        var p = isoFecha.split('-');
        return p[2] + '/' + p[1] + '/' + p[0];
    }

    function fmtFechaLarga(isoFecha) {
        if (!isoFecha) return '';
        var p = String(isoFecha).split('-');
        if (p.length < 3) return String(isoFecha);
        var mes = MESES[parseInt(p[1], 10) - 1] || '';
        return parseInt(p[2], 10) + ' de ' + mes + ' de ' + p[0];
    }

    function fmtHoraCorta(valor) {
        return String(valor || '').slice(0, 5);
    }

    var MESES_ABREV = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

    function miles(n) {
        n = Math.round(Number(n) || 0);
        try { return new Intl.NumberFormat('es-CO').format(n); } catch (e) { return String(n); }
    }

    function sinAcentos(texto) {
        return String(texto == null ? '' : texto)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    function lunesDe(fecha) {
        var d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
        d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        return d;
    }

    function fmtDiaMes(d) {
        return d.getDate() + ' ' + MESES_ABREV[d.getMonth()];
    }

    function fmtHoraCelda(h) {
        var suf = h < 12 ? 'a.m.' : 'p.m.';
        var hh = h % 12;
        if (hh === 0) hh = 12;
        return hh + ':00 ' + suf;
    }

    function tiposUnicosEspacios() {
        var set = {};
        estado.espacios.forEach(function (e) { if (e.tipo) set[e.tipo.trim()] = true; });
        return Object.keys(set).sort();
    }

    var COLORES_DIST = { eventos: '#4C8DDB', solicitudes: '#C9A96E', maestros: '#7FCBA0', usuarios: '#B98BD6' };
    var COLORES_ESTADO = { aprobada: '#7FCBA0', pendiente: '#E0B65C', rechazada: '#E58A93' };

    function api(url, metodo, cuerpo) {
        var opciones = { method: metodo || 'GET', headers: { 'Content-Type': 'application/json' } };
        if (cuerpo) opciones.body = JSON.stringify(cuerpo);
        return fetch(url, opciones).then(function (r) {
            return r.json().then(function (data) { return data; }).catch(function () {
                return { ok: false, error: 'Respuesta inválida del servidor.' };
            });
        }).catch(function () {
            return { ok: false, error: 'No se pudo conectar con el servidor.' };
        });
    }

    function toast(mensaje, tipo) {
        var el = document.createElement('div');
        el.className = 'toast' + (tipo === 'error' ? ' toast--error' : ' toast--ok');
        el.textContent = mensaje;
        document.body.appendChild(el);
        if (MOTION) {
            MOTION.animateIn([el], { y: 12, duration: 220, stagger: 0 });
            setTimeout(function () {
                MOTION.animateOut([el], { y: 8, duration: 220, complete: function () { el.remove(); } });
            }, 2600);
        } else if (!REDUCE && TIENE_GSAP) {
            gsap.fromTo(el, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: DURACION.entrada, ease: EASE.entrada });
            gsap.to(el, { autoAlpha: 0, y: 8, duration: DURACION.transicion, delay: 2.6, ease: EASE.salida, onComplete: function () { el.remove(); } });
        } else {
            setTimeout(function () { el.remove(); }, 2800);
        }
    }

    var estado = {
        espacios: [],
        filtroTipo: '',
        opMes: new Date().getMonth(),
        opAnio: new Date().getFullYear(),
        ocupOp: [],
        eventos: [],
        calAnio: new Date().getFullYear(),
        usuarios: [],
        docentes: [],
        solicitudes: [],
        semanaBase: null,
        semanaOp: [],
        semanaTipo: '',
        solBusqueda: '',
        solTipo: '',
        usuFiltroRol: 'Docente',
        espacioEditandoId: null,
        usuarioEditandoId: null,
        eventoEditandoId: null,
        solEspacio: null,
        miniAnio: null,
        miniMes: null,
        miniOcupacion: {},
        campanaEspacio: null,
        campanaIndice: 0,
        confirmCallback: null
    };

    /* ================= MODALES ================= */

    function abrirModal(id) {
        var overlay = document.getElementById(id);
        if (!overlay) return;
        overlay.classList.add('modal-overlay--abierto');
        if (MOTION) stopScrollSiAplica();
        if (MOTION) {
            MOTION.animateIn([overlay], { y: 0, duration: 200, stagger: 0 });
            MOTION.animateIn([$('.modal', overlay)], { y: 10, scale: 0.96, duration: 260, stagger: 0 });
            return;
        }
        if (!REDUCE && TIENE_GSAP) {
            gsap.set(overlay, { autoAlpha: 1 });
            gsap.fromTo($('.modal', overlay),
                { autoAlpha: 0, scale: 0.96, y: 10 },
                { autoAlpha: 1, scale: 1, y: 0, duration: DURACION.modal, ease: EASE.entrada });
        }
    }

    function stopScrollSiAplica() {
        if (MOTION) MOTION.stopScroll();
    }

    function startScrollSiAplica() {
        if (MOTION && !$('.modal-overlay.modal-overlay--abierto')) MOTION.startScroll();
    }

    function cerrarModal(id) {
        var overlay = document.getElementById(id);
        if (!overlay || !overlay.classList.contains('modal-overlay--abierto')) return;
        var terminar = function () {
            overlay.classList.remove('modal-overlay--abierto');
            if (TIENE_GSAP) gsap.set(overlay, { clearProps: 'all' });
            else if (MOTION) { overlay.style.opacity = ''; }
            startScrollSiAplica();
        };
        if (MOTION) {
            MOTION.animateOut([overlay], { y: 8, duration: 200, complete: terminar });
            return;
        }
        if (!REDUCE && TIENE_GSAP) {
            gsap.to($('.modal', overlay), { autoAlpha: 0, scale: 0.97, duration: DURACION.salidaModal, ease: EASE.salida });
            gsap.to(overlay, { autoAlpha: 0, duration: DURACION.salidaModal, ease: EASE.salida, onComplete: terminar });
        } else {
            terminar();
        }
    }

    function initModales() {
        document.addEventListener('click', function (ev) {
            var cerrar = ev.target.closest('[data-cerrar]');
            if (cerrar) { cerrarModal(cerrar.closest('.modal-overlay').id); return; }
            if (ev.target.classList && ev.target.classList.contains('modal-overlay')) {
                cerrarModal(ev.target.id);
            }
        });
        document.addEventListener('keydown', function (ev) {
            if (ev.key === 'Escape') {
                $$('.modal-overlay.modal-overlay--abierto').forEach(function (o) { cerrarModal(o.id); });
            }
        });

        var aceptar = $('#confirmAceptar');
        if (aceptar) {
            aceptar.addEventListener('click', function () {
                cerrarModal('modalConfirm');
                if (estado.confirmCallback) { estado.confirmCallback(); estado.confirmCallback = null; }
            });
        }
    }

    function confirmar(titulo, mensaje, callback) {
        $('#confirmTitulo').textContent = titulo;
        $('#confirmMensaje').textContent = mensaje;
        estado.confirmCallback = callback;
        abrirModal('modalConfirm');
    }

    /* ================= PESTAÑAS ================= */

    function initMenu() {
        /* --- Docente/Estudiante: menú horizontal con hamburguesa --- */
        var hamburguesa = $('#hamburguesa');
        var lista = $('.nav__lista');
        if (hamburguesa && lista && !document.getElementById('sidebar')) {
            hamburguesa.addEventListener('click', function () { lista.classList.toggle('abierto'); });
            $$('.nav__enlace', lista).forEach(function (e) {
                e.addEventListener('click', function () { lista.classList.remove('abierto'); });
            });
        }

        /* --- Gestión de Calidad: barra lateral colapsable + menú de usuario --- */
        var sidebar = document.getElementById('sidebar');
        if (sidebar) {
            var CLAVE = 'isailo-panel-colapsado';
            var colapsada = false;
            try { colapsada = localStorage.getItem(CLAVE) === '1'; } catch (e) { colapsada = false; }
            if (colapsada) BODY.classList.add('sidebar-colapsada');

            var botonColapsar = $('#sidebarToggle');
            if (botonColapsar) {
                botonColapsar.setAttribute('aria-expanded', colapsada ? 'false' : 'true');
                botonColapsar.addEventListener('click', function () {
                    var ahora = BODY.classList.toggle('sidebar-colapsada');
                    botonColapsar.setAttribute('aria-expanded', ahora ? 'false' : 'true');
                    botonColapsar.setAttribute('aria-label', ahora ? 'Expandir menú' : 'Colapsar menú');
                    botonColapsar.title = ahora ? 'Expandir menú' : 'Colapsar menú';
                    try { localStorage.setItem(CLAVE, ahora ? '1' : '0'); } catch (e) { /* sin almacenamiento */ }
                });
            }

            function cerrarSidebarMovil() { BODY.classList.remove('sidebar-abierta'); var b = $('#sidebarAbrir'); if (b) b.setAttribute('aria-expanded', 'false'); }
            var abrir = $('#sidebarAbrir');
            if (abrir) {
                abrir.addEventListener('click', function () {
                    var abierta = BODY.classList.toggle('sidebar-abierta');
                    abrir.setAttribute('aria-expanded', abierta ? 'true' : 'false');
                });
            }
            var velo = $('#sidebarVelo');
            if (velo) velo.addEventListener('click', cerrarSidebarMovil);
            $$('.nav__enlace', sidebar).forEach(function (e) {
                e.addEventListener('click', cerrarSidebarMovil);
            });

            /* Menú desplegable de usuario */
            var botonUsu = $('#usuarioBoton');
            var menuUsu = $('#usuarioMenu');
            if (botonUsu && menuUsu) {
                var alternar = function (mostrar) {
                    menuUsu.hidden = !mostrar;
                    botonUsu.setAttribute('aria-expanded', mostrar ? 'true' : 'false');
                };
                botonUsu.addEventListener('click', function (ev) {
                    ev.stopPropagation();
                    alternar(menuUsu.hidden);
                });
                document.addEventListener('click', function (ev) {
                    if (!menuUsu.hidden && !ev.target.closest('#usuarioMenu') && !ev.target.closest('#usuarioBoton')) alternar(false);
                });
                document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') alternar(false); });
            }
        }
    }

    /* ------------------------------------------------------------------
       showSection(id) — ÚNICA función de entrada a una sección/pestaña.
       La usan el menú lateral, los atajos (data-ir), las tarjetas y el
       botón "Volver al inicio". Garantías (spec §2):
         - Se pinta la sección nueva ANTES de animar: nunca queda una
           pantalla vacía.
         - Nunca se queda a medias: estado final fijado + red de 800 ms.
         - Clic rápido: la última petición gana y arranca de inmediato.
         - El estado (colapsado/expandido) de la barra lateral no se toca.
       ------------------------------------------------------------------ */
    var vistaActualId = null;

    function limpiarEstilos(v) {
        if (!v) return;
        v.style.opacity = '';
        v.style.transform = '';
        v.style.willChange = '';
        v.style.visibility = '';
    }

    function actualizarMenu(id) {
        var enlaces = $$('.nav__enlace[data-vista]');
        var activo = null;
        enlaces.forEach(function (e) {
            var coincide = e.getAttribute('data-vista') === id;
            e.classList.toggle('nav__enlace--activo', coincide);
            if (coincide) activo = e;
        });
        if (MOTION) MOTION.moveIndicator(activo);
        return activo;
    }

    function showSection(id) {
        var nueva = document.getElementById(id);
        if (!nueva) return null;

        /* La última petición gana: invalida cualquier transición en curso. */
        if (MOTION && MOTION.cancelarTransicion) MOTION.cancelarTransicion();

        /* Saliente = la sección que se estaba mostrando. */
        var anterior = vistaActualId ? document.getElementById(vistaActualId) : null;
        if (anterior === nueva) anterior = null;

        /* Cualquier otra sección que quedara marcada como activa se limpia,
           para no tener dos secciones visibles a la vez. */
        $$('.vista').forEach(function (v) {
            if (v !== nueva && v !== anterior && v.classList.contains('vista--activa')) {
                v.classList.remove('vista--activa');
                limpiarEstilos(v);
            }
        });

        vistaActualId = id;
        actualizarMenu(id);

        /* ¿Ya está visible y no hay saliente? Solo refrescar. */
        if (!anterior && nueva.classList.contains('vista--activa')) {
            if (MOTION) MOTION.revealIn(nueva);
            scrollContenidoTop();
            return nueva;
        }

        /* Sin animación disponible: cambio directo con estado final. */
        if (!anterior || REDUCE || !MOTION) {
            if (anterior) {
                anterior.classList.remove('vista--activa');
                limpiarEstilos(anterior);
            }
            nueva.classList.add('vista--activa');
            if (MOTION) { MOTION.estadoFinalVista(nueva); MOTION.revealIn(nueva); }
            scrollContenidoTop();
            return nueva;
        }

        /* Fundido cruzado. Al terminar, subimos el scroll. */
        MOTION.transitionTo(anterior, nueva, { done: function () { scrollContenidoTop(); } });
        return nueva;
    }

    /* Alias histórico: el resto del código puede seguir llamando activarVista. */
    function activarVista(id) { return showSection(id); }

    if (typeof window !== 'undefined') window.showSection = showSection;

    function initTabs() {
        $$('.nav__enlace[data-vista]').forEach(function (enl) {
            enl.addEventListener('click', function (ev) {
                ev.preventDefault();
                activarVista(this.getAttribute('data-vista'));
            });
        });
    }

    function entradaInicial() {
        if (MOTION) {
            var sidebar = document.getElementById('sidebar');
            if (sidebar) {
                var perfil = $('.app-sidebar__perfil');
                if (perfil) MOTION.revealIn(sidebar);
                animarEntrada($$('.app-sidebar .nav__enlace'), { y: 10, duration: 0.4, stagger: 0.05 });
                var cabecera = $('#header');
                if (cabecera) animarEntrada([cabecera], { y: -8, duration: 0.4, stagger: 0 });
            }
            var activa = $('.vista--activa');
            if (activa) MOTION.revealIn(activa);
            return;
        }
        if (REDUCE || !TIENE_GSAP || ENTRADA_DESDE_LOGIN) return;
        var hijos = $$('.vista--activa > *');
        animarEntrada(hijos, { y: 14, duration: 0.32, stagger: 0.05 });
    }

    /* ================= UTILIDADES DOMINIO ================= */

    function iconoPorTipo(tipo) {
        var t = (tipo || '').toLowerCase();
        if (t.indexOf('lab') >= 0) return 'fa-flask';
        if (t.indexOf('audio') >= 0 || t.indexOf('teatr') >= 0) return 'fa-theater-masks';
        if (t.indexOf('ofic') >= 0 || t.indexOf('rector') >= 0) return 'fa-building';
        if (t.indexOf('biblio') >= 0) return 'fa-book';
        if (t.indexOf('cancha') >= 0 || t.indexOf('deport') >= 0) return 'fa-futbol';
        if (t.indexOf('sala') >= 0) return 'fa-couch';
        return 'fa-school';
    }

    function badgeEstado(estadoTxt) {
        var clase = ['Disponible', 'Ocupado', 'Mantenimiento'].indexOf(estadoTxt) >= 0 ? estadoTxt : 'Disponible';
        return '<span class="estado-badge estado-badge--' + clase + '"><i class="fas fa-circle"></i> ' +
            esc(estadoTxt) + '</span>';
    }

    function badgeSol(estadoSol) {
        return '<span class="estado-sol estado-sol--' + esc(estadoSol) + '">' + esc(estadoSol) + '</span>';
    }

    function seSolapan(ini1, fin1, ini2, fin2) {
        return ini1 < fin2 && fin1 > ini2;
    }

    /* ================= ESPACIOS ================= */

    function cargarEspacios() {
        return api('/api/espacios').then(function (res) {
            if (res.ok) estado.espacios = res.espacios || [];
            pintarFiltroTipos();
            pintarEspacios();
            if (ROL !== 'Estudiante') {
                pintarCalOperativo();
                pintarChipsCalendario();
            }
            pintarUsuarios();
        });
    }

    function pintarFiltroTipos() {
        var tipos = {};
        estado.espacios.forEach(function (e) { if (e.tipo) tipos[e.tipo.trim()] = true; });
        var lista = Object.keys(tipos).sort();
        [
            ['#filtroTipo', 'Todos los tipos'],
            ['#solFiltroTipo', 'Todos los tipos'],
            ['#calFiltroTipo', 'Todos los tipos de salón']
        ].forEach(function (par) {
            var sel = $(par[0]);
            if (!sel) return;
            var valor = sel.value;
            sel.innerHTML = '<option value="">' + par[1] + '</option>' + lista.map(function (t) {
                return '<option value="' + esc(t) + '">' + esc(t) + '</option>';
            }).join('');
            sel.value = valor;
            if (sel.selectedIndex === -1) sel.value = '';
        });
    }

    function espaciosFiltrados() {
        if (!estado.filtroTipo) return estado.espacios;
        return estado.espacios.filter(function (e) { return e.tipo === estado.filtroTipo; });
    }

    function accionesPorRol(e) {
        var botones = '';
        if (ES_GESTION) {
            botones += '<button class="btn-admin btn-admin--primario" data-accion="editar" data-id="' + e.id_espacio + '"><i class="fas fa-pen"></i> Editar</button>';
            botones += '<button class="btn-admin btn-admin--outline" data-accion="solicitudes" data-id="' + e.id_espacio + '"><i class="fas fa-list"></i> Solicitudes</button>';
            /* Eliminar espacios es exclusivo del Administrador (spec §4). */
            if (ES_ADMIN) {
                botones += '<button class="btn-admin btn-admin--danger" data-accion="eliminar" data-id="' + e.id_espacio + '"><i class="fas fa-trash"></i> Eliminar</button>';
            }
        } else if (ROL === 'Docente') {
            if (e.estado !== 'Mantenimiento') {
                botones += '<button class="btn-admin btn-admin--primario" data-accion="solicitar" data-id="' + e.id_espacio + '"><i class="fas fa-calendar-plus"></i> Solicitar</button>';
            }
            if (e.id_usuario_encargado === ID_USUARIO) {
                botones += '<button class="btn-admin btn-admin--outline" data-accion="solicitudes" data-id="' + e.id_espacio + '"><i class="fas fa-inbox"></i> Solicitudes de mi espacio</button>';
            }
        }
        return botones;
    }

    function pintarEspacios() {
        var cont = $('#listaEspacios');
        if (!cont) return;
        var lista = espaciosFiltrados();

        if (!lista.length) {
            cont.innerHTML = '<p class="acordeon-vacia">' +
                (estado.espacios.length
                    ? 'No hay espacios que coincidan con el filtro seleccionado.'
                    : 'Todavía no hay espacios registrados.') +
                '</p>';
            return;
        }

        cont.innerHTML = lista.map(function (e) {
            var esMio = ROL === 'Docente' && e.id_usuario_encargado === ID_USUARIO;
            var meta = badgeEstado(e.estado);
            if (e.destacado) meta += ' <span class="badge-mini"><i class="fas fa-star"></i> Destacado</span>';
            if (esMio) meta += ' <span class="badge-mini"><i class="fas fa-key"></i> Mi espacio</span>';

            var campanaHtml = '';
            if (ROL !== 'Estudiante') {
                var pendientes = pendientesDeEspacio(e.id_espacio);
                if (pendientes.length > 0) {
                    campanaHtml = '<button type="button" class="campana-boton" data-accion="campana" data-id="' +
                        e.id_espacio + '" title="' + pendientes.length + ' solicitud(es) pendiente(s) por revisar" aria-label="Ver solicitudes pendientes">' +
                        '<i class="fas fa-bell"></i><span class="campana-boton__badge">' + pendientes.length + '</span></button>';
                }
            }

            var detalle =
                '<div class="espacio-detalle__contenido">' +
                    (e.descripcion ? '<p class="espacio-detalle__texto">' + esc(e.descripcion) + '</p>' : '') +
                    '<p class="espacio-detalle__texto"><strong>Tipo:</strong> ' + esc(e.tipo || 'Sin tipo') +
                    (e.capacidad ? ' · <strong>Capacidad:</strong> ' + e.capacidad + ' personas' : '') +
                    ' · <strong>Encargado:</strong> ' + esc(e.encargado_nombre || 'Sin asignar') + '</p>' +
                    '<div class="espacio-detalle__acciones">' + accionesPorRol(e) + '</div>' +
                    '<div class="solicitudes-zona" id="zonaSol-' + e.id_espacio + '" hidden></div>' +
                '</div>';

            return '<article class="espacio-fila" data-espacio="' + e.id_espacio + '">' +
                '<div class="espacio-fila__principal">' +
                    '<div class="espacio-fila__icono"><i class="fas ' + iconoPorTipo(e.tipo) + '"></i></div>' +
                    '<div><span class="espacio-fila__nombre">' + esc(e.nombre) + '</span>' +
                        '<div class="espacio-fila__meta">' + meta + '</div></div>' +
                    campanaHtml +
                    '<i class="fas fa-chevron-down espacio-fila__chevron"></i>' +
                '</div>' +
                '<div class="espacio-detalle">' + detalle + '</div>' +
            '</article>';
        }).join('');

        animarEntrada($$('.espacio-fila', cont), { y: 12, duration: DURACION.entrada, stagger: 0.04 });
    }

    function alternarFila(principal) {
        var filaEl = principal.closest('.espacio-fila');
        var detalle = $('.espacio-detalle', filaEl);
        var abierta = filaEl.classList.contains('espacio-fila--abierta');

        if (abierta) {
            filaEl.classList.remove('espacio-fila--abierta');
            if (!REDUCE && TIENE_GSAP) {
                gsap.to(detalle, { height: 0, autoAlpha: 0, duration: DURACION.transicion, ease: EASE.salida,
                    onComplete: function () { detalle.style.display = 'none'; gsap.set(detalle, { clearProps: 'height,opacity,visibility' }); } });
            } else {
                detalle.style.display = 'none';
            }
            return;
        }

        filaEl.classList.add('espacio-fila--abierta');
        detalle.style.display = 'block';
        if (!REDUCE && TIENE_GSAP) {
            gsap.fromTo(detalle, { height: 0, autoAlpha: 0 },
                { height: 'auto', autoAlpha: 1, duration: DURACION.entrada, ease: EASE.entrada,
                    onComplete: function () { gsap.set(detalle, { height: 'auto', clearProps: 'opacity,visibility' }); } });
        }
    }

    function alternarZonaSolicitudes(idEspacio, boton) {
        var zona = document.getElementById('zonaSol-' + idEspacio);
        if (!zona) return;

        if (!zona.hidden) {
            zona.hidden = true;
            zona.innerHTML = '';
            if (boton) boton.classList.remove('btn-admin--primario');
            return;
        }

        zona.hidden = false;
        zona.innerHTML = '<p class="tabla-vacia">Cargando solicitudes…</p>';
        if (boton) boton.classList.add('btn-admin--primario');

        var delEspacio = estado.solicitudes.filter(function (s) { return s.id_espacio === idEspacio; })
            .sort(function (a, b) {
                if ((a.estado === 'pendiente') !== (b.estado === 'pendiente')) return a.estado === 'pendiente' ? -1 : 1;
                return String(b.fecha_solicitud).localeCompare(String(a.fecha_solicitud));
            });

        if (!delEspacio.length) {
            zona.innerHTML = '<p class="tabla-vacia">No hay solicitudes para este espacio.</p>';
            return;
        }

        zona.innerHTML = '<p class="solicitudes-zona__titulo">Solicitudes registradas</p>' +
            delEspacio.map(function (s) {
                var acciones = '';
                if (s.puede_autorizar && s.estado === 'pendiente') {
                    acciones =
                        '<span class="tabla__acciones">' +
                        '<button class="btn-icono" title="Aprobar" data-accion="aprobar" data-id="' + s.id_solicitud + '"><i class="fas fa-check"></i></button>' +
                        '<button class="btn-icono btn-icono--peligro" title="Rechazar" data-accion="rechazar" data-id="' + s.id_solicitud + '"><i class="fas fa-xmark"></i></button>' +
                        '</span>';
                }
                return '<div class="solicitud-item">' +
                    '<div class="solicitud-item__info"><strong>' + esc(s.nombre_actividad) + '</strong> ' + badgeSol(s.estado) +
                    '<small>' + esc(s.solicitante) + ' · ' + fmtFecha(s.fecha_uso) + ' · ' +
                    esc(String(s.hora_inicio).slice(0, 5)) + '–' + esc(String(s.hora_fin).slice(0, 5)) + '</small></div>' +
                    acciones +
                '</div>';
            }).join('');
    }

    function pendientesDeEspacio(idEspacio) {
        return estado.solicitudes.filter(function (s) {
            return s.id_espacio === idEspacio && s.estado === 'pendiente' && s.puede_autorizar;
        });
    }

    function decidirSolicitud(idSolicitud, nuevoEstado) {
        return api('/api/solicitudes/' + idSolicitud + '/estado', 'PATCH', { estado: nuevoEstado })
            .then(function (res) {
                if (!res.ok) { toast(res.error || 'No se pudo actualizar.', 'error'); return false; }
                toast(nuevoEstado === 'aprobada' ? 'Solicitud aprobada.' : 'Solicitud rechazada.');
                return refrescarDespuesDeCambio();
            });
    }

    function refrescarDespuesDeCambio() {
        var promesas = [];
        /* TODO (spec §2): en el panel de Gestión de Calidad las pantallas de
           Calendario y Verificar solicitudes quedan vacías hasta la conexión;
           por eso no se vuelven a enlazar cargarSolicitudes() ni cargarSemana(). */
        if (!ES_GESTION) {
            if (ROL !== 'Estudiante') promesas.push(cargarSolicitudes());
            promesas.push(cargarOcupacionOperativa(), cargarSemana());
        } else {
            promesas.push(cargarOcupacionOperativa());
        }
        promesas.push(cargarPanel());
        return Promise.all(promesas).then(function () {
            pintarEspacios();
            pintarCalOperativo();
            $$('.espacio-fila--abierta').forEach(function (f) {
                var id = f.getAttribute('data-espacio');
                var zona = document.getElementById('zonaSol-' + id);
                if (zona && !zona.hidden) alternarZonaSolicitudes(parseInt(id, 10));
            });
            if (ROL === 'Docente') pintarStatsMaestro();
        });
    }

    /* ================= CAMPANA DE SOLICITUDES ================= */

    function abrirCampana(idEspacio) {
        estado.campanaEspacio = idEspacio;
        var pend = pendientesDeEspacio(idEspacio);
        estado.campanaIndice = pend.length ? 0 : -1;

        var espacio = null;
        estado.espacios.forEach(function (e) { if (e.id_espacio === idEspacio) espacio = e; });
        var info = $('#campanaEspacioInfo');
        if (info) {
            var icono = espacio ? iconoPorTipo(espacio.tipo) : 'fa-bell';
            var nombre = espacio ? espacio.nombre : 'Espacio';
            info.style.display = '';
            info.innerHTML = '<i class="fas ' + icono + '"></i> <strong>' + esc(nombre) + '</strong>' +
                '<span>' + pend.length + ' pendiente' + (pend.length === 1 ? '' : 's') + ' por revisar</span>';
        }
        pintarCampana();
        abrirModal('modalCampana');
    }

    function pintarCampana() {
        var pend = estado.campanaEspacio ? pendientesDeEspacio(estado.campanaEspacio) : [];
        var cuerpo = $('#campanaCuerpo');
        if (!cuerpo) return;

        var btnA = $('#campanaAprobar'), btnR = $('#campanaRechazar');
        var previo = $('#campanaAnterior'), sig = $('#campanaSiguiente');
        var cont = $('#campanaContador');
        var info = $('#campanaEspacioInfo');

        if (!pend.length) {
            cuerpo.innerHTML = '<p class="campana-vacia"><i class="fas fa-bell-slash"></i> No hay solicitudes pendientes para este espacio.</p>';
            if (btnA) btnA.disabled = true;
            if (btnR) btnR.disabled = true;
            if (previo) previo.disabled = true;
            if (sig) sig.disabled = true;
            if (cont) cont.textContent = '';
            if (info) info.style.display = 'none';
            return;
        }

        if (estado.campanaIndice >= pend.length) estado.campanaIndice = pend.length - 1;
        if (estado.campanaIndice < 0) estado.campanaIndice = 0;
        var s = pend[estado.campanaIndice];

        if (btnA) btnA.disabled = false;
        if (btnR) btnR.disabled = false;
        if (previo) previo.disabled = pend.length <= 1;
        if (sig) sig.disabled = pend.length <= 1;
        if (cont) cont.textContent = (estado.campanaIndice + 1) + ' / ' + pend.length;
        if (info) info.style.display = '';

        cuerpo.innerHTML =
            '<div class="campana-item">' +
                '<span class="etiqueta-seccion">Actividad</span>' +
                '<h4 class="campana-item__titulo">' + esc(s.nombre_actividad) + ' ' + badgeSol(s.estado) + '</h4>' +
                '<p class="campana-item__detalle"><i class="fas fa-user"></i> ' + esc(s.solicitante || '—') + '</p>' +
                '<p class="campana-item__detalle"><i class="fas fa-calendar-day"></i> ' + fmtFecha(s.fecha_uso) +
                    ' · ' + esc(String(s.hora_inicio).slice(0, 5)) + ' – ' + esc(String(s.hora_fin).slice(0, 5)) + '</p>' +
                (s.descripcion ? '<p class="campana-item__desc">' + esc(s.descripcion) + '</p>' : '') +
                '<p class="campana-item__recibida"><i class="fas fa-key"></i> Encargado: ' + esc(s.encargado_nombre || 'Sin asignar') +
                    ' · <i class="fas fa-clock"></i> Recibida ' +
                    esc((s.fecha_solicitud || '').replace('T', ' ').slice(0, 16)) + '</p>' +
            '</div>';
    }

    function moverCampana(delta) {
        var pend = estado.campanaEspacio ? pendientesDeEspacio(estado.campanaEspacio) : [];
        if (pend.length <= 1) return;
        estado.campanaIndice = (pend.length + (estado.campanaIndice + delta)) % pend.length;
        pintarCampana();
    }

    function decidirDesdeCampana(nuevoEstado) {
        var pend = estado.campanaEspacio ? pendientesDeEspacio(estado.campanaEspacio) : [];
        if (!estado.campanaEspacio || !pend.length) return;
        var guardar = estado.campanaEspacio;
        var idx = Math.min(estado.campanaIndice, pend.length - 1);
        var s = pend[idx];
        decidirSolicitud(s.id_solicitud, nuevoEstado).then(function () {
            var restantes = pendientesDeEspacio(guardar);
            estado.campanaIndice = restantes.length ? Math.min(idx, restantes.length - 1) : -1;
            pintarCampana();
        });
    }

    /* ================= SOLICITUDES ================= */

    function cargarSolicitudes() {
        return api('/api/solicitudes').then(function (res) {
            estado.solicitudes = res.ok ? (res.solicitudes || []) : [];
            pintarBadgeSolicitudes();
            pintarEspacios();
            pintarSolicitudes();
        });
    }

    function pintarBadgeSolicitudes() {
        var globo = document.getElementById('badgeSolicitudes');
        var pendientes = estado.solicitudes.filter(function (s) {
            return s.estado === 'pendiente' && s.puede_autorizar;
        }).length;
        if (globo) {
            globo.textContent = pendientes;
            globo.hidden = pendientes === 0;
        }
        var globoSol = document.getElementById('solPendientesGlobo');
        if (globoSol) globoSol.textContent = estado.solicitudes.filter(function (s) { return s.estado === 'pendiente'; }).length;
        var globoHist = document.getElementById('solHistorialGlobo');
        if (globoHist) globoHist.textContent = estado.solicitudes.length;
    }

    /* ---- Modal de solicitud ---- */

    function abrirModalSolicitud(idEspacio) {
        var espacio = null;
        estado.espacios.forEach(function (e) { if (e.id_espacio === idEspacio) espacio = e; });
        if (!espacio) return;

        estado.solEspacio = idEspacio;
        $('#solInfo').innerHTML =
            '<i class="fas ' + iconoPorTipo(espacio.tipo) + '"></i> <strong>' + esc(espacio.nombre) + '</strong>' +
            badgeEstado(espacio.estado) +
            '<span>' + esc(espacio.tipo || '') + (espacio.capacidad ? ' · Cap. ' + espacio.capacidad : '') + '</span>';

        $('#formSolicitud').reset();
        var fecha = $('#solFecha');
        fecha.min = hoyISO();
        fecha.value = hoyISO();
        $('#solInicio').value = '08:00';
        $('#solFin').value = '09:00';
        ocultarAvisoSolicitud();
        setError('#errorModalSolicitud', '');
        abrirModal('modalSolicitud');
        validarDisponibilidad();
    }

    function ocultarAvisoSolicitud() {
        $('#solAviso').hidden = true;
        $('#miniCal').hidden = true;
    }

    function setError(sel, texto) {
        var el = $(sel);
        if (!el) return;
        el.textContent = texto;
        el.hidden = !texto;
    }

    function validarDisponibilidad() {
        if (!estado.solEspacio) return Promise.resolve();
        var fecha = $('#solFecha').value;
        var ini = $('#solInicio').value;
        var fin = $('#solFin').value;

        if (!fecha || !ini || !fin) { ocultarAvisoSolicitud(); return Promise.resolve(); }

        return api('/api/espacios/' + estado.solEspacio + '/ocupacion?desde=' + fecha + '&hasta=' + fecha)
            .then(function (res) {
                if (!res.ok) return;
                var cruces = (res.bloques || []).filter(function (b) {
                    return seSolapan(ini, fin, b.hora_inicio, b.hora_fin);
                });
                if (cruces.length) {
                    var texto = cruces.map(function (b) {
                        return b.nombre_actividad + ' (' + String(b.hora_inicio).slice(0, 5) + '–' + String(b.hora_fin).slice(0, 5) + ')';
                    }).join(', ');
                    $('#solAvisoTexto').textContent = ' Ese día hay actividades aprobadas: ' + texto + '. Elige otro horario u otra fecha:';
                    $('#solAviso').hidden = false;
                    var partes = fecha.split('-');
                    abrirMiniCal(parseInt(partes[0], 10), parseInt(partes[1], 10) - 1);
                } else {
                    ocultarAvisoSolicitud();
                }
            });
    }

    function abrirMiniCal(anio, mes) {
        estado.miniAnio = anio;
        estado.miniMes = mes;
        $('#miniCal').hidden = false;
        $('#miniDias').innerHTML = '<p class="tabla-vacia">Cargando…</p>';
        $('#miniCabecera').innerHTML = DIAS.map(function (d) { return '<span class="cal-dia-nombre">' + d + '</span>'; }).join('');

        var primero = new Date(anio, mes, 1);
        var ultimo = new Date(anio, mes + 1, 0);
        api('/api/espacios/' + estado.solEspacio + '/ocupacion?desde=' + iso(primero) + '&hasta=' + iso(ultimo))
            .then(function (res) {
                var mapa = {};
                (res.ok ? res.bloques : []).forEach(function (b) {
                    mapa[b.fecha_uso] = true;
                });
                estado.miniOcupacion = mapa;
                pintarMiniCal();
            });
    }

    function pintarMiniCal() {
        var anio = estado.miniAnio, mes = estado.miniMes;
        $('#miniTitulo').textContent = MESES[mes] + ' ' + anio;
        var offset = (new Date(anio, mes, 1).getDay() + 6) % 7;
        var total = new Date(anio, mes + 1, 0).getDate();
        var hoy = hoyISO();
        var html = '';

        for (var i = 0; i < offset; i++) html += '<span class="cal-celda cal-celda--vacia"></span>';

        var _dia;
        for (_dia = 1; _dia <= total; _dia++) {
            var fecha = anio + '-' + dos(mes + 1) + '-' + dos(_dia);
            if (fecha < hoy) {
                html += '<span class="cal-celda" style="opacity:.35">' + _dia + '</span>';
            } else if (estado.miniOcupacion[fecha]) {
                html += '<span class="cal-celda cal-celda--ocupada" title="Ocupado">' + _dia + '</span>';
            } else {
                html += '<button type="button" class="cal-celda" data-fecha="' + fecha + '">' + _dia + '</button>';
            }
        }
        $('#miniDias').innerHTML = html;

        if (!REDUCE && TIENE_GSAP) {
            gsap.fromTo($$('#miniDias .cal-celda'), { autoAlpha: 0, scale: 0.96 },
                { autoAlpha: 1, scale: 1, duration: DURACION.micro, ease: EASE.entrada, stagger: 0.008 });
        }
    }

    function enviarSolicitud(ev) {
        ev.preventDefault();
        setError('#errorModalSolicitud', '');
        var cuerpo = {
            id_espacio: estado.solEspacio,
            fecha_uso: $('#solFecha').value,
            hora_inicio: $('#solInicio').value,
            hora_fin: $('#solFin').value,
            nombre_actividad: $('#solActividad').value.trim(),
            descripcion: $('#solDescripcion').value.trim()
        };

        api('/api/solicitudes', 'POST', cuerpo).then(function (res) {
            if (res.ok) {
                cerrarModal('modalSolicitud');
                toast('Solicitud enviada. Queda pendiente de aprobación.');
                refrescarDespuesDeCambio();
                return;
            }
            if (res.disponible === false) {
                $('#solAvisoTexto').textContent = ' ' + res.error;
                $('#solAviso').hidden = false;
                var partes = (cuerpo.fecha_uso || hoyISO()).split('-');
                abrirMiniCal(parseInt(partes[0], 10), parseInt(partes[1], 10) - 1);
                return;
            }
            setError('#errorModalSolicitud', res.error || 'No se pudo enviar la solicitud.');
        });
    }

    /* ================= CALENDARIO OPERATIVO ================= */

    function cargarOcupacionOperativa() {
        var mesStr = estado.opAnio + '-' + dos(estado.opMes + 1);
        return api('/api/ocupacion?mes=' + mesStr).then(function (res) {
            estado.ocupOp = res.ok ? (res.ocupacion || res.bloques || []) : [];
            pintarCalOperativo();
        });
    }

    function cambiarMesOperativo(delta) {
        estado.opMes += delta;
        if (estado.opMes < 0) { estado.opMes = 11; estado.opAnio--; }
        if (estado.opMes > 11) { estado.opMes = 0; estado.opAnio++; }
        cargarOcupacionOperativa();
    }

    function pintarCalOperativo() {
        var cont = $('#calOperativo');
        if (!cont) return;
        $('#opTitulo').textContent = 'Calendario operativo — ' + MESES[estado.opMes] + ' ' + estado.opAnio;

        var filtradas = estado.filtroTipo
            ? estado.ocupOp.filter(function (b) { return b.espacio_tipo === estado.filtroTipo; })
            : estado.ocupOp;

        var porFecha = {};
        filtradas.forEach(function (b) {
            (porFecha[b.fecha_uso] = porFecha[b.fecha_uso] || []).push(b);
        });

        var html = DIAS.map(function (d) { return '<span class="cal-dia-nombre">' + d + '</span>'; }).join('');
        var offset = (new Date(estado.opAnio, estado.opMes, 1).getDay() + 6) % 7;
        var total = new Date(estado.opAnio, estado.opMes + 1, 0).getDate();
        var hoy = hoyISO();
        var col;

        for (col = 0; col < offset; col++) html += '<span class="cal-celda cal-celda--fuera"></span>';

        var _d;
        for (_d = 1; _d <= total; _d++) {
            var fecha = estado.opAnio + '-' + dos(estado.opMes + 1) + '-' + dos(_d);
            var clases = 'cal-celda' + ((_d + offset - 1) % 7 >= 5 ? ' cal-celda--fin-semana' : '') + (fecha === hoy ? ' cal-celda--hoy' : '');
            var items = (porFecha[fecha] || []).map(function (b) {
                return '<div class="cal-evento" title="' + esc(b.nombre_actividad) + ' — ' +
                    esc(b.espacio_nombre) + ' (' + esc(String(b.hora_inicio).slice(0, 5)) + '–' +
                    esc(String(b.hora_fin).slice(0, 5)) + ')">' +
                    esc(String(b.hora_inicio).slice(0, 5)) + ' ' + esc(b.nombre_actividad) + '</div>';
            }).join('');
            html += '<div class="' + clases + '"><div class="cal-celda__numero">' + _d + '</div>' + items + '</div>';
        }

        cont.innerHTML = html;
    }

    /* ================= CALENDARIO INSTITUCIONAL (PARED) ================= */

    function cargarEventos() {
        return api('/api/eventos').then(function (res) {
            estado.eventos = res.ok ? (res.eventos || []) : [];
            pintarCalPared();
            if (ES_GESTION) pintarTablaEventos();
            if (ROL === 'Estudiante') pintarProximosEventos();
            if (ROL === 'Docente') pintarStatsMaestro();
        });
    }

    function eventosEnFecha(fecha) {
        return estado.eventos.filter(function (ev) {
            return ev.fecha_inicio <= fecha && (!ev.fecha_fin || fecha <= ev.fecha_fin);
        });
    }

    function pintarCalPared() {
        var cont = $('#calPared');
        if (!cont) return;
        $('#anioActual').textContent = estado.calAnio;

        var html = '';
        for (var m = 0; m < 12; m++) {
            var offset = (new Date(estado.calAnio, m, 1).getDay() + 6) % 7;
            var total = new Date(estado.calAnio, m + 1, 0).getDate();

            var celdas = DIAS.map(function (d) { return '<span class="cal-mes__cab">' + d + '</span>'; }).join('');
            var i;
            for (i = 0; i < offset; i++) celdas += '<span class="cal-celda cal-celda--fuera"></span>';

            var dia;
            for (dia = 1; dia <= total; dia++) {
                var fecha = estado.calAnio + '-' + dos(m + 1) + '-' + dos(dia);
                var colIdx = (offset + dia - 1) % 7;
                var clases = 'cal-celda' + (colIdx >= 5 ? ' cal-celda--fin-semana' : '');
                var chips = eventosEnFecha(fecha).map(function (ev) {
                    var claro = ev.color.toUpperCase() === '#E6D7B8';
                    return '<span class="cal-chip' + (claro ? '' : ' cal-chip--oscuro') +
                        '" style="background:' + esc(ev.color) + '" title="' + esc(ev.nombre) + '">' +
                        esc(ev.nombre) + '</span>';
                }).join('');
                celdas += '<div class="' + clases + '"><span class="cal-celda__numero" style="margin:0;">' + dia + '</span>' + chips + '</div>';
            }

            html += '<div class="cal-mes">' +
                '<span class="cal-mes__nombre">' + MESES[m] + '</span>' +
                '<div class="cal-mes__dias">' + celdas + '</div>' +
            '</div>';
        }

        cont.innerHTML = html;
        aplicarContrasteChips(cont);

        if (!REDUCE && TIENE_GSAP) {
            animarEntrada($$('.cal-mes', cont), { y: 10, duration: DURACION.entrada, stagger: 0.03 });
            animarEntrada($$('.cal-chip', cont), { y: 4, duration: DURACION.micro, stagger: 0.01 });
        }
    }

    function aplicarContrasteChips(cont) {
        $$('.cal-chip', cont).forEach(function (chip) {
            var fondo = chip.style.background;
            var hex = fondo.replace('#', '');
            if (!/^[0-9A-Fa-f]{6}$/.test(hex)) return;
            var r = parseInt(hex.slice(0, 2), 16);
            var g = parseInt(hex.slice(2, 4), 16);
            var b = parseInt(hex.slice(4, 6), 16);
            var lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            chip.style.color = lum > 0.62 ? '#120606' : '#FBF3EA';
        });
    }

    /* ================= GESTIÓN DE EVENTOS (ADMIN) ================= */

    function pintarTablaEventos() {
        var tbody = $('#tablaEventos tbody');
        if (!tbody) return;
        $('#tablaEventosVacia').hidden = estado.eventos.length > 0;
        tbody.innerHTML = estado.eventos.map(function (ev) {
            var fechas = fmtFecha(ev.fecha_inicio) + (ev.fecha_fin ? ' – ' + fmtFecha(ev.fecha_fin) : '');
            return '<tr>' +
                '<td><strong>' + esc(ev.nombre) + '</strong>' +
                    (ev.descripcion ? '<br><small style="color:rgba(230,215,184,.55)">' + esc(ev.descripcion) + '</small>' : '') + '</td>' +
                '<td>' + esc(ev.tipo_evento || 'Institucional') + '</td>' +
                '<td>' + esc(ev.espacios_nombres || 'Sin espacio asignado') + '</td>' +
                '<td>' + fechas + '</td>' +
                '<td><span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:' + esc(ev.color) + ';border:1px solid rgba(230,215,184,.3);vertical-align:middle;"></span></td>' +
                '<td class="tabla__col-acciones"><span class="tabla__acciones">' +
                    '<button class="btn-icono" title="Editar" data-accion="ev-editar" data-id="' + ev.id_evento + '"><i class="fas fa-pen"></i></button>' +
                    '<button class="btn-icono btn-icono--peligro" title="Eliminar" data-accion="ev-eliminar" data-id="' + ev.id_evento + '"><i class="fas fa-trash"></i></button>' +
                '</span></td>' +
            '</tr>';
        }).join('');
        animarEntrada($$('tr', tbody), { y: 6, duration: DURACION.entrada, stagger: 0.025 });
    }

    function abrirModalEvento(evento) {
        $('#formEvento').reset();
        var selectEspacios = $('#evEspacios');
        selectEspacios.innerHTML = estado.espacios.map(function (espacio) {
            return '<option value="' + espacio.id_espacio + '">' + esc(espacio.nombre) + '</option>';
        }).join('');
        estado.eventoEditandoId = evento ? evento.id_evento : null;
        $('#tituloModalEvento').textContent = evento ? 'Editar evento' : 'Nuevo evento';
        if (evento) {
            $('#evNombre').value = evento.nombre;
            $('#evDescripcion').value = evento.descripcion || '';
            $('#evInicio').value = evento.fecha_inicio;
            $('#evFin').value = evento.fecha_fin || '';
            $('#evTipo').value = evento.tipo_evento || 'Institucional';
            (evento.id_espacios || []).forEach(function (id) {
                var opcion = selectEspacios.querySelector('option[value="' + id + '"]');
                if (opcion) opcion.selected = true;
            });
            var radio = $('input[name="evColor"][value="' + evento.color + '"]');
            if (radio) radio.checked = true;
        } else {
            var vino = $('input[name="evColor"][value="#8B1E1E"]');
            if (vino) vino.checked = true;
        }
        setError('#errorModalEvento', '');
        abrirModal('modalEvento');
    }

    function guardarEvento(ev) {
        ev.preventDefault();
        setError('#errorModalEvento', '');
        var colorSel = $('input[name="evColor"]:checked');
        var cuerpo = {
            nombre: $('#evNombre').value.trim(),
            descripcion: $('#evDescripcion').value.trim(),
            fecha_inicio: $('#evInicio').value,
            fecha_fin: $('#evFin').value,
            color: colorSel ? colorSel.value : '#8B1E1E',
            tipo_evento: $('#evTipo').value,
            id_espacios: Array.from($('#evEspacios').selectedOptions).map(function (opcion) { return Number(opcion.value); })
        };

        var peticion = estado.eventoEditandoId
            ? api('/api/eventos/' + estado.eventoEditandoId, 'PUT', cuerpo)
            : api('/api/eventos', 'POST', cuerpo);

        peticion.then(function (res) {
            if (!res.ok) { setError('#errorModalEvento', res.error || 'No se pudo guardar.'); return; }
            cerrarModal('modalEvento');
            toast('Evento guardado.');
            cargarEventos().then(cargarPanel);
        });
    }

    /* ================= USUARIOS (ADMIN) ================= */

    function cargarUsuarios() {
        return api('/api/clientes').then(function (res) {
            estado.usuarios = res.ok ? (res.usuarios || []) : [];
            pintarUsuarios();
        });
    }

    function cargarDocentes() {
        return api('/api/docentes').then(function (res) {
            estado.docentes = res.ok ? (res.docentes || []) : [];
            pintarSelectorEncargados();
        });
    }

    function pintarSelectorEncargados() {
        var sel = $('#espEncargado');
        if (!sel) return;
        var valor = sel.value;
        sel.innerHTML = '<option value="">Sin encargado</option>' + estado.docentes.map(function (d) {
            var nombre = d.nombre + (d.apellido ? ' ' + d.apellido : '');
            return '<option value="' + d.id_usuario + '">' + esc(nombre) + '</option>';
        }).join('');
        sel.value = valor;
    }

    function pintarUsuarios() {
        pintarRoles();
        var tbody = $('#tablaUsuarios tbody');
        if (!tbody) return;

        var lista = estado.usuarios.filter(function (u) {
            return !estado.usuFiltroRol || u.nombre_rol === estado.usuFiltroRol;
        });

        if (!lista.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="tabla-vacia">No hay usuarios para este filtro.</td></tr>';
            return;
        }

        tbody.innerHTML = lista.map(function (u) {
            var activo = u.estado === 'Activo';
            var esPropio = u.id_usuario === ID_USUARIO;
            var pill = activo
                ? '<span class="estado-sol estado-sol--aprobada">Activo</span>'
                : '<span class="estado-sol estado-sol--rechazada">Inactivo</span>';
            var cargo = espaciosDeUsuario(u.id_usuario);
            /* Gestión de Calidad no puede tocar cuentas administrativas
               (spec §4): se ocultan sus acciones. Eliminar usuarios es
               exclusivo del Administrador. */
            var esObjetivoAdmin = ROLES_ADMINISTRATIVOS.indexOf(u.nombre_rol) !== -1;
            var puedeEditar = ES_ADMIN || !esObjetivoAdmin;
            var acciones = '<span class="tabla__acciones">' +
                (puedeEditar ?
                    '<button class="btn-icono" title="Editar" data-accion="usu-editar" data-id="' + u.id_usuario + '"><i class="fas fa-pen"></i></button>' : '') +
                ((esPropio || !puedeEditar) ? '' :
                    '<button class="btn-icono btn-icono--peligro" title="' + (activo ? 'Deshabilitar' : 'Habilitar') +
                    '" data-accion="usu-estado" data-id="' + u.id_usuario + '" data-nuevo="' + (activo ? 'Inactivo' : 'Activo') + '">' +
                    '<i class="fas ' + (activo ? 'fa-user-slash' : 'fa-user-check') + '"></i></button>') +
                ((ES_ADMIN && !esPropio) ?
                    '<button class="btn-icono btn-icono--peligro" title="Eliminar usuario" data-accion="usu-eliminar" data-id="' + u.id_usuario + '"><i class="fas fa-trash"></i></button>' : '') +
                '</span>';
            return '<tr>' +
                '<td><strong>' + esc(u.nombre + (u.apellido ? ' ' + u.apellido : '')) + '</strong></td>' +
                '<td>' + esc(u.correo) + '</td>' +
                '<td>' + esc(u.nombre_rol || '—') + '</td>' +
                '<td>' + (cargo ? esc(cargo) : '<span class="texto-tenue">Sin asignar</span>') + '</td>' +
                '<td>' + pill + '</td>' +
                '<td class="tabla__col-acciones">' + acciones + '</td>' +
            '</tr>';
        }).join('');
        animarEntrada($$('tr', tbody), { y: 6, duration: DURACION.entrada, stagger: 0.025 });
    }

    function espaciosDeUsuario(idUsuario) {
        return estado.espacios.filter(function (e) {
            return e.id_usuario_encargado === idUsuario;
        }).map(function (e) { return e.nombre; }).join(', ');
    }

    function pintarRoles() {
        var cont = document.getElementById('rolesGrid');
        if (!cont) return;
        var definidos = [
            { clave: 'Administrador', icono: 'fa-user-shield', desc: 'Administra el sistema completo: espacios, eventos, usuarios y todos los roles; aprueba solicitudes.' },
            { clave: 'Gestión de Calidad', icono: 'fa-clipboard-check', desc: 'Apoya la gestión: administra docentes y estudiantes, espacios y eventos. No toca cuentas administrativas.' },
            { clave: 'Docente', icono: 'fa-chalkboard-user', desc: 'Solicita espacios y autoriza las solicitudes de los espacios que tiene a cargo.' },
            { clave: 'Estudiante', icono: 'fa-graduation-cap', desc: 'Consulta la disponibilidad de espacios y los eventos institucionales.' }
        ];
        cont.innerHTML = definidos.map(function (r) {
            var total = estado.usuarios.filter(function (u) { return u.nombre_rol === r.clave; }).length;
            return '<article class="rol-card" data-reveal="up">' +
                '<span class="rol-card__icono"><i class="fas ' + r.icono + '"></i></span>' +
                '<h3 class="rol-card__nombre">' + r.clave + '</h3>' +
                '<p class="rol-card__desc">' + r.desc + '</p>' +
                '<span class="rol-card__pie"><b>' + total + '</b> usuario' + (total === 1 ? '' : 's') + '</span>' +
            '</article>';
        }).join('');
        if (MOTION) MOTION.revealIn(cont);
        else animarEntrada($$('.rol-card', cont), { y: 10, duration: DURACION.entrada, stagger: 0.05 });
    }

    function abrirModalUsuario(usuario) {
        $('#formUsuario').reset();
        estado.usuarioEditandoId = usuario ? usuario.id_usuario : null;
        $('#tituloModalUsuario').textContent = usuario ? 'Editar usuario' : 'Agregar usuario';
        var pass = $('#usuPassword');
        pass.required = !usuario;
        pass.placeholder = usuario ? 'Dejar vacío para no cambiarla' : 'Mínimo 4 caracteres';
        pass.removeAttribute('minlength');
        if (!usuario) pass.setAttribute('minlength', '4');
        if (usuario) {
            $('#usuNombre').value = usuario.nombre;
            $('#usuApellido').value = usuario.apellido || '';
            $('#usuCorreo').value = usuario.correo;
        }
        var rolSel = $('#usuRol');
        if (usuario && usuario.id_rol_map) rolSel.value = String(usuario.id_rol_map);
        else rolSel.value = '1';
        pintarEspacioCargo(usuario);
        setError('#errorModalUsuario', '');
        abrirModal('modalUsuario');
    }

    function pintarEspacioCargo(usuario) {
        var campo = $('#campoEspacioCargo');
        var sel = $('#usuEspacioCargo');
        if (!campo || !sel) return;
        var rolSel = $('#usuRol');
        var esDocente = rolSel && String(rolSel.value) === '2';
        campo.hidden = !esDocente;
        if (!esDocente) { sel.value = ''; return; }

        sel.innerHTML = '<option value="">Sin espacio</option>';
        (estado.espacios || []).forEach(function (e) {
            var encargado = e.encargado_nombre || e.encargado || '';
            var ocupado = !!encargado && (!usuario || e.id_usuario_encargado !== usuario.id_usuario);
            var op = document.createElement('option');
            op.value = String(e.id_espacio);
            op.textContent = ocupado ? (e.nombre + ' — ocupado por ' + encargado) : e.nombre;
            if (ocupado) op.disabled = true;
            sel.appendChild(op);
        });
        if (usuario && usuario.espacio_cargo_id) sel.value = String(usuario.espacio_cargo_id);
    }

    function guardarUsuario(ev) {
        ev.preventDefault();
        setError('#errorModalUsuario', '');
        var pass = $('#usuPassword').value;
        if (!estado.usuarioEditandoId && pass.length < 4) {
            setError('#errorModalUsuario', 'La contraseña debe tener al menos 4 caracteres.');
            return;
        }
        if (estado.usuarioEditandoId && pass && pass.length < 4) {
            setError('#errorModalUsuario', 'La contraseña debe tener al menos 4 caracteres.');
            return;
        }

        var rolSel = $('#usuRol').value;
        var cuerpo = {
            nombre: $('#usuNombre').value.trim(),
            apellido: $('#usuApellido').value.trim(),
            correo: $('#usuCorreo').value.trim(),
            password: pass,
            rol: rolSel
        };
        /* Espec. §6: el campo "Espacio a cargo" solo existe para el rol Docente. */
        if (String(rolSel) === '2') {
            var idEsp = $('#usuEspacioCargo') ? $('#usuEspacioCargo').value : '';
            if (idEsp) cuerpo.id_espacio = idEsp;
        }

        var peticion = estado.usuarioEditandoId
            ? api('/api/clientes/' + estado.usuarioEditandoId, 'PUT', cuerpo)
            : api('/api/clientes/registrar', 'POST', cuerpo);

        peticion.then(function (res) {
            if (!res.ok) { setError('#errorModalUsuario', res.error || 'No se pudo guardar.'); return; }
            cerrarModal('modalUsuario');
            toast(estado.usuarioEditandoId ? 'Usuario actualizado.' : 'Usuario creado.');
            cargarUsuarios();
            if (ES_GESTION) cargarResumen();
        });
    }

    /* ================= RESUMENES ================= */

    function ponerKpi(sel, valor) {
        var el = $(sel);
        if (!el) return;
        var n = Number(valor);
        if (isNaN(n)) { el.textContent = valor == null ? '—' : valor; return; }
        if (MOTION) MOTION.countUp(el, n);
        else el.textContent = n;
    }

    function cargarResumen() {
        /* El home se alimenta de /api/panel (fuente única). Delegamos para
           que cualquier refresco tras un cambio mantenga todo coherente. */
        return cargarPanel();
    }

    function setText(sel, valor) {
        var el = $(sel);
        if (el) el.textContent = valor;
    }

    function pintarStatsMaestro() {
        var propias = estado.solicitudes.filter(function (s) { return s.origen !== 'mi_espacio'; });
        var porAutorizar = estado.solicitudes.filter(function (s) {
            return s.puede_autorizar && s.estado === 'pendiente';
        });
        var miCargo = estado.espacios.filter(function (e) { return e.id_usuario_encargado === ID_USUARIO; });
        var hoy = hoyISO();
        var proximos = estado.eventos.filter(function (ev) { return (ev.fecha_fin || ev.fecha_inicio) >= hoy; });

        setText('#statMisSolicitudes', propias.length);
        setText('#statPorAutorizar', porAutorizar.length);
        setText('#statMiCargo', miCargo.length);
        setText('#statProximos', proximos.length);
        animarEntrada($$('#panel .stats-grid .stat-card'), { y: 10, duration: DURACION.entrada, stagger: DURACION.stagger });
        var pendientesCard = $('#statPorAutorizar');
        if (pendientesCard) pendientesCard.closest('.stat-card').classList.toggle('stat-card--urgente', porAutorizar.length > 0);
        var pendientesTexto = $('#statPorAutorizarSub');
        if (pendientesTexto) pendientesTexto.textContent = miCargo.length ? 'En tus espacios a cargo' : 'Disponible cuando tengas espacios asignados';
    }

    function pintarProximosEventos() {
        var cont = $('#proximosEventos');
        if (!cont) return;
        var hoy = hoyISO();
        var proximos = estado.eventos
            .filter(function (ev) { return (ev.fecha_fin || ev.fecha_inicio) >= hoy; })
            .sort(function (a, b) { return String(a.fecha_inicio).localeCompare(String(b.fecha_inicio)); })
            .slice(0, 6);

        if (!proximos.length) {
            cont.innerHTML = '<p class="acordeon-vacia">No hay eventos programados por ahora.</p>';
            return;
        }
        cont.innerHTML = proximos.map(function (ev) {
            var rango = ev.fecha_fin && ev.fecha_fin !== ev.fecha_inicio
                ? fmtFecha(ev.fecha_inicio) + ' – ' + fmtFecha(ev.fecha_fin)
                : fmtFecha(ev.fecha_inicio);
            return '<article class="evento-card" style="--ev-color:' + esc(ev.color) + '">' +
                '<div class="evento-card__fecha">' + rango + '</div>' +
                '<div class="evento-card__nombre">' + esc(ev.nombre) + '</div>' +
                (ev.descripcion ? '<div class="evento-card__desc">' + esc(ev.descripcion) + '</div>' : '') +
            '</article>';
        }).join('');

        animarEntrada($$('.evento-card', cont), { y: 12, duration: DURACION.entrada });
    }

    /* ================= PANELES POR ROL ================= */

    function tiempoRelativo(isoStr) {
        if (!isoStr) return '';
        var partes = String(isoStr).split('T');
        var d = partes[0] ? partes[0].split('-') : [];
        var t = partes[1] ? partes[1].split(':') : [];
        if (d.length < 3) return '';
        var fecha = new Date(+d[0], +d[1] - 1, +d[2], +(t[0] || 0), +(t[1] || 0));
        if (isNaN(fecha.getTime())) return '';
        var difMin = Math.round((Date.now() - fecha.getTime()) / 60000);
        if (difMin < 1) return 'Ahora';
        if (difMin < 60) return 'hace ' + difMin + ' min';
        var horas = Math.floor(difMin / 60);
        if (horas < 24) return 'hace ' + horas + ' h';
        var dias = Math.floor(horas / 24);
        if (dias < 7) return 'hace ' + dias + ' d';
        return fmtFecha(String(isoStr).split('T')[0]);
    }

    function cargarPanel() {
        return api('/api/panel').then(function (res) {
            estado.panelDatos = res.ok ? (res.datos || {}) : null;
            if (!estado.panelDatos) return;
            if (ES_GESTION) pintarPanelAdmin();
            else if (ROL === 'Docente') pintarPanelDocente();
            else pintarPanelEstudiante();
        });
    }

    function tendenciaHTML(bloque) {
        var pct = Number((bloque || {}).variacion) || 0;
        var clase, flecha;
        if (pct > 0) { clase = 'tendencia--sube'; flecha = 'fa-arrow-trend-up'; }
        else if (pct < 0) { clase = 'tendencia--baja'; flecha = 'fa-arrow-trend-down'; }
        else { clase = 'tendencia--plano'; flecha = 'fa-minus'; }
        var signo = pct > 0 ? '+' : '';
        return { clase: clase, html: '<i class="fas ' + flecha + '"></i> ' + signo + pct + '% vs. mes anterior' };
    }

    function pintarTendencia(id, bloque) {
        var el = document.getElementById(id);
        if (!el) return;
        var info = tendenciaHTML(bloque);
        el.className = 'kpi-card__tend ' + info.clase;
        el.innerHTML = info.html;
        el.hidden = false;
    }

    /* --- Gráfica de líneas (doble serie: eventos y solicitudes) --- */
    function rutaSVG(serie, clave, x, y) {
        var d = '';
        serie.forEach(function (p, i) {
            d += (i ? ' L ' : 'M ') + x(i).toFixed(1) + ' ' + y(p[clave]).toFixed(1);
        });
        return d;
    }

    function pintarSerie(serie) {
        var cont = document.getElementById('graficaSerie');
        if (!cont) return;
        serie = serie || [];
        if (!serie.length) {
            cont.innerHTML = '<p class="tarjeta-vacia">Sin actividad en los últimos 7 días.</p>';
            return;
        }

        var W = 660, H = 250, padL = 42, padR = 18, padT = 20, padB = 36;
        var ancho = W - padL - padR;
        var alto = H - padT - padB;
        var n = serie.length;

        var max = 1;
        serie.forEach(function (p) { max = Math.max(max, p.eventos || 0, p.solicitudes || 0); });
        max = Math.max(1, Math.ceil(max * 1.2));

        function x(i) { return padL + (n <= 1 ? ancho / 2 : (ancho * i) / (n - 1)); }
        function y(v) { return padT + alto - (alto * (v || 0)) / max; }

        var rejilla = '';
        var pasos = 4;
        for (var g = 0; g <= pasos; g++) {
            var val = Math.round((max * g) / pasos);
            var yy = y(val);
            rejilla += '<line x1="' + padL + '" y1="' + yy.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + yy.toFixed(1) + '" class="serie-grid"></line>';
            rejilla += '<text x="' + (padL - 9) + '" y="' + (yy + 3.5).toFixed(1) + '" class="serie-eje-y" text-anchor="end">' + val + '</text>';
        }

        var etiquetas = serie.map(function (p, i) {
            return '<text x="' + x(i).toFixed(1) + '" y="' + (H - 12) + '" class="serie-eje-x" text-anchor="middle">' +
                esc(p.etiqueta) + ' ' + esc(p.dia) + '</text>';
        }).join('');

        var puntosEv = serie.map(function (p, i) {
            return '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.eventos).toFixed(1) + '" r="3.4" class="serie-punto serie-punto--eventos"></circle>';
        }).join('');
        var puntosSol = serie.map(function (p, i) {
            return '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.solicitudes).toFixed(1) + '" r="3.4" class="serie-punto serie-punto--solicitudes"></circle>';
        }).join('');

        var dSol = rutaSVG(serie, 'solicitudes', x, y);
        var areaSol = dSol + ' L ' + x(n - 1).toFixed(1) + ' ' + (padT + alto).toFixed(1) +
            ' L ' + x(0).toFixed(1) + ' ' + (padT + alto).toFixed(1) + ' Z';

        cont.innerHTML =
            '<svg class="serie-svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Actividad de los últimos 7 días">' +
                rejilla +
                '<path class="serie-area" d="' + areaSol + '"></path>' +
                '<path class="serie-linea serie-linea--eventos" d="' + rutaSVG(serie, 'eventos', x, y) + '"></path>' +
                '<path class="serie-linea serie-linea--solicitudes" d="' + dSol + '"></path>' +
                puntosEv + puntosSol + etiquetas +
            '</svg>';

        if (MOTION && MOTION.drawLine) {
            $$('.serie-linea--solicitudes, .serie-linea--eventos', cont).forEach(function (p, i) {
                MOTION.drawLine(p, { duration: 1100, delay: i * 170 });
            });
        }
        animarEntrada($$('.serie-punto', cont), { y: 0, duration: 0.45, stagger: 0.02 });
    }

    /* --- Dona genérica (distribución / estados) --- */
    function pintarDona(sel, items, colores, opciones) {
        var cont = $(sel);
        if (!cont) return;
        opciones = opciones || {};
        items = (items || []).filter(function (it) { return (it.total || 0) > 0; });
        var total = items.reduce(function (a, it) { return a + (it.total || 0); }, 0);

        if (!total) {
            cont.innerHTML = '<p class="tarjeta-vacia">Sin datos para mostrar.</p>';
            return;
        }

        var R = 68, grosor = 17, C = 2 * Math.PI * R, cx = 90, cy = 90;
        var acumulado = 0;
        var segmentos = items.map(function (it) {
            var frac = (it.total || 0) / total;
            acumulado += frac;
            return { it: it, fin: Math.min(1, acumulado) };
        });

        /* De mayor a menor cobertura: el más grande al fondo; los pequeños,
           dibujados después, recortan los tramos. */
        var orden = segmentos.slice().sort(function (a, b) { return b.fin - a.fin; });
        var circulos = orden.map(function (seg) {
            var color = colores[seg.it.clave] || colores[seg.it.estado] || 'var(--oro)';
            var offset = C * (1 - seg.fin);
            return '<circle class="dona__seg" cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" ' +
                'stroke="' + color + '" stroke-width="' + grosor + '" ' +
                'data-len="' + C.toFixed(2) + '" data-offset="' + offset.toFixed(2) + '"></circle>';
        }).join('');

        var leyenda = items.map(function (it) {
            var color = colores[it.clave] || colores[it.estado] || 'var(--oro)';
            var pct = it.porcentaje != null ? it.porcentaje : Math.round((it.total || 0) / total * 100);
            return '<li class="dona__item">' +
                '<i class="dona__punto" style="--c:' + color + '"></i>' +
                '<span class="dona__etq">' + esc(it.etiqueta) + '</span>' +
                '<span class="dona__val">' + miles(it.total) + '</span>' +
                '<span class="dona__pct">' + pct + '%</span>' +
            '</li>';
        }).join('');

        cont.innerHTML =
            '<div class="dona__lienzo">' +
                '<svg viewBox="0 0 180 180" class="dona__svg" role="img">' +
                    '<g transform="rotate(-90 ' + cx + ' ' + cy + ')">' + circulos + '</g>' +
                '</svg>' +
                '<div class="dona__centro">' +
                    '<span class="dona__total">' + miles(opciones.total != null ? opciones.total : total) + '</span>' +
                    '<span class="dona__centro-etq">' + esc(opciones.centro || 'Total') + '</span>' +
                '</div>' +
            '</div>' +
            '<ul class="dona__leyenda">' + leyenda + '</ul>';

        if (MOTION && MOTION.sweepDonut) {
            $$('.dona__seg', cont).forEach(function (c, i) {
                MOTION.sweepDonut(c, { duration: 900, delay: i * 130 });
            });
        }
    }

    function pintarActividad(feed) {
        var act = document.getElementById('actividadLista');
        if (!act) return;
        if (!feed.length) {
            act.innerHTML = '<p class="tarjeta-vacia">Aún no hay actividad registrada.</p>';
            return;
        }
        act.innerHTML = feed.map(function (it) {
            var icono = it.tipo === 'evento' ? 'fa-star' : 'fa-paper-plane';
            return '<div class="actividad-item">' +
                '<span class="actividad-item__icono"><i class="fas ' + icono + '"></i></span>' +
                '<div class="actividad-item__cuerpo">' +
                    '<p class="actividad-item__texto">' + esc(it.texto) + '</p>' +
                    (it.detalle ? '<p class="actividad-item__detalle">' + esc(it.detalle) + '</p>' : '') +
                '</div>' +
                '<span class="actividad-item__tiempo">' + esc(tiempoRelativo(it.tiempo)) + '</span>' +
            '</div>';
        }).join('');
        animarEntrada($$('.actividad-item', act), { y: 10, duration: DURACION.entrada, stagger: 0.03 });
    }

    function pintarPanelAdmin() {
        var d = estado.panelDatos || {};

        var alerta = document.getElementById('alertaVencidas');
        if (alerta) {
            if (d.vencidas_total > 0) {
                document.getElementById('alertaVencidasTexto').textContent =
                    d.vencidas_total + ' solicitud' + (d.vencidas_total === 1 ? '' : 'es') +
                    ' con más de 24 h esperando revisión.';
                alerta.hidden = false;
                animarEntrada([alerta], { y: 8, duration: DURACION.entrada, stagger: 0 });
            } else {
                alerta.hidden = true;
            }
        }

        var fecha = document.getElementById('homeFecha');
        if (fecha && d.hoy && d.hoy.fecha) fecha.textContent = fmtFechaLarga(d.hoy.fecha);

        var r = d.resumen || {};
        var t = d.tendencia || {};
        ponerKpi('#kpiEventos', r.eventos);
        ponerKpi('#kpiSolicitudes', r.solicitudes_pendientes);
        ponerKpi('#kpiMaestros', (t.maestros || {}).total);
        ponerKpi('#kpiUsuarios', (t.usuarios || {}).total);

        pintarTendencia('tendEventos', t.eventos);
        pintarTendencia('tendSolicitudes', t.solicitudes);
        pintarTendencia('tendMaestros', t.maestros);
        pintarTendencia('tendUsuarios', t.usuarios);

        var cardSol = document.getElementById('kpiSolicitudes');
        if (cardSol && cardSol.closest('.kpi-card')) {
            cardSol.closest('.kpi-card').classList.toggle('kpi-card--urgente', Number(r.solicitudes_pendientes) > 0);
        }

        pintarSerie(d.serie_semana || []);

        var dist = d.distribucion || {};
        pintarDona('#graficaDistribucion', dist.items || [], COLORES_DIST, { centro: 'Total', total: dist.total });
        pintarDona('#graficaDona', d.solicitudes_por_estado || [], COLORES_ESTADO, { centro: 'Solicitudes' });

        pintarActividad(d.actividad || []);
    }

    function pintarPanelDocente() {
        var d = estado.panelDatos;
        var cont = $('#misEspaciosCargo');
        if (!cont) return;
        var espacios = d.mis_espacios || [];
        var pendientes = d.pendientes || [];

        var html = '';
        if (!espacios.length) {
            html = '<div class="cargo-vacio"><span class="cargo-vacio__icono"><i class="fas fa-key"></i></span>' +
                '<div><h4>Aún no tienes espacios asignados</h4>' +
                '<p>Desde aquí podrás gestionar solicitudes cuando el administrador te asigne un espacio. Mientras tanto, puedes reservar un espacio para tus clases.</p>' +
                '<button type="button" class="btn-admin btn-admin--outline" data-ir="espacios"><i class="fas fa-door-open"></i> Explorar espacios</button></div></div>';
        } else espacios.forEach(function (e) {
            var pends = pendientes.filter(function (s) { return s.id_espacio === e.id_espacio; });
            html += '<div class="cargo-espacio">' +
                '<div class="cargo-espacio__cab">' +
                    '<span class="cargo-espacio__nombre"><i class="fas ' + iconoPorTipo(e.tipo) + '"></i> ' + esc(e.nombre) + '</span>' +
                    badgeEstado(e.estado) +
                    (pends.length
                        ? '<button type="button" class="cargo-espacio__campana" data-accion="campana-panel" data-id="' +
                            e.id_espacio + '" title="Revisar solicitudes pendientes"><i class="fas fa-bell"></i> ' +
                            pends.length + '</button>'
                        : '') +
                '</div>';
            pends.forEach(function (s) {
                html += '<div class="cargo-solicitud">' +
                    '<div class="cargo-solicitud__info">' +
                        '<strong>' + esc(s.nombre_actividad) + '</strong>' +
                        '<small>' + esc(s.solicitante) + ' · ' + fmtFecha(s.fecha_uso) + ' · ' +
                            esc(String(s.hora_inicio).slice(0, 5)) + '–' +
                            esc(String(s.hora_fin).slice(0, 5)) + '</small>' +
                    '</div>' +
                    '<span class="tabla__acciones">' +
                        '<button class="btn-icono" title="Aprobar" data-accion="aprobar" data-id="' + s.id_solicitud + '"><i class="fas fa-check"></i></button>' +
                        '<button class="btn-icono btn-icono--peligro" title="Rechazar" data-accion="rechazar" data-id="' + s.id_solicitud + '"><i class="fas fa-xmark"></i></button>' +
                    '</span>' +
                '</div>';
            });
            if (!pends.length) html += '<p class="panel-vacio-texto">Sin solicitudes pendientes.</p>';
            html += '</div>';
        });
        cont.innerHTML = html;
        animarEntrada($$('.cargo-espacio, .cargo-vacio', cont), { y: 10, duration: DURACION.entrada });

        var act = $('#actividadDocente');
        if (act) {
            var feed = d.actividad || [];
            if (!feed.length) {
                act.innerHTML = '<p class="panel-vacio">Aún no hay actividad registrada.</p>';
            } else {
                act.innerHTML = feed.map(function (it) {
                    return '<div class="actividad-item">' +
                        '<span class="actividad-item__icono"><i class="fas fa-paper-plane"></i></span>' +
                        '<div class="actividad-item__cuerpo">' +
                            '<p class="actividad-item__texto">' + esc(it.texto) + ' ' + badgeSol(it.estado) + '</p>' +
                            '<p class="actividad-item__detalle">' + esc(it.detalle) + '</p>' +
                        '</div>' +
                        '<span class="actividad-item__tiempo">' + esc(tiempoRelativo(it.tiempo)) + '</span>' +
                    '</div>';
                }).join('');
                animarEntrada($$('.actividad-item', act), { y: 10, duration: DURACION.entrada });
            }
        }
    }

    function pintarPanelEstudiante() {
        var d = estado.panelDatos || {};
        var cont = $('#proximoEventoContenido');
        if (!cont) return;
        var ev = d.proximo_evento;
        if (!ev) {
            cont.innerHTML = '<div class="primer-evento__card primer-evento__card--vacio">' +
                '<i class="fas fa-calendar-xmark"></i>' +
                '<h3>No hay eventos próximos</h3>' +
                '<p>La administración publicará aquí las fechas importantes del instituto.</p>' +
            '</div>';
            return;
        }
        var rango = ev.fecha_fin && ev.fecha_fin !== ev.fecha_inicio
            ? fmtFecha(ev.fecha_inicio) + ' – ' + fmtFecha(ev.fecha_fin)
            : fmtFecha(ev.fecha_inicio);
        cont.innerHTML = '<article class="primer-evento__card" style="--ev-color:' + esc(ev.color) + '">' +
            '<div class="primer-evento__fecha"><i class="fas fa-calendar-day"></i> ' + esc(rango) + '</div>' +
            '<h3 class="primer-evento__nombre">' + esc(ev.nombre) + '</h3>' +
            (ev.descripcion ? '<p class="primer-evento__desc">' + esc(ev.descripcion) + '</p>' : '') +
        '</article>';
        animarEntrada($$('.primer-evento__card', cont), { y: 12, duration: 0.34, stagger: 0 });
    }

    /* ================= CALENDARIO SEMANAL (mockup) ================= */

    function pintarChipsCalendario() {
        var cont = document.getElementById('calChips');
        if (!cont) return;
        var tipos = tiposUnicosEspacios();
        var html = '<button type="button" class="cal-filtro-chip' + (!estado.semanaTipo ? ' cal-filtro-chip--activo' : '') +
            '" data-tipo="">Todos</button>';
        tipos.forEach(function (tp) {
            html += '<button type="button" class="cal-filtro-chip' + (estado.semanaTipo === tp ? ' cal-filtro-chip--activo' : '') +
                '" data-tipo="' + esc(tp) + '">' + esc(tp) + '</button>';
        });
        cont.innerHTML = html;
    }

    function cargarSemana() {
        if (!document.getElementById('calSemana')) return Promise.resolve();
        if (!estado.semanaBase) estado.semanaBase = lunesDe(new Date());
        var base = estado.semanaBase;
        var meses = {};
        for (var i = 0; i < 5; i++) {
            var dd = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
            meses[dd.getFullYear() + '-' + dos(dd.getMonth() + 1)] = true;
        }
        var consultas = Object.keys(meses).map(function (m) {
            return api('/api/ocupacion?mes=' + m);
        });
        return Promise.all(consultas).then(function (resultados) {
            var acumulado = [];
            resultados.forEach(function (res) {
                if (res && res.ok) acumulado = acumulado.concat(res.ocupacion || res.bloques || []);
            });
            estado.semanaOp = acumulado;
            pintarSemana();
        });
    }

    function cambiarSemana(delta) {
        var base = estado.semanaBase || lunesDe(new Date());
        estado.semanaBase = new Date(base.getFullYear(), base.getMonth(), base.getDate() + delta * 7);
        cargarSemana();
    }

    function pintarSemana() {
        var cont = document.getElementById('calSemana');
        if (!cont) return;
        var base = estado.semanaBase || lunesDe(new Date());
        var dias = [];
        for (var i = 0; i < 5; i++) dias.push(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i));

        var titulo = document.getElementById('semanaTitulo');
        if (titulo) titulo.textContent = fmtDiaMes(dias[0]) + ' – ' + fmtDiaMes(dias[4]);

        var bloques = estado.semanaOp.filter(function (b) {
            return !estado.semanaTipo || b.espacio_tipo === estado.semanaTipo;
        });

        var mapa = {};
        bloques.forEach(function (b) {
            var hh = parseInt(String(b.hora_inicio).slice(0, 2), 10);
            var clave = b.fecha_uso + '#' + hh;
            (mapa[clave] = mapa[clave] || []).push(b);
        });

        var hoy = hoyISO();
        var cab = '<div class="cal-semana__celda cal-semana__celda--hora cal-semana__celda--cab">Hora</div>';
        dias.forEach(function (dd) {
            var f = dd.getFullYear() + '-' + dos(dd.getMonth() + 1) + '-' + dos(dd.getDate());
            cab += '<div class="cal-semana__celda cal-semana__celda--cab' + (f === hoy ? ' cal-semana__celda--hoy' : '') + '">' +
                '<span class="cal-semana__dia">' + DIAS[(dd.getDay() + 6) % 7] + '</span>' +
                '<span class="cal-semana__fecha">' + fmtDiaMes(dd) + '</span>' +
            '</div>';
        });

        var cuerpo = '';
        for (var h = 7; h <= 19; h++) {
            cuerpo += '<div class="cal-semana__celda cal-semana__celda--hora">' + fmtHoraCelda(h) + '</div>';
            dias.forEach(function (dd) {
                var f = dd.getFullYear() + '-' + dos(dd.getMonth() + 1) + '-' + dos(dd.getDate());
                var items = mapa[f + '#' + h] || [];
                var contenido = items.map(function (b) {
                    var rango = fmtHoraCorta(b.hora_inicio) + '–' + fmtHoraCorta(b.hora_fin);
                    return '<div class="cal-bloque" title="' + esc(b.nombre_actividad + ' · ' + b.espacio_nombre + ' (' + rango + ')') + '">' +
                        '<span class="cal-bloque__nombre">' + esc(b.nombre_actividad) + '</span>' +
                        '<span class="cal-bloque__meta">' + esc(rango) + ' · ' + esc(b.espacio_nombre) + '</span>' +
                    '</div>';
                }).join('');
                cuerpo += '<div class="cal-semana__celda cal-semana__celda--slot' + (f === hoy ? ' cal-semana__celda--hoy' : '') + '">' +
                    contenido + '</div>';
            });
        }

        cont.innerHTML = '<div class="cal-semana__grid">' + cab + cuerpo + '</div>' +
            (bloques.length ? '' : '<p class="cal-semana__vacio">No hay actividades aprobadas en esta semana.</p>');

        animarEntrada($$('.cal-bloque', cont), { y: 8, duration: DURACION.entrada, stagger: 0.02 });
    }

    /* ================= SOLICITUDES (mockup) ================= */

    function coincideSolicitud(s, q) {
        if (estado.solTipo && s.espacio_tipo !== estado.solTipo) return false;
        if (!q) return true;
        var texto = sinAcentos([
            s.nombre_actividad, s.solicitante, s.espacio_nombre, s.espacio_tipo, s.fecha_uso
        ].join(' '));
        return texto.indexOf(q) >= 0;
    }

    function tarjetaSolicitud(s, historial) {
        var rango = fmtHoraCorta(s.hora_inicio) + ' – ' + fmtHoraCorta(s.hora_fin);
        var acciones = '';
        if (!historial) {
            acciones = '<span class="sol-card__acciones">' +
                '<button type="button" class="btn-admin btn-admin--success btn-mini" data-accion="sol-aprobar" data-id="' + s.id_solicitud + '">Aceptar</button>' +
                '<button type="button" class="btn-admin btn-admin--danger btn-mini" data-accion="sol-rechazar" data-id="' + s.id_solicitud + '">Rechazar</button>' +
            '</span>';
        } else {
            acciones = badgeSol(s.estado);
        }
        return '<article class="sol-card' + (historial ? ' sol-card--historial' : '') + '">' +
            '<span class="sol-card__tipo">' + esc(s.espacio_tipo || 'Espacio') + '</span>' +
            '<h4 class="sol-card__titulo">' + esc(s.nombre_actividad) + '</h4>' +
            '<p class="sol-card__linea"><i class="fas fa-user"></i> Solicitante: ' + esc(s.solicitante) + '</p>' +
            '<p class="sol-card__linea"><i class="fas fa-door-open"></i> Espacio: ' + esc(s.espacio_nombre) + '</p>' +
            '<p class="sol-card__linea"><i class="fas fa-calendar-day"></i> Fecha: ' + esc(fmtFechaLarga(s.fecha_uso)) + ' · ' + esc(rango) + '</p>' +
            '<div class="sol-card__pie">' +
                '<span class="sol-card__hace">' + esc(tiempoRelativo(s.fecha_solicitud)) + '</span>' +
                acciones +
            '</div>' +
        '</article>';
    }

    function pintarSolicitudes() {
        if (!ES_GESTION) return;
        var contPend = document.getElementById('solPendientes');
        var contHist = document.getElementById('solHistorial');
        if (!contPend && !contHist) return;

        var q = sinAcentos(estado.solBusqueda || '').trim();

        var pendientes = estado.solicitudes.filter(function (s) {
            return s.estado === 'pendiente' && coincideSolicitud(s, q);
        });
        var historial = estado.solicitudes.slice().sort(function (a, b) {
            return String(b.fecha_solicitud || '').localeCompare(String(a.fecha_solicitud || ''));
        }).filter(function (s) { return coincideSolicitud(s, q); });

        if (contPend) {
            contPend.innerHTML = pendientes.length
                ? pendientes.map(function (s) { return tarjetaSolicitud(s, false); }).join('')
                : '<p class="tarjeta-vacia">No hay solicitudes pendientes con este criterio.</p>';
        }
        if (contHist) {
            contHist.innerHTML = historial.length
                ? historial.map(function (s) { return tarjetaSolicitud(s, true); }).join('')
                : '<p class="tarjeta-vacia">Sin resultados en el historial.</p>';
        }
        var globoP = document.getElementById('solPendientesGlobo');
        if (globoP) globoP.textContent = estado.solicitudes.filter(function (s) { return s.estado === 'pendiente'; }).length;
        var globoH = document.getElementById('solHistorialGlobo');
        if (globoH) globoH.textContent = estado.solicitudes.length;

        animarEntrada($$('.sol-card', contPend || document), { y: 10, duration: DURACION.entrada, stagger: 0.03 });
    }

    /* ================= ACCIONES DELEGADAS ================= */

    function initAcciones() {
        function irAVista(nombre) {
            var vista = document.getElementById(nombre);
            if (vista) activarVista(nombre);
        }

        document.addEventListener('click', function (ev) {
            var ir = ev.target.closest('[data-ir]');
            if (ir) irAVista(ir.getAttribute('data-ir'));
        });
        document.addEventListener('keydown', function (ev) {
            if (ev.key !== 'Enter' && ev.key !== ' ') return;
            var ir = ev.target.closest('[data-ir]');
            if (ir) { ev.preventDefault(); irAVista(ir.getAttribute('data-ir')); }
        });

        /* Atajo principal (espec. §6): botón "+ Nuevo usuario" en el encabezado,
           en Gestión maestros y en los "Atajos de gestión". */
        document.addEventListener('click', function (ev) {
            var nuevo = ev.target.closest('[data-nuevo-usuario]');
            if (!nuevo) return;
            if (typeof abrirModalUsuario === 'function') abrirModalUsuario(null);
        });

        var rolSel = $('#usuRol');
        if (rolSel) {
            rolSel.addEventListener('change', function () { pintarEspacioCargo(null); });
        }

        var cargo = $('#misEspaciosCargo');
        if (cargo) {
            cargo.addEventListener('click', function (ev) {
                var btn = ev.target.closest('[data-accion]');
                if (!btn) return;
                var accion = btn.getAttribute('data-accion');
                var id = parseInt(btn.getAttribute('data-id'), 10);
                if (accion === 'campana-panel') {
                    abrirCampana(id);
                } else if (accion === 'aprobar' || accion === 'rechazar') {
                    decidirSolicitud(id, accion === 'aprobar' ? 'aprobada' : 'rechazada');
                }
            });
        }

        var lista = $('#listaEspacios');
        if (lista) {
            lista.addEventListener('click', function (ev) {
                var principal = ev.target.closest('.espacio-fila__principal');
                if (principal && !ev.target.closest('[data-accion]')) { alternarFila(principal); return; }

                var btn = ev.target.closest('[data-accion]');
                if (!btn) return;
                var accion = btn.getAttribute('data-accion');
                var id = parseInt(btn.getAttribute('data-id'), 10);

                if (accion === 'solicitar') {
                    abrirModalSolicitud(id);
                } else if (accion === 'editar') {
                    var espacio = null;
                    estado.espacios.forEach(function (e) { if (e.id_espacio === id) espacio = e; });
                    if (espacio) abrirModalEspacio(espacio);
                } else if (accion === 'eliminar') {
                    confirmar('Eliminar espacio',
                        'Esta acción no se puede deshacer. ¿Deseas eliminar este espacio?',
                        function () {
                            api('/api/espacios/' + id, 'DELETE').then(function (res) {
                                if (!res.ok) { toast(res.error || 'No se pudo eliminar.', 'error'); return; }
                                toast('Espacio eliminado.');
                                cargarEspacios().then(cargarResumen);
                            });
                        });
                } else if (accion === 'solicitudes') {
                    alternarZonaSolicitudes(id, btn);
                } else if (accion === 'campana') {
                    abrirCampana(id);
                } else if (accion === 'aprobar' || accion === 'rechazar') {
                    decidirSolicitud(id, accion === 'aprobar' ? 'aprobada' : 'rechazada');
                }
            });
        }

        var tablaEv = $('#tablaEventos');
        if (tablaEv) {
            tablaEv.addEventListener('click', function (ev) {
                var btn = ev.target.closest('[data-accion]');
                if (!btn) return;
                var id = parseInt(btn.getAttribute('data-id'), 10);
                if (btn.getAttribute('data-accion') === 'ev-editar') {
                    var evento = null;
                    estado.eventos.forEach(function (e2) { if (e2.id_evento === id) evento = e2; });
                    if (evento) abrirModalEvento(evento);
                } else if (btn.getAttribute('data-accion') === 'ev-eliminar') {
                    confirmar('Eliminar evento', '¿Deseas eliminar este evento del calendario institucional?', function () {
                        api('/api/eventos/' + id, 'DELETE').then(function (res) {
                            if (!res.ok) { toast(res.error || 'No se pudo eliminar.', 'error'); return; }
                            toast('Evento eliminado.');
                            cargarEventos().then(cargarResumen);
                        });
                    });
                }
            });
        }

        var tablaUsu = $('#tablaUsuarios');
        if (tablaUsu) {
            tablaUsu.addEventListener('click', function (ev) {
                var btn = ev.target.closest('[data-accion]');
                if (!btn) return;
                var id = parseInt(btn.getAttribute('data-id'), 10);
                if (btn.getAttribute('data-accion') === 'usu-editar') {
                    var usuario = null;
                    estado.usuarios.forEach(function (u) { if (u.id_usuario === id) usuario = u; });
                    if (usuario) {
                        var mapaRoles = { Estudiante: 1, Docente: 2, Administrador: 3, 'Gestión de Calidad': 4 };
                        usuario.id_rol_map = mapaRoles[usuario.nombre_rol];
                        abrirModalUsuario(usuario);
                    }
                } else if (btn.getAttribute('data-accion') === 'usu-estado') {
                    var nuevo = btn.getAttribute('data-nuevo');
                    confirmar(nuevo === 'Inactivo' ? 'Deshabilitar usuario' : 'Habilitar usuario',
                        nuevo === 'Inactivo'
                            ? 'El usuario perderá el acceso a la plataforma.'
                            : 'El usuario volverá a tener acceso a la plataforma.',
                        function () {
                            api('/api/clientes/' + id + '/estado', 'PATCH', { estado: nuevo }).then(function (res) {
                                if (!res.ok) { toast(res.error || 'No se pudo actualizar.', 'error'); return; }
                                toast('Estado actualizado.');
                                cargarUsuarios();
                            });
                        });
                } else if (btn.getAttribute('data-accion') === 'usu-eliminar') {
                    confirmar('Eliminar usuario',
                        'Se borrará la cuenta de forma definitiva. Esta acción no se puede deshacer.',
                        function () {
                            api('/api/clientes/' + id, 'DELETE').then(function (res) {
                                if (!res.ok) { toast(res.error || 'No se pudo eliminar.', 'error'); return; }
                                toast('Usuario eliminado.');
                                cargarUsuarios();
                                cargarResumen();
                            });
                        });
                }
            });
        }

        var solPendientes = document.getElementById('solPendientes');
        if (solPendientes) {
            solPendientes.addEventListener('click', function (ev) {
                var btn = ev.target.closest('[data-accion]');
                if (!btn) return;
                var accion = btn.getAttribute('data-accion');
                var id = parseInt(btn.getAttribute('data-id'), 10);
                if (accion === 'sol-aprobar') decidirSolicitud(id, 'aprobada');
                else if (accion === 'sol-rechazar') decidirSolicitud(id, 'rechazada');
            });
        }
    }

    /* ================= FORMULARIOS Y BOTONES ================= */

    function abrirModalEspacio(espacio) {
        $('#formEspacio').reset();
        estado.espacioEditandoId = espacio ? espacio.id_espacio : null;
        $('#tituloModalEspacio').textContent = espacio ? 'Editar espacio' : 'Nuevo espacio';
        pintarSelectorEncargados();
        if (espacio) {
            $('#espNombre').value = espacio.nombre;
            $('#espTipo').value = espacio.tipo || '';
            $('#espCapacidad').value = espacio.capacidad || '';
            $('#espEstado').value = espacio.estado;
            $('#espEncargado').value = espacio.id_usuario_encargado || '';
            $('#espDestacado').checked = !!espacio.destacado;
            $('#espDescripcion').value = espacio.descripcion || '';
        }
        setError('#errorModalEspacio', '');
        abrirModal('modalEspacioForm');
    }

    function guardarEspacio(ev) {
        ev.preventDefault();
        setError('#errorModalEspacio', '');
        var cuerpo = {
            nombre: $('#espNombre').value.trim(),
            tipo: $('#espTipo').value.trim(),
            capacidad: $('#espCapacidad').value,
            estado: $('#espEstado').value,
            id_usuario_encargado: $('#espEncargado').value,
            destacado: $('#espDestacado').checked,
            descripcion: $('#espDescripcion').value.trim()
        };

        var peticion = estado.espacioEditandoId
            ? api('/api/espacios/' + estado.espacioEditandoId, 'PUT', cuerpo)
            : api('/api/espacios', 'POST', cuerpo);

        peticion.then(function (res) {
            if (!res.ok) { setError('#errorModalEspacio', res.error || 'No se pudo guardar.'); return; }
            cerrarModal('modalEspacioForm');
            toast('Espacio guardado.');
            cargarEspacios().then(cargarResumen);
        });
    }

    function initBotones() {
        var btnEspacio = $('#btnNuevoEspacio');
        if (btnEspacio) btnEspacio.addEventListener('click', function () { abrirModalEspacio(null); });
        $('#formEspacio') && ($('#formEspacio').addEventListener('submit', guardarEspacio));

        var btnUsu = $('#btnAgregarUsuario');
        if (btnUsu) btnUsu.addEventListener('click', function () { abrirModalUsuario(null); });
        $('#formUsuario') && ($('#formUsuario').addEventListener('submit', guardarUsuario));

        var btnEv = $('#btnNuevoEvento');
        if (btnEv) btnEv.addEventListener('click', function () { abrirModalEvento(null); });
        $('#formEvento') && ($('#formEvento').addEventListener('submit', guardarEvento));

        var accesoEsp = $('#accesoNuevoEspacio');
        if (accesoEsp) accesoEsp.addEventListener('click', function () { abrirModalEspacio(null); });
        var accesoUsu = $('#accesoNuevoUsuario');
        if (accesoUsu) accesoUsu.addEventListener('click', function () { abrirModalUsuario(null); });

        $('#formSolicitud') && ($('#formSolicitud').addEventListener('submit', enviarSolicitud));

        ['#solFecha', '#solInicio', '#solFin'].forEach(function (sel) {
            var campo = $(sel);
            if (campo) campo.addEventListener('change', validarDisponibilidad);
        });

        var miniAnt = $('#miniAnterior'), miniSig = $('#miniSiguiente');
        if (miniAnt) miniAnt.addEventListener('click', function () {
            estado.miniMes--;
            if (estado.miniMes < 0) { estado.miniMes = 11; estado.miniAnio--; }
            abrirMiniCal(estado.miniAnio, estado.miniMes);
        });
        if (miniSig) miniSig.addEventListener('click', function () {
            estado.miniMes++;
            if (estado.miniMes > 11) { estado.miniMes = 0; estado.miniAnio++; }
            abrirMiniCal(estado.miniAnio, estado.miniMes);
        });
        var miniDias = $('#miniDias');
        if (miniDias) miniDias.addEventListener('click', function (ev) {
            var celda = ev.target.closest('button[data-fecha]');
            if (!celda) return;
            $('#solFecha').value = celda.getAttribute('data-fecha');
            validarDisponibilidad();
        });

        var filtro = $('#filtroTipo');
        if (filtro) filtro.addEventListener('change', function () {
            estado.filtroTipo = this.value;
            pintarEspacios();
            pintarCalOperativo();
        });

        var opAnt = $('#btnOpAnterior'), opSig = $('#btnOpSiguiente');
        if (opAnt) opAnt.addEventListener('click', function () { cambiarMesOperativo(-1); });
        if (opSig) opSig.addEventListener('click', function () { cambiarMesOperativo(1); });

        var anioAnt = $('#btnAnioAnterior'), anioSig = $('#btnAnioSiguiente');
        if (anioAnt) anioAnt.addEventListener('click', function () { estado.calAnio--; pintarCalPared(); });
        if (anioSig) anioSig.addEventListener('click', function () { estado.calAnio++; pintarCalPared(); });

        var calHoy = $('#btnCalHoy');
        if (calHoy) calHoy.addEventListener('click', function () {
            estado.calAnio = new Date().getFullYear();
            pintarCalPared();
        });

        var opHoy = $('#btnOpHoy');
        if (opHoy) opHoy.addEventListener('click', function () {
            estado.opMes = new Date().getMonth();
            estado.opAnio = new Date().getFullYear();
            cargarOcupacionOperativa();
        });

        var campAnt = $('#campanaAnterior'), campSig = $('#campanaSiguiente');
        if (campAnt) campAnt.addEventListener('click', function () { moverCampana(-1); });
        if (campSig) campSig.addEventListener('click', function () { moverCampana(1); });

        var campApr = $('#campanaAprobar');
        if (campApr) campApr.addEventListener('click', function () { decidirDesdeCampana('aprobada'); });
        var campRec = $('#campanaRechazar');
        if (campRec) campRec.addEventListener('click', function () { decidirDesdeCampana('rechazada'); });

        /* --- Calendario semanal --- */
        var semAnt = $('#btnSemanaAnterior'), semSig = $('#btnSemanaSiguiente');
        if (semAnt) semAnt.addEventListener('click', function () { cambiarSemana(-1); });
        if (semSig) semSig.addEventListener('click', function () { cambiarSemana(1); });
        var semHoy = $('#btnSemanaHoy');
        if (semHoy) semHoy.addEventListener('click', function () {
            estado.semanaBase = lunesDe(new Date());
            cargarSemana();
        });
        var calFiltro = $('#calFiltroTipo');
        if (calFiltro) calFiltro.addEventListener('change', function () {
            estado.semanaTipo = this.value;
            pintarChipsCalendario();
            pintarSemana();
        });
        var calChips = $('#calChips');
        if (calChips) calChips.addEventListener('click', function (ev) {
            var chip = ev.target.closest('.cal-filtro-chip');
            if (!chip) return;
            estado.semanaTipo = chip.getAttribute('data-tipo') || '';
            var sel = $('#calFiltroTipo');
            if (sel) sel.value = estado.semanaTipo;
            pintarChipsCalendario();
            pintarSemana();
        });

        /* --- Verificar solicitudes --- */
        var solBuscar = $('#solBuscar');
        if (solBuscar) solBuscar.addEventListener('input', function () {
            estado.solBusqueda = this.value;
            pintarSolicitudes();
        });
        var solFiltro = $('#solFiltroTipo');
        if (solFiltro) solFiltro.addEventListener('change', function () {
            estado.solTipo = this.value;
            pintarSolicitudes();
        });

        /* --- Filtros de rol en Gestión maestros --- */
        var filtrosRol = document.getElementById('filtrosRol');
        if (filtrosRol) {
            filtrosRol.addEventListener('click', function (ev) {
                var btn = ev.target.closest('.filtro-rol');
                if (!btn) return;
                estado.usuFiltroRol = btn.getAttribute('data-rol-filtro') || '';
                $$('.filtro-rol', filtrosRol).forEach(function (b) {
                    var act = b === btn;
                    b.classList.toggle('filtro-rol--activo', act);
                    b.setAttribute('aria-selected', act ? 'true' : 'false');
                });
                pintarUsuarios();
            });
        }
    }

    /* ================= ARRANQUE ================= */

    document.addEventListener('DOMContentLoaded', function () {
        /* Sección visible inicial (la que trae `vista--activa` la plantilla). */
        var inicial = $('.vista--activa');
        vistaActualId = inicial ? inicial.id : null;

        /* Red de seguridad desde el primer instante: pase lo que pase, la
           sección activa termina visible. Evita la pantalla en negro. */
        setTimeout(function () {
            var activa = $('.vista--activa');
            if (MOTION && activa) MOTION.estadoFinalVista(activa);
            try { posicionarIndicadorInicial(); } catch (e) { }
        }, 1500);

        /* Cada inicialización se protege por separado: si una falla, el resto
           del panel sigue funcionando y la sección se revela igual. */
        function seguro(fn, etiqueta) {
            try { fn(); } catch (error) {
                try { console.error('[panel] Falló ' + etiqueta + ':', error); } catch (e) { }
            }
        }

        seguro(completarEntradaLogin, 'completarEntradaLogin');
        seguro(initMenu, 'initMenu');
        seguro(initTabs, 'initTabs');
        seguro(initModales, 'initModales');
        seguro(initBotones, 'initBotones');
        seguro(initAcciones, 'initAcciones');
        seguro(iniciarScroll, 'iniciarScroll');

        var cargas = [cargarEspacios(), cargarPanel()];

        /* TODO (spec §2): Calendario, Verificar solicitudes y Editar eventos se
           muestran como pantallas vacías hasta que el equipo de trabajo conecte
           la agenda. El código de estas funciones se conserva sin enlazar:
           cargarSemana(), cargarSolicitudes() y cargarEventos() no se llaman. */
        seguro(function () {
            if (!ES_GESTION) {
                cargas.push(cargarEventos(), cargarSemana());
                if (ROL !== 'Estudiante') cargas.push(cargarSolicitudes(), cargarOcupacionOperativa());
            } else {
                cargas.push(cargarOcupacionOperativa());
            }
            if (ES_GESTION) cargas.push(cargarUsuarios(), cargarDocentes());
        }, 'carga por rol');

        /* El panel SIEMPRE debe terminar visible. Si algo falla al pintar los
           datos, mostramos un aviso con botón "Reintentar" y, pase lo que pase,
           dejamos la sección activa en su estado final. */
        Promise.all(cargas).then(function () {
            if (ROL === 'Docente') pintarStatsMaestro();
        }).catch(function (error) {
            try { console.error('[panel] Error al cargar los datos:', error); } catch (e) { }
            mostrarErrorCarga();
        }).then(function () {
            try { posicionarIndicadorInicial(); } catch (e) { }
            try { entradaInicial(); } catch (e) { }
        });
    });

    /* Aviso de error de carga con botón para reintentar (spec §2). */
    function mostrarErrorCarga() {
        var contenedor = document.querySelector('.dashboard') || document.getElementById('contenido');
        if (!contenedor || contenedor.querySelector('.error-carga')) return;
        var caja = document.createElement('div');
        caja.className = 'error-carga';
        caja.setAttribute('role', 'alert');
        caja.innerHTML =
            '<i class="fas fa-triangle-exclamation" aria-hidden="true"></i>' +
            '<div class="error-carga__texto">' +
            '<strong>No se pudieron cargar los datos.</strong>' +
            '<span>Revisa la conexión con el servidor e inténtalo de nuevo.</span>' +
            '</div>' +
            '<button type="button" class="boton boton--fantasma" data-reintentar-carga>' +
            '<i class="fas fa-rotate-right" aria-hidden="true"></i> Reintentar</button>';
        caja.querySelector('[data-reintentar-carga]').addEventListener('click', function () {
            caja.remove();
            Promise.all([cargarEspacios(), cargarPanel()]).then(function () {
                if (ROL === 'Docente') pintarStatsMaestro();
            }).catch(function (error) {
                try { console.error('[panel] Error al cargar los datos:', error); } catch (e) { }
                mostrarErrorCarga();
            });
        });
        contenedor.insertBefore(caja, contenedor.firstChild);
    }

    function iniciarScroll() {
        if (!MOTION) return;
        var contenido = document.getElementById('contenido');
        if (contenido) {
            MOTION.initScroll({ wrapper: contenido, content: contenido.querySelector('.dashboard') || contenido });
        }
    }

    function posicionarIndicadorInicial() {
        if (!MOTION) return;
        var activo = $('.nav__enlace[data-vista].nav__enlace--activo');
        /* Si la plantilla no marcó ningún ítem activo, activamos el que
           corresponde a la sección visible (normalmente el inicio). */
        if (!activo && vistaActualId) {
            activo = $('.nav__enlace[data-vista="' + vistaActualId + '"]');
            if (activo) activo.classList.add('nav__enlace--activo');
        }
        MOTION.moveIndicator(activo, { immediate: true });
    }
})();
