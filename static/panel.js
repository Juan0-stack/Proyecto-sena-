(function () {
    'use strict';

    var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var TIENE_GSAP = typeof window.gsap !== 'undefined';
    var BODY = document.body;
    var ROL = BODY.getAttribute('data-rol') || '';
    var ID_USUARIO = parseInt(BODY.getAttribute('data-usuario-id') || '0', 10);

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

    function dos(n) { return n < 10 ? '0' + n : '' + n; }

    function iso(d) { return d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' + dos(d.getDate()); }

    function hoyISO() { return iso(new Date()); }

    function fmtFecha(isoFecha) {
        if (!isoFecha) return '';
        var p = isoFecha.split('-');
        return p[2] + '/' + p[1] + '/' + p[0];
    }

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
        if (!REDUCE && TIENE_GSAP) {
            gsap.fromTo(el, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.25, ease: 'power3.out' });
            gsap.to(el, { autoAlpha: 0, y: 10, duration: 0.3, delay: 2.6, ease: 'power2.in', onComplete: function () { el.remove(); } });
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
        if (!REDUCE && TIENE_GSAP) {
            gsap.set(overlay, { autoAlpha: 1 });
            gsap.fromTo($('.modal', overlay),
                { autoAlpha: 0, scale: 0.96, y: 10 },
                { autoAlpha: 1, scale: 1, y: 0, duration: 0.28, ease: 'power3.out' });
        }
    }

    function cerrarModal(id) {
        var overlay = document.getElementById(id);
        if (!overlay || !overlay.classList.contains('modal-overlay--abierto')) return;
        var terminar = function () {
            overlay.classList.remove('modal-overlay--abierto');
            if (TIENE_GSAP) gsap.set(overlay, { clearProps: 'all' });
        };
        if (!REDUCE && TIENE_GSAP) {
            gsap.to($('.modal', overlay), { autoAlpha: 0, scale: 0.97, duration: 0.18, ease: 'power2.in' });
            gsap.to(overlay, { autoAlpha: 0, duration: 0.2, ease: 'power2.in', onComplete: terminar });
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
        var hamburguesa = $('#hamburguesa');
        var lista = $('.nav__lista');
        if (hamburguesa && lista) {
            hamburguesa.addEventListener('click', function () { lista.classList.toggle('abierto'); });
            $$('.nav__enlace', lista).forEach(function (e) {
                e.addEventListener('click', function () { lista.classList.remove('abierto'); });
            });
        }
    }

    function activarVista(id) {
        var actual = $('.vista--activa');
        var nueva = document.getElementById(id);
        if (!nueva || nueva === actual) return;

        $$('.nav__enlace[data-vista]').forEach(function (e) {
            e.classList.toggle('nav__enlace--activo', e.getAttribute('data-vista') === id);
        });

        if (REDUCE || !TIENE_GSAP) {
            actual.classList.remove('vista--activa');
            nueva.classList.add('vista--activa');
            window.scrollTo({ top: 0 });
            return;
        }
        gsap.to(actual, {
            autoAlpha: 0, y: -6, duration: 0.18, ease: 'power2.in',
            onComplete: function () {
                actual.classList.remove('vista--activa');
                gsap.set(actual, { clearProps: 'all' });
                nueva.classList.add('vista--activa');
                gsap.fromTo(nueva, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 });
                gsap.fromTo(Array.prototype.slice.call(nueva.children), { autoAlpha: 0, y: 14 }, {
                    autoAlpha: 1, y: 0, duration: 0.32, ease: 'power2.out', stagger: 0.05,
                    onComplete: function () { gsap.set(nueva, { clearProps: 'all' }); }
                });
                window.scrollTo({ top: 0 });
            }
        });
    }

    function initTabs() {
        $$('.nav__enlace[data-vista]').forEach(function (enl) {
            enl.addEventListener('click', function (ev) {
                ev.preventDefault();
                activarVista(this.getAttribute('data-vista'));
            });
        });
    }

    function entradaInicial() {
        if (REDUCE || !TIENE_GSAP) return;
        var hijos = $$('.vista--activa > *');
        gsap.fromTo(hijos, { autoAlpha: 0, y: 16 },
            { autoAlpha: 1, y: 0, duration: 0.38, ease: 'power2.out', stagger: 0.06 });
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
            if (ROL !== 'Estudiante') pintarCalOperativo();
        });
    }

    function pintarFiltroTipos() {
        var sel = $('#filtroTipo');
        if (!sel) return;
        var tipos = {};
        estado.espacios.forEach(function (e) { if (e.tipo) tipos[e.tipo] = true; });
        var valor = sel.value;
        sel.innerHTML = '<option value="">Todos los tipos</option>' +
            Object.keys(tipos).sort().map(function (t) {
                return '<option value="' + esc(t) + '">' + esc(t) + '</option>';
            }).join('');
        sel.value = valor;
        if (sel.selectedIndex === -1) sel.value = '';
    }

    function espaciosFiltrados() {
        if (!estado.filtroTipo) return estado.espacios;
        return estado.espacios.filter(function (e) { return e.tipo === estado.filtroTipo; });
    }

    function accionesPorRol(e) {
        var botones = '';
        if (ROL === 'Administrador') {
            botones += '<button class="btn-admin btn-admin--primario" data-accion="editar" data-id="' + e.id_espacio + '"><i class="fas fa-pen"></i> Editar</button>';
            botones += '<button class="btn-admin btn-admin--outline" data-accion="solicitudes" data-id="' + e.id_espacio + '"><i class="fas fa-list"></i> Solicitudes</button>';
            botones += '<button class="btn-admin btn-admin--danger" data-accion="eliminar" data-id="' + e.id_espacio + '"><i class="fas fa-trash"></i> Eliminar</button>';
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

        if (!REDUCE && TIENE_GSAP) {
            gsap.fromTo($$('.espacio-fila', cont), { autoAlpha: 0, y: 14 },
                { autoAlpha: 1, y: 0, duration: 0.34, ease: 'power2.out', stagger: 0.04 });
        }
    }

    function alternarFila(principal) {
        var filaEl = principal.closest('.espacio-fila');
        var detalle = $('.espacio-detalle', filaEl);
        var abierta = filaEl.classList.contains('espacio-fila--abierta');

        if (abierta) {
            filaEl.classList.remove('espacio-fila--abierta');
            if (!REDUCE && TIENE_GSAP) {
                gsap.to(detalle, { height: 0, autoAlpha: 0, duration: 0.24, ease: 'power2.in',
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
                { height: 'auto', autoAlpha: 1, duration: 0.3, ease: 'power2.out',
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
        if (ROL !== 'Estudiante') promesas.push(cargarSolicitudes());
        promesas.push(cargarOcupacionOperativa());
        if (ROL === 'Administrador') promesas.push(cargarResumen(), cargarPanel());
        if (ROL === 'Docente') promesas.push(cargarPanel());
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
            pintarEspacios();
        });
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
            gsap.fromTo($$('#miniDias .cal-celda'), { autoAlpha: 0, scale: 0.9 },
                { autoAlpha: 1, scale: 1, duration: 0.22, ease: 'power2.out', stagger: 0.008 });
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
            estado.ocupOp = res.ok ? (res.bloques || []) : [];
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
            if (ROL === 'Administrador') pintarTablaEventos();
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
            gsap.fromTo($$('.cal-mes', cont), { autoAlpha: 0, y: 12 },
                { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power2.out', stagger: 0.03 });
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
                '<td>' + fechas + '</td>' +
                '<td><span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:' + esc(ev.color) + ';border:1px solid rgba(230,215,184,.3);vertical-align:middle;"></span></td>' +
                '<td class="tabla__col-acciones"><span class="tabla__acciones">' +
                    '<button class="btn-icono" title="Editar" data-accion="ev-editar" data-id="' + ev.id_evento + '"><i class="fas fa-pen"></i></button>' +
                    '<button class="btn-icono btn-icono--peligro" title="Eliminar" data-accion="ev-eliminar" data-id="' + ev.id_evento + '"><i class="fas fa-trash"></i></button>' +
                '</span></td>' +
            '</tr>';
        }).join('');
    }

    function abrirModalEvento(evento) {
        $('#formEvento').reset();
        estado.eventoEditandoId = evento ? evento.id_evento : null;
        $('#tituloModalEvento').textContent = evento ? 'Editar evento' : 'Nuevo evento';
        if (evento) {
            $('#evNombre').value = evento.nombre;
            $('#evDescripcion').value = evento.descripcion || '';
            $('#evInicio').value = evento.fecha_inicio;
            $('#evFin').value = evento.fecha_fin || '';
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
            color: colorSel ? colorSel.value : '#8B1E1E'
        };

        var peticion = estado.eventoEditandoId
            ? api('/api/eventos/' + estado.eventoEditandoId, 'PUT', cuerpo)
            : api('/api/eventos', 'POST', cuerpo);

        peticion.then(function (res) {
            if (!res.ok) { setError('#errorModalEvento', res.error || 'No se pudo guardar.'); return; }
            cerrarModal('modalEvento');
            toast('Evento guardado.');
            cargarEventos();
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
        var tbody = $('#tablaUsuarios tbody');
        if (!tbody) return;
        tbody.innerHTML = estado.usuarios.map(function (u) {
            var activo = u.estado === 'Activo';
            var esPropio = u.id_usuario === ID_USUARIO;
            var pill = activo
                ? '<span class="estado-sol estado-sol--aprobada">Activo</span>'
                : '<span class="estado-sol estado-sol--rechazada">Inactivo</span>';
            var acciones = '<span class="tabla__acciones">' +
                '<button class="btn-icono" title="Editar" data-accion="usu-editar" data-id="' + u.id_usuario + '"><i class="fas fa-pen"></i></button>' +
                (esPropio ? '' :
                    '<button class="btn-icono btn-icono--peligro" title="' + (activo ? 'Deshabilitar' : 'Habilitar') +
                    '" data-accion="usu-estado" data-id="' + u.id_usuario + '" data-nuevo="' + (activo ? 'Inactivo' : 'Activo') + '">' +
                    '<i class="fas ' + (activo ? 'fa-user-slash' : 'fa-user-check') + '"></i></button>') +
                '</span>';
            return '<tr>' +
                '<td><strong>' + esc(u.nombre + (u.apellido ? ' ' + u.apellido : '')) + '</strong></td>' +
                '<td>' + esc(u.correo) + '</td>' +
                '<td>' + esc(u.nombre_rol || '—') + '</td>' +
                '<td>' + pill + '</td>' +
                '<td>' + (u.ultimo_acceso ? esc(u.ultimo_acceso.replace('T', ' ').slice(0, 16)) : 'Nunca') + '</td>' +
                '<td class="tabla__col-acciones">' + acciones + '</td>' +
            '</tr>';
        }).join('');
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
        setError('#errorModalUsuario', '');
        abrirModal('modalUsuario');
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

        var cuerpo = {
            nombre: $('#usuNombre').value.trim(),
            apellido: $('#usuApellido').value.trim(),
            correo: $('#usuCorreo').value.trim(),
            password: pass,
            rol: $('#usuRol').value
        };

        var peticion = estado.usuarioEditandoId
            ? api('/api/clientes/' + estado.usuarioEditandoId, 'PUT', cuerpo)
            : api('/api/clientes/registrar', 'POST', cuerpo);

        peticion.then(function (res) {
            if (!res.ok) { setError('#errorModalUsuario', res.error || 'No se pudo guardar.'); return; }
            cerrarModal('modalUsuario');
            toast(estado.usuarioEditandoId ? 'Usuario actualizado.' : 'Usuario creado.');
            cargarUsuarios();
            if (ROL === 'Administrador') cargarResumen();
        });
    }

    /* ================= RESUMENES ================= */

    function cargarResumen() {
        return api('/api/resumen').then(function (res) {
            if (!res.ok) return;
            var r = res.resumen;
            setText('#statEspacios', r.espacios);
            setText('#statDisponibles', r.espacios_disponibles);
            setText('#statPendientes', r.solicitudes_pendientes);
            setText('#statUsuarios', r.usuarios_activos);
            setText('#statEventos', r.eventos);
        });
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

        if (!REDUCE && TIENE_GSAP) {
            gsap.fromTo($$('.evento-card', cont), { autoAlpha: 0, y: 14 },
                { autoAlpha: 1, y: 0, duration: 0.34, ease: 'power2.out', stagger: 0.05 });
        }
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
            if (ROL === 'Administrador') pintarPanelAdmin();
            else if (ROL === 'Docente') pintarPanelDocente();
            else pintarPanelEstudiante();
        });
    }

    function pintarPanelAdmin() {
        var d = estado.panelDatos;
        var alerta = $('#alertaVencidas');
        if (alerta) {
            if (d.vencidas_total > 0) {
                $('#alertaVencidasTexto').textContent =
                    d.vencidas_total + ' solicitud' + (d.vencidas_total === 1 ? '' : 'es') +
                    ' con más de 24 h esperando revisión.';
                alerta.hidden = false;
            } else {
                alerta.hidden = true;
            }
        }

        var fecha = $('#hoyFecha');
        if (fecha) fecha.textContent = fmtFecha(d.hoy.fecha);
        var hoy = $('#hoyContenido');
        if (hoy) {
            var html = '';
            var aprobadas = d.hoy.aprobadas || [];
            var eventos = d.hoy.eventos || [];
            if (!aprobadas.length && !eventos.length) {
                html = '<p class="panel-vacio"><i class="fas fa-coffee"></i> Sin actividades programadas para hoy.</p>';
            } else {
                aprobadas.forEach(function (b) {
                    html += '<div class="hoy-item">' +
                        '<span class="hoy-item__hora">' + esc(String(b.hora_inicio).slice(0, 5)) + '–' +
                            esc(String(b.hora_fin).slice(0, 5)) + '</span>' +
                        '<span class="hoy-item__texto"><i class="fas fa-door-open"></i> ' +
                            esc(b.nombre_actividad) + ' · ' + esc(b.espacio_nombre) + '</span>' +
                    '</div>';
                });
                eventos.forEach(function (ev) {
                    html += '<div class="hoy-item">' +
                        '<span class="hoy-item__hora">Hoy</span>' +
                        '<span class="hoy-item__texto"><i class="fas fa-star" style="color:' + esc(ev.color) + '"></i> ' +
                            esc(ev.nombre) + '</span>' +
                    '</div>';
                });
            }
            hoy.innerHTML = html;
        }

        var act = $('#actividadLista');
        if (act) {
            var feed = d.actividad || [];
            if (!feed.length) {
                act.innerHTML = '<p class="panel-vacio">Aún no hay actividad registrada.</p>';
            } else {
                act.innerHTML = feed.map(function (it) {
                    var icono = it.tipo === 'evento' ? 'fa-star' : 'fa-paper-plane';
                    var pill = it.estado ? badgeSol(it.estado) : '';
                    return '<div class="actividad-item">' +
                        '<span class="actividad-item__icono"><i class="fas ' + icono + '"></i></span>' +
                        '<div class="actividad-item__cuerpo">' +
                            '<p class="actividad-item__texto">' + esc(it.texto) + ' ' + pill + '</p>' +
                            (it.detalle ? '<p class="actividad-item__detalle">' + esc(it.detalle) + '</p>' : '') +
                        '</div>' +
                        '<span class="actividad-item__tiempo">' + esc(tiempoRelativo(it.tiempo)) + '</span>' +
                    '</div>';
                }).join('');
            }
        }
    }

    function pintarPanelDocente() {
        var d = estado.panelDatos;
        var cont = $('#misEspaciosCargo');
        if (!cont) return;
        var espacios = d.mis_espacios || [];
        var pendientes = d.pendientes || [];

        if (!espacios.length) {
            cont.innerHTML = '<p class="panel-vacio"><i class="fas fa-key"></i> Aún no tienes espacios a tu cargo.</p>' +
                '<p class="panel-vacio-texto">Cuando el administrador te asigne un espacio podrás revisar y autorizar sus solicitudes aquí.</p>';
            return;
        }

        var html = '';
        espacios.forEach(function (e) {
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
                        var mapaRoles = { Estudiante: 1, Docente: 2, Administrador: 3 };
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
                }
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
    }

    /* ================= ARRANQUE ================= */

    document.addEventListener('DOMContentLoaded', function () {
        initMenu();
        initTabs();
        initModales();
        initBotones();
        initAcciones();

        var cargas = [cargarEspacios(), cargarEventos(), cargarPanel()];
        if (ROL !== 'Estudiante') cargas.push(cargarSolicitudes());
        if (ROL === 'Administrador') cargas.push(cargarResumen(), cargarUsuarios(), cargarDocentes());

        Promise.all(cargas).then(function () {
            if (ROL === 'Docente') pintarStatsMaestro();
            entradaInicial();
        });
    });
})();
