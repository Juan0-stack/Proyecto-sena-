/* =====================================================================
   ISAILO MAPS — motion.js
   Motor único de movimiento del panel (Gestión de Calidad).
   Reúne TODA la animación de la interfaz en un solo lugar para que las
   plantillas no esparzan animaciones sueltas.

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
    var REDUCE = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    /* reads/updates de números con separador de miles (es-CO) */
    var FMT = (function () {
        try { return new Intl.NumberFormat('es-CO'); } catch (e) { return null; }
    })();

    function miles(n) {
        n = Math.round(n);
        return FMT ? FMT.format(n) : String(n);
    }

    function aArray(nodos) {
        if (!nodos) return [];
        if (nodos.nodeType === 1) return [nodos];
        return Array.prototype.slice.call(nodos);
    }

    function sinMovimiento() {
        return REDUCE || !ANIME;
    }

    /* ------------------------------------------------------------------
       revealIn — aparición escalonada de los [data-reveal] de un contenedor.
       Se puede volver a llamar cuando se insertan nodos nuevos (fetch).
       Atributos soportados:
         data-reveal="up" | "fade" | "left" | "right"
         data-reveal-delay="120"  (ms extra por elemento)
         data-reveal-stagger="60" (ms entre elementos, opcional)
       ------------------------------------------------------------------ */
    function revealIn(contenedor, opciones) {
        opciones = opciones || {};
        var raiz = contenedor || document;
        var nodos = aArray(raiz.querySelectorAll ? raiz.querySelectorAll('[data-reveal]:not([data-reveal-done])') : []);
        if (raiz.nodeType === 1 && raiz.getAttribute && raiz.hasAttribute('data-reveal') && !raiz.hasAttribute('data-reveal-done')) {
            nodos.unshift(raiz);
        }
        if (!nodos.length) return [];

        if (sinMovimiento()) {
            nodos.forEach(function (el) {
                el.style.opacity = '';
                el.style.transform = '';
                el.setAttribute('data-reveal-done', '1');
            });
            return nodos;
        }

        var gap = opciones.stagger != null ? opciones.stagger
            : (raiz.getAttribute && raiz.getAttribute('data-reveal-stagger')) ? parseInt(raiz.getAttribute('data-reveal-stagger'), 10)
                : 55;
        var dur = opciones.duration || 560;
        var ease = opciones.ease || 'outCubic';
        var poco = opciones.distancia || 14;

        var acumulado = 0;
        nodos.forEach(function (el) {
            var modo = el.getAttribute('data-reveal') || 'up';
            var extra = parseInt(el.getAttribute('data-reveal-delay') || '0', 10) || 0;
            var desdeY = (modo === 'up') ? poco : 0;
            var desdeX = (modo === 'left') ? -poco : (modo === 'right' ? poco : 0);
            var props = {
                opacity: [0, 1],
                duration: dur,
                delay: acumulado + extra,
                ease: ease,
                complete: function () {
                    el.style.opacity = '';
                    el.style.transform = '';
                    el.setAttribute('data-reveal-done', '1');
                }
            };
            if (desdeY) props.translateY = [desdeY, 0];
            if (desdeX) props.translateX = [desdeX, 0];
            ANIME.animate(el, props);
            acumulado += gap;
        });
        return nodos;
    }

    /* ------------------------------------------------------------------
       animateIn — utilidad de bajo nivel equivalente a un stagger de
       entrada. Se usa desde panel.js para contenido generado por fetch.
       ------------------------------------------------------------------ */
    function animateIn(elementos, opciones) {
        var nodos = aArray(elementos);
        if (!nodos.length) return;
        opciones = opciones || {};
        if (sinMovimiento()) return;

        var dur = opciones.duration || 480;
        var gap = opciones.stagger != null ? opciones.stagger : 45;
        var desde = opciones.y != null ? opciones.y : 12;

        nodos.forEach(function (el, i) {
            var props = {
                opacity: [0, 1],
                translateY: [desde, 0],
                duration: dur,
                delay: i * gap,
                ease: opciones.ease || 'outCubic'
            };
            if (opciones.scale != null) props.scale = [opciones.scale, 1];
            ANIME.animate(el, props);
        });
    }

    /* ------------------------------------------------------------------
       animateOut — salida suave (opacidad + pequeño desplazamiento).
       ------------------------------------------------------------------ */
    function animateOut(elementos, opciones) {
        var nodos = aArray(elementos);
        if (!nodos.length) return;
        opciones = opciones || {};
        var terminar = opciones.complete || function () { };
        if (sinMovimiento()) { terminar(); return; }
        var dur = opciones.duration || 220;
        var desde = opciones.y != null ? opciones.y : 8;
        nodos.forEach(function (el, i) {
            ANIME.animate(el, {
                opacity: [1, 0],
                translateY: [0, desde],
                duration: dur,
                delay: i * (opciones.stagger || 0),
                ease: opciones.ease || 'inQuad',
                complete: function () {
                    el.style.opacity = '';
                    el.style.transform = '';
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
            el.textContent = miles(destino);
            return;
        }

        var proxy = { n: 0 };
        ANIME.animate(proxy, {
            n: destino,
            duration: opciones.duration || 900,
            ease: opciones.ease || 'outExpo',
            onUpdate: function () { el.textContent = miles(proxy.n); },
            complete: function () { el.textContent = miles(destino); }
        });
    }

    /* ------------------------------------------------------------------
       drawLine — dibuja un <path>/<line> SVG animando stroke-dashoffset.
       ------------------------------------------------------------------ */
    function drawLine(path, opciones) {
        if (!path) return;
        opciones = opciones || {};
        var longitud = 0;
        try { longitud = path.getTotalLength ? path.getTotalLength() : (path.getAttribute('data-length') || 300); }
        catch (e) { longitud = Number(path.getAttribute('data-length')) || 300; }

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
        aArray(el.querySelectorAll ? el.querySelectorAll('[data-reveal]') : []).forEach(function (n) {
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

    function transitionTo(saliente, entrante, opciones) {
        opciones = opciones || {};
        var hecho = false;
        function finalizar() {
            if (hecho) return;
            hecho = true;
            if (typeof opciones.done === 'function') opciones.done();
        }

        if (!entrante) { finalizar(); return; }

        var token = ++tokenVista;
        function vigente() { return token === tokenVista; }

        /* 1) Mostrar la sección nueva cuanto antes: nunca pantalla vacía. */
        entrante.classList.add('vista--activa');
        entrante.style.visibility = 'visible';

        if (opciones.indicador) moveIndicator(opciones.indicador);

        /* 2) Sin saliente o sin animación: estado final directo. */
        if (!saliente || saliente === entrante || sinMovimiento()) {
            if (saliente && saliente !== entrante) {
                detenerAnimaciones(saliente);
                saliente.classList.remove('vista--activa');
                saliente.style.opacity = '';
                saliente.style.transform = '';
                saliente.style.willChange = '';
            }
            estadoFinalVista(entrante);
            finalizar();
            return;
        }

        detenerAnimaciones(saliente);
        detenerAnimaciones(entrante);

        /* 3) Red de seguridad: pase lo que pase, a los 800 ms estado final. */
        setTimeout(function () {
            if (!vigente()) return;
            if (saliente) {
                saliente.classList.remove('vista--activa');
                saliente.style.opacity = '';
                saliente.style.transform = '';
                saliente.style.willChange = '';
            }
            estadoFinalVista(entrante);
            finalizar();
        }, 800);

        /* 4) Fundido cruzado. */
        saliente.style.opacity = '1';
        ANIME.animate(saliente, {
            opacity: [1, 0],
            translateY: [0, -8],
            duration: 180,
            ease: 'outQuad',
            complete: function () {
                if (!vigente()) return; /* llegó otra transición: ella manda */
                saliente.classList.remove('vista--activa');
                saliente.style.opacity = '';
                saliente.style.transform = '';
                saliente.style.willChange = '';
                try {
                    entradaEscalonada(entrante);
                    revealIn(entrante);
                } finally {
                    finalizar();
                }
            }
        });
    }

    /* Cancela la transición en curso y deja la vista indicada en su estado
       final (por si hay que saltar directo al destino). */
    function cancelarTransicion() {
        tokenVista++;
    }

    function entradaEscalonada(seccion) {
        var hijos = aArray(seccion.children).filter(function (el) {
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

    /* ------------------------------------------------------------------
       moveIndicator — desliza la barra dorada del menú hacia el ítem activo
       (un solo elemento animado). `inmediato` la coloca sin animar.
       ------------------------------------------------------------------ */
    function moveIndicator(item, opciones) {
        opciones = opciones || {};
        var indicador = document.getElementById('menuIndicador');
        if (!indicador) return;

        if (!item) {
            indicador.style.opacity = '0';
            return;
        }

        var contenedor = item.offsetParent || item.parentNode;
        var alto = item.offsetHeight || 44;
        var centro = item.offsetTop + alto / 2;
        var altoIndicador = indicador.offsetHeight || 26;
        var destino = Math.max(0, centro - altoIndicador / 2);

        indicador.style.opacity = '1';

        if (sinMovimiento() || opciones.immediate) {
            indicador.style.transform = 'translateY(' + destino + 'px)';
            return;
        }
        var actual = 0;
        var m = /translateY\(([-\d.]+)px\)/.exec(indicador.style.transform || '');
        if (m) actual = parseFloat(m[1]) || 0;
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
        if (REDUCE || !LENIS) return null;

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
                aArray(activa.querySelectorAll('[data-reveal]:not([data-reveal-done])')).forEach(function (el) {
                    el.style.opacity = '';
                    el.style.transform = '';
                    el.setAttribute('data-reveal-done', '1');
                });
            }, 2600);
        });
    }

    window.Motion = {
        reduce: REDUCE,
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
