/* =====================================================================
   ISAILO MAPS — motion.js
   Qué hace: reúne las animaciones y el desplazamiento suave del panel.
   Quién lo usa: las plantillas de panel y static/panel.js.
   Qué NO hace: no consulta la base de datos ni decide permisos.

   Librerías (vendorizadas en static/vendor/, sin build):
     - anime.js v4.5.0  (global `anime`)
     - Lenis    v1.3.26 (global `Lenis`)  -> scroll suave

   Expone `window.Motion` con:
     revealIn(contenedor)            aparición escalonada de [data-reveal]
     animateIn(elementos, opciones)  utilidad de bajo nivel (stagger)
     countUp(el, valor)              contador numérico (KPI)
     drawLine(path)                  dibuja líneas SVG (stroke-dashoffset)
     sweepDonut(circulo)             barre segmentos de dona
     fillBar(el, porcentaje)         llena barras de progreso (transform)
     transitionTo(saliente, entrante, opciones)
                                     transición entre secciones/pestañas
     moveIndicator(item)             desliza la barra dorada del menú
     initScroll({wrapper, content})  inicia Lenis sobre el área de contenido
     stopScroll() / startScroll()    detener/reanudar (modales)
     scrollTop(inmediato)            volver al inicio del contenido
     reduce                          true si el usuario pide menos movimiento
   ===================================================================== */

