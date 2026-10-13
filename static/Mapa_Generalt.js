const areas = document.querySelectorAll("#mapa-general-areas area");

areas.forEach(area => {

    area.addEventListener("click", function(event) {

        event.preventDefault();

        const seccion = this.dataset.seccion;

        abrirSeccion(seccion);

    });

});