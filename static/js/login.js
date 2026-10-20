/* =====================================================================
   ISAILO MAPS — login.js
   Implementación ÚNICA y compartida para los dos accesos (general y
   administrativo). Cubre (spec §4 y §8):
     - Aparición gradual de la tarjeta y de los pasos (logo, título,
       subtítulo, campos, botón) con cascada de 60–90 ms.
     - Sacudida horizontal de 6 px (3 oscilaciones) al fallar.
     - Estado "Ingresando…" y desvanecido de la tarjeta al acertar.
     - Ojo de mostrar/ocultar contraseña (raya diagonal en estado oculto)
       con transición de ~150 ms y aria-pressed.
   Respeta prefers-reduced-motion.
   Se configura con atributos data-* en #loginCard y #formLogin.
   ===================================================================== */
(function () {
    'use strict';

    var REDUCE = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var ANIME = window.anime || null;
    var HTML = document.documentElement;

    var card = document.getElementById('loginCard');
    var form = document.getElementById('formLogin');
    var errorDiv = document.getElementById('loginError');
    var errorText = document.getElementById('loginErrorText');

    function sinAnimacion() { return REDUCE || !ANIME; }

    /* ----------------------------------------------------------------
       Entrada gradual (cascada). La tarjeta sube ~24 px en 500–700 ms y
       el resto de pasos entra con 70 ms de separación.
       ---------------------------------------------------------------- */
    function mostrarTarjeta() {
        if (!card) return;
        var selector = card.getAttribute('data-steps') || '';
        var pasos = selector ? Array.prototype.slice.call(document.querySelectorAll(selector)) : [];
        pasos = pasos.filter(function (el) { return el && el !== card; });

        function revelarTodos() {
            [card].concat(pasos).forEach(function (el) {
                el.style.opacity = '1';
                el.style.transform = 'none';
            });
            HTML.classList.remove('login-anim');
        }

        if (sinAnimacion()) { revelarTodos(); return; }

        ANIME.animate(card, {
            opacity: [0, 1],
            translateY: [24, 0],
            duration: 560,
            ease: 'outCubic'
        });
        pasos.forEach(function (el, i) {
            ANIME.animate(el, {
                opacity: [0, 1],
                translateY: [16, 0],
                duration: 460,
                delay: 80 + i * 70,
                ease: 'outCubic'
            });
        });

        /* Quitamos el bloqueo visual cuando termina la cascada. Los valores
           en línea ya dejan todo visible, así que no hay parpadeo. */
        setTimeout(revelarTodos, 80 + pasos.length * 70 + 520);
    }

    /* ----------------------------------------------------------------
       Error: mensaje con desvanecido + sacudida del formulario.
       ---------------------------------------------------------------- */
    function mostrarError(mensaje) {
        if (errorText) errorText.textContent = mensaje || 'No se pudo iniciar sesión.';
        if (errorDiv) {
            errorDiv.hidden = false;
            errorDiv.style.opacity = '0';
            var mostrar = function () { errorDiv.style.opacity = '1'; };
            if (window.requestAnimationFrame) window.requestAnimationFrame(mostrar);
            else mostrar();
        }
        var objetivo = (form && !sinAnimacion()) ? form : null;
        if (objetivo) {
            ANIME.animate(objetivo, {
                translateX: [0, 6, -6, 6, -6, 6, -6, 0],
                duration: 420,
                ease: 'easeInOutQuad',
                complete: function () { objetivo.style.transform = ''; }
            });
        }
    }

    function ocultarError() {
        if (!errorDiv) return;
        errorDiv.style.opacity = '0';
        errorDiv.hidden = true;
        if (errorText) errorText.textContent = '';
    }

    function mostrarAvisoDeAcceso() {
        var aviso = new URLSearchParams(window.location.search).get('aviso');
        var mensajes = {
            docente: 'Esta cuenta es de docente. Ya puedes ingresar aquí.',
            admin: 'Esta cuenta es administrativa. Ya puedes ingresar aquí.'
        };
        if (!mensajes[aviso]) return;
        mostrarError(mensajes[aviso]);
        window.history.replaceState({}, '', window.location.pathname);
    }

    /* ----------------------------------------------------------------
       Envío del formulario.
       ---------------------------------------------------------------- */
    function marcarEnviando() {
        if (!form) return;
        var boton = form.querySelector('.login-submit');
        if (!boton) return;
        var texto = boton.querySelector('span');
        if (texto) texto.textContent = 'Ingresando…';
        boton.disabled = true;
        boton.classList.add('login-submit--enviando');
    }

    function irAlPanel(destino) {
        var url = destino || card && card.getAttribute('data-panel') || '/login';
        var ir = function () { window.location.assign(url); };
        if (card && !sinAnimacion()) {
            ANIME.animate(card, { opacity: [1, 0], duration: 320, ease: 'inQuad', complete: ir });
            setTimeout(ir, 650); /* red de seguridad */
        } else {
            ir();
        }
    }

    if (form) {
        form.addEventListener('submit', function (ev) {
            ev.preventDefault();
            ocultarError();

            var fd = new FormData(form);
            var payload = {
                correo: fd.get('correo'),
                password: fd.get('password')
            };
            if (form.getAttribute('data-admin-only') === '1') payload.admin_only = true;

            marcarEnviando();

            fetch('/api/clientes/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(function (res) { return res.json(); })
                .then(function (res) {
                    if (!res.ok) {
                        /* Volvemos a habilitar el botón para reintentar. */
                        var boton = form.querySelector('.login-submit');
                        if (boton) {
                            boton.disabled = false;
                            boton.classList.remove('login-submit--enviando');
                            var t = boton.querySelector('span');
                            if (t) t.textContent = boton.getAttribute('data-texto') || 'Ingresar';
                        }
                        mostrarError(res.error || 'No se pudo iniciar sesión.');
                        if (res.redirect) {
                            setTimeout(function () { window.location.assign(res.redirect); }, 1200);
                        }
                        return;
                    }
                    try { sessionStorage.setItem('isailo-login-transition', '1'); } catch (e) { }
                    irAlPanel(res.panel);
                })
                .catch(function () { mostrarError('No se pudo iniciar sesión.'); });
        });
    }

    /* ----------------------------------------------------------------
       Ojo de contraseña (compartido). Estado inicial: oculto → icono con
       raya diagonal. Al pulsar alterna y actualiza aria-pressed.
       ---------------------------------------------------------------- */
    function initPasswordToggle() {
        var boton = document.getElementById('togglePassword');
        var input = document.getElementById('password');
        if (!boton || !input) return;
        var icono = boton.querySelector('i');

        function pintar(mostrando) {
            if (icono) {
                icono.classList.toggle('fa-eye', mostrando);
                icono.classList.toggle('fa-eye-slash', !mostrando);
            }
            boton.setAttribute('aria-pressed', mostrando ? 'true' : 'false');
            boton.setAttribute('aria-label', mostrando ? 'Ocultar contraseña' : 'Mostrar contraseña');
            boton.setAttribute('title', mostrando ? 'Ocultar contraseña' : 'Mostrar contraseña');
        }

        function alternar() {
            var mostrar = input.type === 'password';
            var cambiar = function () {
                input.type = mostrar ? 'text' : 'password';
                pintar(mostrar);
                /* Mantener el foco en el campo. */
                input.focus({ preventScroll: true });
            };
            if (icono && !sinAnimacion()) {
                icono.style.transition = 'opacity 150ms ease';
                icono.style.opacity = '0';
                setTimeout(function () { cambiar(); icono.style.opacity = '1'; }, 150);
            } else {
                cambiar();
            }
        }

        /* Estado inicial coherente (contraseña oculta). */
        pintar(false);
        boton.setAttribute('type', 'button');
        boton.addEventListener('click', alternar);
    }

    /* ----------------------------------------------------------------
       Arranque.
       ---------------------------------------------------------------- */
    function iniciar() {
        initPasswordToggle();
        mostrarTarjeta();
        mostrarAvisoDeAcceso();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }
})();