(function () {
    'use strict';

    var ANIME = window.anime || null;
    var LENIS = window.Lenis || null;
    var REDUCIR_MOVIMIENTO = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    /* Se prepara el formato de números que se usa en los indicadores. */
    var FORMATO_NUMEROS = null;
    try {
        FORMATO_NUMEROS = new Intl.NumberFormat('es-CO');
    } catch (error) {
        FORMATO_NUMEROS = null;
    }

    function mostrarConSeparadorDeMiles(numero) {
        var numeroRedondeado = Math.round(numero);
        if (FORMATO_NUMEROS) return FORMATO_NUMEROS.format(numeroRedondeado);
        return String(numeroRedondeado);
    }

    function convertirNodosEnLista(nodos) {
        if (!nodos) return [];
        if (nodos.nodeType === 1) return [nodos];
        return Array.prototype.slice.call(nodos);
    }

    function sinMovimiento() {
        return REDUCIR_MOVIMIENTO || !ANIME;
    }

    /* ------------------------------------------------------------------
       revealIn — aparición escalonada de los [data-reveal] de un contenedor.
       Se puede volver a llamar cuando se insertan nodos nuevos (fetch).
       Atributos soportados:
         data-reveal="up" | "fade" | "left" | "right"
         data-reveal-delay="120"  (ms extra por elemento)
         data-reveal-stagger="60" (ms entre elementos, opcional)
       ------------------------------------------------------------------ */
    function buscarElementosPendientes(contenedor) {
        var raiz = contenedor || document;
        var selector = '[data-reveal]:not([data-reveal-done])';
        var nodos = convertirNodosEnLista(raiz.querySelectorAll ? raiz.querySelectorAll(selector) : []);
        var raizPendiente = raiz.nodeType === 1 && raiz.hasAttribute('data-reveal') && !raiz.hasAttribute('data-reveal-done');
        if (raizPendiente) nodos.unshift(raiz);
        return { raiz: raiz, nodos: nodos };
    }

    function dejarElementosVisibles(nodos) {
        nodos.forEach(function (elemento) {
            elemento.style.opacity = '';
            elemento.style.transform = '';
            elemento.setAttribute('data-reveal-done', '1');
        });
    }

    function obtenerSeparacionDeEntrada(opciones, raiz) {
        if (opciones.stagger != null) return opciones.stagger;
        if (raiz.getAttribute) {
            var separacion = raiz.getAttribute('data-reveal-stagger');
            if (separacion) return parseInt(separacion, 10);
        }
        return 55;
    }

    function crearMovimientoInicial(modo, distancia) {
        var movimiento = { x: 0, y: 0 };
        if (modo === 'up') movimiento.y = distancia;
        if (modo === 'left') movimiento.x = -distancia;
        if (modo === 'right') movimiento.x = distancia;
        return movimiento;
    }

    function animarElementoDeEntrada(elemento, opciones, retraso) {
        var modo = elemento.getAttribute('data-reveal') || 'up';
        var retrasoExtra = parseInt(elemento.getAttribute('data-reveal-delay') || '0', 10) || 0;
        var movimiento = crearMovimientoInicial(modo, opciones.distancia);
        var propiedades = {
            opacity: [0, 1],
            duration: opciones.duration,
            delay: retraso + retrasoExtra,
            ease: opciones.ease,
            complete: function () { dejarElementosVisibles([elemento]); }
        };
        if (movimiento.y) propiedades.translateY = [movimiento.y, 0];
        if (movimiento.x) propiedades.translateX = [movimiento.x, 0];
        ANIME.animate(elemento, propiedades);
    }

    function revealIn(contenedor, opciones) {
        opciones = opciones || {};
        var resultado = buscarElementosPendientes(contenedor);
        var nodos = resultado.nodos;
        if (!nodos.length) return [];
        if (sinMovimiento()) {
            dejarElementosVisibles(nodos);
            return nodos;
        }

        var configuracion = {
            stagger: obtenerSeparacionDeEntrada(opciones, resultado.raiz),
            duration: opciones.duration || 560,
            ease: opciones.ease || 'outCubic',
            distancia: opciones.distancia || 14
        };
        var retraso = 0;
        nodos.forEach(function (elemento) {
            animarElementoDeEntrada(elemento, configuracion, retraso);
            retraso += configuracion.stagger;
        });
        return nodos;
    }

    /* ------------------------------------------------------------------
       animateIn — utilidad de bajo nivel equivalente a un stagger de
       entrada. Se usa desde panel.js para contenido generado por fetch.
       ------------------------------------------------------------------ */
    function animateIn(elementos, opciones) {
        var nodos = convertirNodosEnLista(elementos);
        if (!nodos.length) return;
        opciones = opciones || {};
        if (sinMovimiento()) return;

        var duracion = opciones.duration || 480;
        var separacion = opciones.stagger != null ? opciones.stagger : 45;
        var desplazamiento = opciones.y != null ? opciones.y : 12;

        nodos.forEach(function (elemento, i) {
            var propiedades = {
                opacity: [0, 1],
                translateY: [desplazamiento, 0],
                duration: duracion,
                delay: i * separacion,
                ease: opciones.ease || 'outCubic'
            };
            if (opciones.scale != null) propiedades.scale = [opciones.scale, 1];
            ANIME.animate(elemento, propiedades);
        });
    }

    /* ------------------------------------------------------------------
       animateOut — salida suave (opacidad + pequeño desplazamiento).
       ------------------------------------------------------------------ */
    function animateOut(elementos, opciones) {
        var nodos = convertirNodosEnLista(elementos);
        if (!nodos.length) return;
        opciones = opciones || {};
        var terminar = opciones.complete || function () { };
        if (sinMovimiento()) { terminar(); return; }
        var duracion = opciones.duration || 220;
        var desplazamiento = opciones.y != null ? opciones.y : 8;
        nodos.forEach(function (elemento, i) {
            ANIME.animate(elemento, {
                opacity: [1, 0],
                translateY: [0, desplazamiento],
                duration: duracion,
                delay: i * (opciones.stagger || 0),
                ease: opciones.ease || 'inQuad',
                complete: function () {
                    elemento.style.opacity = '';
                    elemento.style.transform = '';
                    terminar();
                }
            });
        });
    }

    /* ------------------------------------------------------------------
       countUp — cuenta de 0 al valor respetando separador de miles.
       ------------------------------------------------------------------ */
    function countUp(el, valor, opciones) {
        if (!el) return;
        opciones = opciones || {};
        var destino = Number(valor);
        if (isNaN(destino)) { el.textContent = valor; return; }

        if (sinMovimiento()) {
            el.textContent = mostrarConSeparadorDeMiles(destino);
            return;
        }

        var contador = { valor: 0 };
        ANIME.animate(contador, {
            valor: destino,
            duration: opciones.duration || 900,
            ease: opciones.ease || 'outExpo',
            onUpdate: function () { el.textContent = mostrarConSeparadorDeMiles(contador.valor); },
            complete: function () { el.textContent = mostrarConSeparadorDeMiles(destino); }
        });
    }

    /* ------------------------------------------------------------------
       drawLine — dibuja un <path>/<line> SVG animando stroke-dashoffset.
       ------------------------------------------------------------------ */
    function drawLine(path, opciones) {
        if (!path) return;
        opciones = opciones || {};
        var longitud;
        if (path.getTotalLength) {
            try {
                longitud = path.getTotalLength();
            } catch (error) {
                longitud = Number(path.getAttribute('data-length')) || 300;
            }
        } else {
            longitud = path.getAttribute('data-length') || 300;
        }

        path.style.strokeDasharray = longitud + ' ' + longitud;

        if (sinMovimiento()) {
            path.style.strokeDashoffset = '0';
            return;
        }
        ANIME.animate(path, {
            strokeDashoffset: [longitud, 0],
            duration: opciones.duration || 1100,
            delay: opciones.delay || 0,
            ease: opciones.ease || 'outQuad'
        });
    }

    /* ------------------------------------------------------------------
       sweepDonut — barre un segmento de dona.
       El elemento debe traer `data-len` (longitud del trazo) o se calcula.
       ------------------------------------------------------------------ */
    function sweepDonut(circulo, opciones) {
        if (!circulo) return;
        opciones = opciones || {};
        var longitud = Number(circulo.getAttribute('data-len')) || 0;
        if (!longitud && circulo.getTotalLength) {
            try { longitud = circulo.getTotalLength(); } catch (e) { longitud = 0; }
        }
        if (!longitud) {
            var r = Number(circulo.getAttribute('r')) || 0;
            longitud = 2 * Math.PI * r;
        }
        var offsetFinal = Number(circulo.getAttribute('data-offset')) || 0;
        circulo.style.strokeDasharray = longitud + ' ' + longitud;

        if (sinMovimiento()) {
            circulo.style.strokeDashoffset = String(offsetFinal);
            return;
        }
        ANIME.animate(circulo, {
            strokeDashoffset: [longitud, offsetFinal],
            duration: opciones.duration || 900,
            delay: opciones.delay || 0,
            ease: opciones.ease || 'outCubic'
        });
    }

    /* ------------------------------------------------------------------
       fillBar — llena una barra de progreso animando transform (scaleX).
       El elemento debe tener transform-origin: left.
       ------------------------------------------------------------------ */
    function fillBar(el, porcentaje, opciones) {
        if (!el) return;
        opciones = opciones || {};
        var pct = Math.max(0, Math.min(100, Number(porcentaje) || 0)) / 100;
        if (sinMovimiento()) {
            el.style.transform = 'scaleX(' + pct + ')';
            return;
        }
        el.style.transform = 'scaleX(0)';
        ANIME.animate(el, {
            scaleX: [0, pct],
            duration: opciones.duration || 800,
            delay: opciones.delay || 0,
            ease: opciones.ease || 'outCubic'
        });
    }

    /* ------------------------------------------------------------------
       Utilidades de estado de vista.
       detenerAnimaciones(el): cancela cualquier animación en curso sobre el
       elemento y su subárbol. estadoFinalVista(el): fuerza el estado visible
       definitivo (opacidad 1, sin transform, visible). Sirve de red de
       seguridad para que NUNCA quede una pantalla en negro.
       ------------------------------------------------------------------ */
    function detenerAnimaciones(el) {
        if (!el || !ANIME) return;
        try {
            ANIME.remove(el);
            if (el.querySelectorAll) {
                var nodos = el.querySelectorAll('*');
                if (nodos.length) ANIME.remove(nodos);
            }
        } catch (e) { /* seguimos: el estado final se fija a mano */ }
    }

    function estadoFinalVista(el) {
        if (!el) return;
        detenerAnimaciones(el);
        el.classList.add('vista--activa');
        el.style.opacity = '';
        el.style.transform = '';
        el.style.willChange = '';
        el.style.visibility = 'visible';
        if (el.getAttribute) el.setAttribute('data-reveal-done', '1');
        convertirNodosEnLista(el.querySelectorAll ? el.querySelectorAll('[data-reveal]') : []).forEach(function (n) {
            n.style.opacity = '';
            n.style.transform = '';
            n.setAttribute('data-reveal-done', '1');
        });
    }

    /* ------------------------------------------------------------------
       transitionTo — transición entre secciones/pestañas.
       Reglas (spec §2):
         - La sección nueva se muestra ANTES de animar: nunca hay un momento
           sin sección visible.
         - Salida: opacidad 0 + -8px (~180 ms). Entrada: encabezado y bloques
           con stagger.
         - Si algo falla o se interrumpe, a los 800 ms se fija el estado final.
         - Cada llamada invalida la anterior mediante un token (clic rápido).
       ------------------------------------------------------------------ */
    var tokenVista = 0;

    function finalizarTransicion(estado, opciones) {
        if (estado.finalizada) return;
        estado.finalizada = true;
        if (typeof opciones.done === 'function') opciones.done();
    }

    function limpiarVistaSaliente(vista) {
        if (!vista) return;
        vista.classList.remove('vista--activa');
        vista.style.opacity = '';
        vista.style.transform = '';
        vista.style.willChange = '';
    }

    function prepararVistaEntrante(vista, opciones) {
        vista.classList.add('vista--activa');
        vista.style.visibility = 'visible';
        if (opciones.indicador) moveIndicator(opciones.indicador);
    }

    function programarRespaldoDeTransicion(saliente, entrante, token, estado, opciones) {
        setTimeout(function () {
            if (token !== tokenVista) return;
            limpiarVistaSaliente(saliente);
            estadoFinalVista(entrante);
            finalizarTransicion(estado, opciones);
        }, 800);
    }

    function animarSalidaDeVista(saliente, entrante, token, estado, opciones) {
        saliente.style.opacity = '1';
        ANIME.animate(saliente, {
            opacity: [1, 0],
            translateY: [0, -8],
            duration: 180,
            ease: 'outQuad',
            complete: function () {
                if (token !== tokenVista) return;
                limpiarVistaSaliente(saliente);
                try {
                    entradaEscalonada(entrante);
                    revealIn(entrante);
                } finally {
                    finalizarTransicion(estado, opciones);
                }
            }
        });
    }

    function transitionTo(saliente, entrante, opciones) {
        opciones = opciones || {};
        var estado = { finalizada: false };
        if (!entrante) {
            finalizarTransicion(estado, opciones);
            return;
        }

        var token = ++tokenVista;
        prepararVistaEntrante(entrante, opciones);

        if (!saliente || saliente === entrante || sinMovimiento()) {
            if (saliente && saliente !== entrante) {
                detenerAnimaciones(saliente);
                limpiarVistaSaliente(saliente);
            }
            estadoFinalVista(entrante);
            finalizarTransicion(estado, opciones);
            return;
        }

        detenerAnimaciones(saliente);
        detenerAnimaciones(entrante);
        programarRespaldoDeTransicion(saliente, entrante, token, estado, opciones);
        animarSalidaDeVista(saliente, entrante, token, estado, opciones);
    }

    /* Cancela la transición en curso y deja la vista indicada en su estado
       final (por si hay que saltar directo al destino). */
    function cancelarTransicion() {
        tokenVista++;
    }

    function entradaEscalonada(seccion) {
        var hijos = convertirNodosEnLista(seccion.children).filter(function (el) {
            /* Los [data-reveal] los anima revealIn con su propia cadencia. */
            return !(el.getAttribute && el.hasAttribute('data-reveal'));
        });
        if (!hijos.length) return;
        hijos.forEach(function (el, i) {
            ANIME.animate(el, {
                opacity: [0, 1],
                translateY: [10, 0],
                duration: i === 0 ? 420 : 380,
                delay: i * 45,
                ease: 'outCubic',
                complete: function () {
                    el.style.opacity = '';
                    el.style.transform = '';
                }
            });
        });
    }

    /* Calcula dónde debe quedar el marcador del menú. */
    function calcularDestinoIndicador(item, indicador) {
        var alturaItem = item.offsetHeight || 44;
        var centroItem = item.offsetTop + alturaItem / 2;
        var alturaIndicador = indicador.offsetHeight || 26;
        return Math.max(0, centroItem - alturaIndicador / 2);
    }

    function obtenerPosicionActualIndicador(indicador) {
        var resultado = /translateY\(([-\d.]+)px\)/.exec(indicador.style.transform || '');
        if (!resultado) return 0;
        return parseFloat(resultado[1]) || 0;
    }

    function moveIndicator(item, opciones) {
        opciones = opciones || {};
        var indicador = document.getElementById('menuIndicador');
        if (!indicador) return;

        if (!item) {
            indicador.style.opacity = '0';
            return;
        }

        /* SIN USO: se conserva esta referencia que existía antes del cambio. */
        var contenedor = item.offsetParent || item.parentNode;
        var destino = calcularDestinoIndicador(item, indicador);

        indicador.style.opacity = '1';

        if (sinMovimiento() || opciones.immediate) {
            indicador.style.transform = 'translateY(' + destino + 'px)';
            return;
        }
        var actual = obtenerPosicionActualIndicador(indicador);
        ANIME.animate(indicador, {
            translateY: [actual, destino],
            duration: 300,
            ease: 'outCubic'
        });
    }

    /* ------------------------------------------------------------------
       Lenis — scroll suave SOLO del área de contenido.
       ------------------------------------------------------------------ */
    var lenis = null;
    var wrapperScroll = null;

    function initScroll(opciones) {
        opciones = opciones || {};
        wrapperScroll = opciones.wrapper || null;
        if (!wrapperScroll) return null;
        if (REDUCIR_MOVIMIENTO || !LENIS) return null;

        try {
            lenis = new LENIS({
                wrapper: wrapperScroll,
                content: opciones.content || wrapperScroll,
                duration: 1.05,
                smoothWheel: true,
                autoRaf: true,
                anchors: false
            });
        } catch (e) {
            lenis = null;
        }
        return lenis;
    }

    function stopScroll() {
        if (lenis) lenis.stop();
        else if (wrapperScroll) wrapperScroll.style.overflow = 'hidden';
    }

    function startScroll() {
        if (lenis) lenis.start();
        else if (wrapperScroll) wrapperScroll.style.overflow = '';
    }

    function scrollTop(inmediato) {
        if (lenis) {
            lenis.scrollTo(0, { immediate: !!inmediato });
            return;
        }
        if (wrapperScroll) wrapperScroll.scrollTop = 0;
        window.scrollTo({ top: 0, behavior: inmediato ? 'auto' : 'smooth' });
    }

    /* ------------------------------------------------------------------
       Red de seguridad — si alguna animación no llegó a completarse
       (pestaña en segundo plano, error puntual), a los 2.6 s del `load`
       dejamos visible lo que quede oculto en la vista activa.
       ------------------------------------------------------------------ */
    if (typeof window !== 'undefined' && window.addEventListener) {
        window.addEventListener('load', function () {
            setTimeout(function () {
                var activa = document.querySelector('.vista--activa') || document;
                convertirNodosEnLista(activa.querySelectorAll('[data-reveal]:not([data-reveal-done])')).forEach(function (el) {
                    el.style.opacity = '';
                    el.style.transform = '';
                    el.setAttribute('data-reveal-done', '1');
                });
            }, 2600);
        });
    }

    window.Motion = {
        reduce: REDUCIR_MOVIMIENTO,
        animado: !!ANIME,
        suave: !!LENIS,
        revealIn: revealIn,
        animateIn: animateIn,
        animateOut: animateOut,
        countUp: countUp,
        drawLine: drawLine,
        sweepDonut: sweepDonut,
        fillBar: fillBar,
        transitionTo: transitionTo,
        cancelarTransicion: cancelarTransicion,
        detenerAnimaciones: detenerAnimaciones,
        estadoFinalVista: estadoFinalVista,
        moveIndicator: moveIndicator,
        initScroll: initScroll,
        stopScroll: stopScroll,
        startScroll: startScroll,
        scrollTop: scrollTop
    };
})();
