var ADMIN_USER = 'admin';
var ADMIN_PASS = 'isailo2026';

function checkAdminAuth() {
    if (sessionStorage.getItem('adminAuth') !== 'true') {
        window.location.href = 'admin-login.html';
    }
}

function adminLogin(event) {
    event.preventDefault();
    var usuario = document.getElementById('loginUsuario').value.trim();
    var contrasena = document.getElementById('loginContrasena').value;
    var errorEl = document.getElementById('loginError');

    if (usuario === ADMIN_USER && contrasena === ADMIN_PASS) {
        sessionStorage.setItem('adminAuth', 'true');
        errorEl.classList.remove('admin-login__error--visible');
        window.location.href = 'admin.html';
    } else {
        errorEl.textContent = 'Credenciales incorrectas. Verifica usuario y contraseña.';
        errorEl.classList.add('admin-login__error--visible');
    }
}

function adminLogout() {
    sessionStorage.removeItem('adminAuth');
    window.location.href = 'home.html';
}

document.addEventListener('DOMContentLoaded', function () {
    var hamburguesa = document.getElementById('hamburguesa');
    var navLista = document.querySelector('.nav__lista');
    if (hamburguesa && navLista) {
        hamburguesa.addEventListener('click', function () {
            navLista.classList.toggle('abierto');
        });
        navLista.querySelectorAll('.nav__enlace').forEach(function (enlace) {
            enlace.addEventListener('click', function () {
                navLista.classList.remove('abierto');
            });
        });
    }
});
