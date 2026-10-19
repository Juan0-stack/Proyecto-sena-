(function () {
    'use strict';

    var calendario = document.getElementById('calendario');
    var contenedor = document.getElementById('calPublicoMeses');
    var agenda = document.getElementById('calPublicoEventos');
    if (!calendario || !contenedor || !agenda) return;

    var MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    var DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    var ahora = new Date();
    var anio = ahora.getFullYear();
    var mes = ahora.getMonth();
    var eventos = [];

    function escapar(valor) {
        return String(valor == null ? '' : valor).replace(/[&<>"']/g, function (caracter) {
            return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[caracter];
        });
    }

    function fechaISO(fecha) {
        return String(fecha || '').slice(0, 10);
    }

    function fechaLegible(fecha) {
        var partes = fechaISO(fecha).split('-');
        if (partes.length !== 3) return fechaISO(fecha);
        return new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]))
            .toLocaleDateString('es-CO', {day: 'numeric', month: 'short', year: 'numeric'});
    }

    function diaTieneEvento(fecha) {
        return eventos.some(function (evento) {
            var inicio = fechaISO(evento.fecha_inicio);
            var fin = fechaISO(evento.fecha_fin) || inicio;
            return inicio && inicio <= fecha && fecha <= fin;
        });
    }

    function eventosDelMes() {
        var inicioMes = anio + '-' + String(mes + 1).padStart(2, '0') + '-01';
        var finMes = anio + '-' + String(mes + 1).padStart(2, '0') + '-' + String(new Date(anio, mes + 1, 0).getDate()).padStart(2, '0');
        return eventos.filter(function (evento) {
            var inicio = fechaISO(evento.fecha_inicio);
            var fin = fechaISO(evento.fecha_fin) || inicio;
            return inicio && inicio <= finMes && fin >= inicioMes;
        });
    }

    function pintarAgenda() {
        var lista = eventosDelMes();
        if (!lista.length) {
            agenda.innerHTML = '<p class="cal-publico__estado">No hay eventos culturales programados para este mes.</p>';
            return;
        }
        agenda.innerHTML = '<h3>Eventos del mes</h3><div class="cal-publico__eventos-lista">' + lista.map(function (evento) {
            var espacios = evento.espacios_nombres || 'Espacio por confirmar';
            var inicio = fechaISO(evento.fecha_inicio);
            var fin = fechaISO(evento.fecha_fin) || inicio;
            var fechas = inicio === fin ? fechaLegible(inicio) : fechaLegible(inicio) + ' — ' + fechaLegible(fin);
            return '<article class="cal-publico__evento-card">' +
                '<span class="cal-publico__evento-fecha"><i class="fa-regular fa-calendar" aria-hidden="true"></i> ' + escapar(fechas) + '</span>' +
                '<strong>' + escapar(evento.nombre) + '</strong>' +
                '<span class="cal-publico__evento-espacio"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ' + escapar(espacios) + '</span>' +
                (evento.descripcion ? '<p>' + escapar(evento.descripcion) + '</p>' : '') +
                '</article>';
        }).join('') + '</div>';
    }

    function pintarCalendario() {
        document.getElementById('calPublicoAnio').textContent = MESES[mes] + ' ' + anio;
        var primerDia = (new Date(anio, mes, 1).getDay() + 6) % 7;
        var diasMes = new Date(anio, mes + 1, 0).getDate();
        var html = '<div class="cal-publico__dias">' + DIAS.map(function (dia) {
            return '<span class="cal-publico__dia-cab">' + dia + '</span>';
        }).join('');

        for (var vacio = 0; vacio < primerDia; vacio++) {
            html += '<span class="cal-publico__dia cal-publico__dia--fuera" aria-hidden="true"></span>';
        }
        for (var numero = 1; numero <= diasMes; numero++) {
            var fecha = anio + '-' + String(mes + 1).padStart(2, '0') + '-' + String(numero).padStart(2, '0');
            var fechaHoy = new Date();
            var hoyISO = fechaHoy.getFullYear() + '-' + String(fechaHoy.getMonth() + 1).padStart(2, '0') + '-' + String(fechaHoy.getDate()).padStart(2, '0');
            var hoy = fecha === hoyISO;
            var clases = 'cal-publico__dia' + (hoy ? ' cal-publico__dia--hoy' : '');
            html += '<div class="' + clases + '"><span class="cal-publico__numero">' + numero + '</span>' +
                (diaTieneEvento(fecha) ? '<span class="cal-publico__punto" aria-label="Hay evento cultural"></span>' : '') + '</div>';
        }
        contenedor.innerHTML = html + '</div>';
        pintarAgenda();
    }

    function cambiarMes(cantidad) {
        mes += cantidad;
        if (mes < 0) { mes = 11; anio -= 1; }
        if (mes > 11) { mes = 0; anio += 1; }
        pintarCalendario();
    }

    function activarPestana(nombre) {
        document.querySelectorAll('[data-panel-tab]').forEach(function (boton) {
            var activa = boton.getAttribute('data-panel-tab') === nombre;
            boton.classList.toggle('is-active', activa);
            boton.setAttribute('aria-selected', activa ? 'true' : 'false');
            document.getElementById(boton.getAttribute('aria-controls')).hidden = !activa;
        });
    }

    document.querySelectorAll('[data-panel-tab]').forEach(function (boton) {
        boton.addEventListener('click', function () {
            var nombre = boton.getAttribute('data-panel-tab');
            activarPestana(nombre);
            history.replaceState(null, '', nombre === 'espaciosPublicos' ? '#mapa' : '#calendario');
        });
    });
    document.getElementById('calPublicoAnterior').addEventListener('click', function () { cambiarMes(-1); });
    document.getElementById('calPublicoSiguiente').addEventListener('click', function () { cambiarMes(1); });
    document.getElementById('calPublicoHoy').addEventListener('click', function () {
        anio = new Date().getFullYear();
        mes = new Date().getMonth();
        pintarCalendario();
    });

    window.addEventListener('hashchange', function () {
        if (window.location.hash === '#mapa') activarPestana('espaciosPublicos');
        if (window.location.hash === '#calendario') activarPestana('calendario');
    });
    if (window.location.hash === '#mapa') activarPestana('espaciosPublicos');

    fetch('/api/publico/eventos-culturales', {headers: {'Accept': 'application/json'}})
        .then(function (respuesta) {
            if (!respuesta.ok) throw new Error('No se pudo cargar la agenda.');
            return respuesta.json();
        })
        .then(function (datos) {
            eventos = datos && datos.ok && Array.isArray(datos.eventos) ? datos.eventos : [];
            pintarCalendario();
        })
        .catch(function () {
            contenedor.innerHTML = '<p class="cal-publico__estado">No fue posible cargar el calendario.</p>';
            agenda.innerHTML = '';
        });
}());
