document.addEventListener('DOMContentLoaded', function () {
    var header = document.getElementById('header');

    window.addEventListener('scroll', function () {
        if (window.scrollY > 30) {
            header.classList.add('header-scrolled');
        } else {
            header.classList.remove('header-scrolled');
        }
    });

    var hamburguesa = document.getElementById('hamburguesa');
    var navLista = document.querySelector('.nav__lista');

    hamburguesa.addEventListener('click', function () {
        navLista.classList.toggle('abierto');
    });

    navLista.querySelectorAll('.nav__enlace').forEach(function (enlace) {
        enlace.addEventListener('click', function () {
            navLista.classList.remove('abierto');
        });
    });

    var pista = document.getElementById('carruselPista');
    if (!pista) return;

    var btnAnterior = document.getElementById('anterior');
    var btnSiguiente = document.getElementById('siguiente');
    var contPuntos = document.getElementById('indicadores');

    var diapositivas = pista.querySelectorAll('.carrusel__diapositiva');
    var total = diapositivas.length;
    var indiceActual = 0;

    diapositivas.forEach(function (_, i) {
        var punto = document.createElement('button');
        punto.classList.add('carrusel__punto');
        if (i === 0) punto.classList.add('carrusel__punto--activo');
        punto.setAttribute('aria-label', 'Ir a diapositiva ' + (i + 1));
        punto.addEventListener('click', function () {
            irA(i);
        });
        contPuntos.appendChild(punto);
    });

    function irA(indice) {
        indiceActual = indice;
        pista.style.transform = 'translateX(-' + (indiceActual * 100) + '%)';
        contPuntos.querySelectorAll('.carrusel__punto').forEach(function (p, i) {
            p.classList.toggle('carrusel__punto--activo', i === indiceActual);
        });
    }

    btnSiguiente.addEventListener('click', function () {
        irA((indiceActual + 1) % total);
    });

    btnAnterior.addEventListener('click', function () {
        irA((indiceActual - 1 + total) % total);
    });

    var intervalo = setInterval(function () {
        irA((indiceActual + 1) % total);
    }, 5000);

    [btnAnterior, btnSiguiente].forEach(function (btn) {
        btn.addEventListener('click', function () {
            clearInterval(intervalo);
            intervalo = setInterval(function () {
                irA((indiceActual + 1) % total);
            }, 5000);
        });
    });
});