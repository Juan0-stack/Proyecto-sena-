(function () {
    'use strict';

    var image = document.getElementById('mapa-general');
    var areas = Array.prototype.slice.call(document.querySelectorAll('#mapa-general-areas area'));
    var visor = document.getElementById('visor-seccion');
    var titulo = document.getElementById('titulo-seccion');
    var contenido = document.getElementById('contenido-seccion');
    var cerrar = document.getElementById('volver');

    function ajustarAreas() {
        if (!image || !image.naturalWidth || !image.clientWidth) return;
        var escala = image.clientWidth / image.naturalWidth;
        areas.forEach(function (area) {
            var originales = (area.dataset.coordenadasOriginales || area.coords)
                .split(',').map(function (valor) { return Number(valor); });
            area.dataset.coordenadasOriginales = originales.join(',');
            area.coords = originales.map(function (valor) {
                return Math.round(valor * escala);
            }).join(',');
        });
    }

    function mostrarZona(area) {
        titulo.textContent = area.dataset.seccion || area.alt || 'Zona del instituto';
        contenido.replaceChildren();

        if (area.dataset.imagen) {
            var foto = document.createElement('img');
            foto.src = area.dataset.imagen;
            foto.alt = 'Imagen de ' + titulo.textContent;
            foto.addEventListener('error', function () {
                contenido.replaceChildren();
                mostrarMensaje('No se pudo cargar la imagen de esta zona.');
            }, { once: true });
            contenido.appendChild(foto);
        } else {
            mostrarMensaje('Todavía no hay una imagen detallada disponible para esta zona.');
        }

        visor.hidden = false;
        visor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function mostrarMensaje(texto) {
        var mensaje = document.createElement('p');
        mensaje.className = 'visor__mensaje';
        mensaje.textContent = texto;
        contenido.appendChild(mensaje);
    }

    areas.forEach(function (area) {
        area.addEventListener('click', function (evento) {
            evento.preventDefault();
            mostrarZona(area);
        });
    });

    cerrar.addEventListener('click', function () {
        visor.hidden = true;
        contenido.replaceChildren();
        image.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    image.addEventListener('load', ajustarAreas);
    window.addEventListener('resize', ajustarAreas, { passive: true });
    if (image.complete) ajustarAreas();
}());
