# -*- coding: utf-8 -*-
"""
Pruebas de la sección 9 / tabla de destinos de la sección 1.
Capa de modelos en memoria (no hay MySQL en esta máquina).
Uso:  python test_destinos.py
"""
import sys, os, json
from werkzeug.security import generate_password_hash

sys.path.insert(0, r'C:\Users\juanb\Downloads\Proyecto-sena--main')

import app as app_module
from models.cliente_model import ClienteModel
from models.espacio_model import EspacioModel
from models.solicitud_model import SolicitudModel
from models.evento_model import EventoModel

app = app_module.app
app.config['TESTING'] = True
app.config['SECRET_KEY'] = 'test'

HASH_ADMIN = generate_password_hash('isailo2026', method='pbkdf2:sha256')
HASH_DOC   = generate_password_hash('docente123', method='pbkdf2:sha256')
HASH_EST   = generate_password_hash('estudiante123', method='pbkdf2:sha256')
HASH_INA   = generate_password_hash('inactivo123', method='pbkdf2:sha256')

USUARIOS = [
    {'id_usuario': 1, 'nombre': 'Administrador', 'apellido': 'ISAILO', 'correo': 'admin',
     'password_hash': HASH_ADMIN, 'estado': 'Activo', 'id_rol': 3, 'nombre_rol': 'Administrador'},
    {'id_usuario': 2, 'nombre': 'Carolina', 'apellido': 'Rios', 'correo': 'carolina@colegio.edu',
     'password_hash': HASH_DOC, 'estado': 'Activo', 'id_rol': 2, 'nombre_rol': 'Docente'},
    {'id_usuario': 3, 'nombre': 'Pedro', 'apellido': 'Gomez', 'correo': 'pedro@colegio.edu',
     'password_hash': HASH_EST, 'estado': 'Activo', 'id_rol': 1, 'nombre_rol': 'Estudiante'},
    {'id_usuario': 4, 'nombre': 'Lucia', 'apellido': 'Vera', 'correo': 'lucia@colegio.edu',
     'password_hash': HASH_INA, 'estado': 'Inactivo', 'id_rol': 1, 'nombre_rol': 'Estudiante'},
]
by_correo = {u['correo']: u for u in USUARIOS}


def _buscar_por_correo(correo):
    return by_correo.get((correo or '').strip())


def _buscar_por_id(uid):
    for u in USUARIOS:
        if u['id_usuario'] == int(uid):
            return u
    return None


ClienteModel.buscar_por_correo = staticmethod(_buscar_por_correo)
ClienteModel.buscar_por_id = staticmethod(_buscar_por_id)
ClienteModel.actualizar_acceso = staticmethod(lambda uid: True)
ClienteModel.listar = staticmethod(lambda: [
    {k: u[k] for k in ('id_usuario', 'nombre', 'apellido', 'correo', 'estado', 'id_rol', 'nombre_rol')}
    for u in USUARIOS])
ClienteModel.listar_roles = staticmethod(lambda: [
    {'id_rol': 1, 'nombre_rol': 'Estudiante'}, {'id_rol': 2, 'nombre_rol': 'Docente'},
    {'id_rol': 3, 'nombre_rol': 'Administrador'}])
ClienteModel.listar_docentes = staticmethod(lambda: [{'id_usuario': 2, 'nombre': 'Carolina', 'apellido': 'Rios'}])
ClienteModel.contar_activos = staticmethod(lambda: sum(1 for u in USUARIOS if u['estado'] == 'Activo'))
ClienteModel.cambiar_estado = staticmethod(lambda uid, estado: True)

# Altas de usuario en memoria (espec. §6: Docente con espacio, Estudiante sin espacio)
CREADOS = []
ASIGNACIONES = []


def _crear(nombre, apellido, correo, password, id_rol):
    nuevo = {'id_usuario': 100 + len(CREADOS), 'nombre': nombre, 'apellido': apellido,
             'correo': correo, 'password_hash': generate_password_hash(password),
             'estado': 'Activo',
             'id_rol': int(id_rol),
             'nombre_rol': {1: 'Estudiante', 2: 'Docente', 3: 'Administrador'}[int(id_rol)]}
    CREADOS.append(nuevo)
    by_correo[correo] = nuevo
    return nuevo['id_usuario']


ClienteModel.crear = staticmethod(_crear)
EspacioModel.asignar_encargado = staticmethod(
    lambda id_espacio, id_usuario: ASIGNACIONES.append((int(id_espacio), id_usuario)) or True)

# Base de datos "recién creada": solo admin, todo lo demás en cero.
EspacioModel.listar = staticmethod(lambda: [])
EspacioModel.contar = staticmethod(lambda: 0)
EspacioModel.contar_por_estado = staticmethod(lambda e: 0)
EspacioModel.listar_por_encargado = staticmethod(lambda uid: [])
SolicitudModel.listar_todas = staticmethod(lambda: [])
SolicitudModel.listar_recientes = staticmethod(lambda n=8: [])
SolicitudModel.listar_de_usuario = staticmethod(lambda uid: [])
SolicitudModel.contar_por_estado = staticmethod(lambda e: 0)
SolicitudModel.contar_vencidas = staticmethod(lambda: 0)
SolicitudModel.ocupacion = staticmethod(lambda *a, **k: 0)
EventoModel.listar = staticmethod(lambda: [])
EventoModel.listar_futuros = staticmethod(lambda n=None: [])
EventoModel.listar_recientes = staticmethod(lambda n=5: [])
EventoModel.contar = staticmethod(lambda: 0)

RESULTADOS = []


def check(nombre, ok, detalle=''):
    RESULTADOS.append((nombre, bool(ok), detalle))
    print(('  PASS  ' if ok else '  FAIL  ') + nombre + ('   -> ' + str(detalle) if detalle and not ok else ''))


def client():
    return app.test_client()


def _leer(rel):
    ruta = os.path.join(os.path.dirname(os.path.abspath(__file__)), rel)
    with open(ruta, encoding='utf-8') as fh:
        return fh.read()


def _panel_js():
    return _leer(os.path.join('static', 'panel.js'))


def get(url, **kw):
    return client().get(url, follow_redirects=False, **kw)


def login_session(nombre_rol, id_usuario=2, nombre='Usuario Prueba'):
    """Simula que la sesión ya está iniciada."""
    c = client()
    with c.session_transaction() as s:
        s['id_usuario'] = id_usuario
        s['nombre'] = nombre
        s['correo'] = 'x@y.z'
        s['id_rol'] = {'Administrador': 3, 'Docente': 2, 'Estudiante': 1}[nombre_rol]
        s['nombre_rol'] = nombre_rol
    return c


def main():
    print('\n===== 1. TABLA DE DESTINOS (sección 1) =====')

    # Login general
    r = client().post('/api/clientes/login', json={'correo': 'admin', 'password': 'isailo2026'})
    d = r.get_json()
    check('Admin por login general -> /admin/panel', d.get('ok') and d.get('panel') == '/admin/panel', d)

    r = client().post('/api/clientes/login', json={'correo': 'carolina@colegio.edu', 'password': 'docente123'})
    d = r.get_json()
    check('Docente -> /maestro/panel', d.get('ok') and d.get('panel') == '/maestro/panel', d)

    r = client().post('/api/clientes/login', json={'correo': 'pedro@colegio.edu', 'password': 'estudiante123'})
    d = r.get_json()
    check('Estudiante -> /estudiante/panel', d.get('ok') and d.get('panel') == '/estudiante/panel', d)

    # Admin por login administrativo (admin_only)
    r = client().post('/api/clientes/login', json={'correo': 'admin', 'password': 'isailo2026', 'admin_only': True})
    d = r.get_json()
    check('Admin por login administrativo -> /admin/panel', d.get('ok') and d.get('panel') == '/admin/panel', d)

    # Credenciales incorrectas
    r = client().post('/api/clientes/login', json={'correo': 'admin', 'password': 'mala'})
    d = r.get_json()
    check('Credenciales incorrectas -> error en el mismo login',
          (not d.get('ok')) and 'incorrectas' in (d.get('error') or ''), d)

    # Cuenta inactiva
    r = client().post('/api/clientes/login', json={'correo': 'lucia@colegio.edu', 'password': 'inactivo123'})
    d = r.get_json()
    check('Cuenta inactiva -> mensaje de deshabilitada',
          (not d.get('ok')) and 'deshabilitada' in (d.get('error') or ''), d)

    # Docente/estudiante entrando al login administrativo
    for correo, pw in (('carolina@colegio.edu', 'docente123'), ('pedro@colegio.edu', 'estudiante123')):
        c = client()
        r = c.post('/api/clientes/login', json={'correo': correo, 'password': pw, 'admin_only': True})
        d = r.get_json()
        with c.session_transaction() as s:
            sin_sesion = 'id_usuario' not in s
        check('Docente/Estudiante en login admin rechazado y sin sesión (%s)' % correo,
              (not d.get('ok')) and 'acceso administrativo' in (d.get('error') or '') and sin_sesion, d)

    print('\n===== 2. RUTAS DE PÁGINA (sin 404) =====')

    # Sin sesión: los paneles van al login (o al login admin)
    for ruta, destino in (('/admin/panel', '/login'), ('/maestro/panel', '/login'),
                          ('/estudiante/panel', '/login'), ('/solicitud-espacio', '/login')):
        r = get(ruta)
        check('Sin sesión %s -> 302 %s' % (ruta, destino),
              r.status_code == 302 and r.headers.get('Location', '').rstrip('/') == destino,
              '%s -> %s %s' % (ruta, r.status_code, r.headers.get('Location')))

    # Con sesión de otro rol -> redirige a SU panel
    c = login_session('Docente')
    r = c.get('/admin/panel')
    check('Docente abre panel admin -> redirige a /maestro/panel',
          r.status_code == 302 and r.headers.get('Location') == '/maestro/panel',
          '%s %s' % (r.status_code, r.headers.get('Location')))

    c = login_session('Estudiante', id_usuario=3, nombre='Pedro')
    r = c.get('/maestro/panel')
    check('Estudiante abre panel docente -> redirige a /estudiante/panel',
          r.status_code == 302 and r.headers.get('Location') == '/estudiante/panel',
          '%s %s' % (r.status_code, r.headers.get('Location')))

    c = login_session('Docente')
    r = c.get('/estudiante/panel')
    check('Docente abre panel estudiante -> redirige a /maestro/panel',
          r.status_code == 302 and r.headers.get('Location') == '/maestro/panel',
          '%s %s' % (r.status_code, r.headers.get('Location')))

    # Cada rol llega a su panel
    for rol, ruta in (('Administrador', '/admin/panel'), ('Docente', '/maestro/panel'),
                      ('Estudiante', '/estudiante/panel')):
        c = login_session(rol, id_usuario=3 if rol == 'Estudiante' else 2)
        r = c.get(ruta)
        check('%s entra a %s -> 200' % (rol, ruta), r.status_code == 200, r.status_code)

    # Cerrar sesión
    c = login_session('Administrador')
    r = c.get('/logout')
    check('Cerrar sesión -> /login', r.status_code == 302 and r.headers.get('Location') == '/login',
          '%s %s' % (r.status_code, r.headers.get('Location')))

    # Rutas antiguas -> nunca 404
    for ruta in ('/register', '/register.html', '/register_pag', '/admin', '/admin.html',
                 '/admin-login', '/admin-login.html', '/home', '/home.html',
                 '/index.html', '/pan', '/login.html'):
        r = get(ruta)
        check('Ruta antigua %s no da 404' % ruta, r.status_code != 404, r.status_code)

    # Login administrativo con sesión -> panel
    c = login_session('Administrador')
    r = c.get('/admin/login')
    check('Login admin con sesión -> redirige al panel', r.status_code == 302, r.status_code)

    print('\n===== 3. PANTALLAS Y ENLACES DEL MENÚ =====')
    c = login_session('Administrador')
    html = c.get('/admin/panel').get_data(as_text=True)

    check('Panel admin muestra "Gestión de Calidad"', 'Gesti' in html and 'Calidad' in html)
    check('Panel admin muestra "Panel de control"', 'Panel de control' in html)
    check('Panel admin muestra "Nuevo usuario"', 'Nuevo usuario' in html)
    check('Campo "Espacio a cargo" en el modal de usuario', 'campoEspacioCargo' in html)
    check('Estados vacíos en las pantallas sin conexión', 'vacio-estado' in html)
    with open(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                           'templates', 'admin_panel.html'), encoding='utf-8') as fh:
        fuente = fh.read()
    check('Comentarios TODO en los puntos de conexión (plantilla)',
          fuente.count('TODO') >= 3, fuente.count('TODO'))
    check('Las funciones sin enlazar se conservan en panel.js',
          'cargarSolicitudes' in _panel_js() and 'cargarSemana' in _panel_js()
          and 'cargarEventos' in _panel_js())
    check('cargarPanel() sigue enlazado en el arranque',
          'var cargas = [cargarEspacios(), cargarPanel()]' in _panel_js())

    for vista in ('panel', 'mapa', 'calendario', 'eventos', 'solicitudes', 'usuarios', 'roles', 'espacios'):
        ok = ('id="%s"' % vista) in html or ('data-vista="%s"' % vista) in html
        check('Menú incluye la sección %s' % vista, ok)

    c = login_session('Docente')
    html_m = c.get('/maestro/panel').get_data(as_text=True)
    check('Panel docente -> mensaje de próximamente', 'pr' in html_m and 'ximamente' in html_m)
    check('Panel docente -> botón "Solicitar espacio"', 'Solicitar espacio' in html_m)
    check('Panel docente -> enlaza /solicitud-espacio', '/solicitud-espacio' in html_m)

    c = login_session('Estudiante', id_usuario=3)
    html_e = c.get('/estudiante/panel').get_data(as_text=True)
    check('Panel estudiante -> mensaje de próximamente', 'pr' in html_e and 'ximamente' in html_e)
    check('Panel estudiante -> SIN botón de solicitar espacio', 'Solicitar espacio' not in html_e)

    c = login_session('Administrador')
    html_r = c.get('/solicitud-espacio').get_data(as_text=True)
    check('Página en blanco /solicitud-espacio -> 200 sin formulario',
          '<form' not in html_r and 'id="solFecha"' not in html_r, html_r[:120])

    # Índice de la portada
    r = get('/')
    h = r.get_data(as_text=True)
    check('Portada: botón "Iniciar sesión" -> /login', 'href="/login"' in h)
    check('Portada: "Para administradores" -> /admin/login', 'href="/admin/login"' in h)
    check('Portada: ningún enlace a login.html suelto', 'href="login.html"' not in h and 'href="login_profes.html"' not in h)

    r = get('/login')
    hg = r.get_data(as_text=True)
    check('Login general -> enlace "Acceso administrativo"', '/admin/login' in hg)

    r = get('/admin/login')
    ha = r.get_data(as_text=True)
    check('Login admin -> enlace "¿Eres docente o estudiante?"', 'href="/login"' in ha)
    check('Login admin -> envía admin_only', 'admin_only' in ha)

    print('\n===== 4. PANEL DE CONTROL: CEROS Y ESTADOS VACÍOS =====')
    c = login_session('Administrador')
    r = c.get('/api/panel')
    d = r.get_json()
    check('/api/panel responde ok', d.get('ok'), d)
    if d.get('ok'):
        res = d['datos'].get('resumen', {})
        check('Espacios en cero', res.get('espacios') == 0, res)
        check('Eventos en cero', res.get('eventos') == 0, res)
        check('Solicitudes pendientes en cero', res.get('solicitudes_pendientes') == 0, res)
        check('Serie semanal vacía (o en cero)',
              not d['datos'].get('serie_semana') or all(p.get('eventos', 0) == 0 and p.get('solicitudes', 0) == 0
                                                        for p in d['datos']['serie_semana']),
              d['datos'].get('serie_semana'))

    print('\n===== 5. PROTECCIONES DEL ADMIN =====')
    from flask import session
    from controllers.controller import ClienteController

    with app.test_request_context('/'):
        session['id_usuario'] = 1
        session['nombre_rol'] = 'Administrador'
        r = ClienteController.actualizar(1, {'nombre': 'Administrador', 'apellido': 'ISAILO',
                                             'correo': 'admin', 'rol': 2})
        check('Admin no puede cambiar su propio rol', (not r.get('ok')) and 'rol' in (r.get('error') or ''), r)
        r2 = ClienteController.cambiar_estado(1, 'Inactivo')
        check('Admin no puede deshabilitarse a sí mismo', (not r2.get('ok')), r2)

    print('\n===== 6. CREAR USUARIOS (espec. §6) =====')
    with app.test_request_context('/'):
        session['id_usuario'] = 1
        session['nombre_rol'] = 'Administrador'

        r_doc = ClienteController.registrar({
            'nombre': 'Ana', 'apellido': 'Perez', 'correo': 'ana@colegio.edu',
            'password': 'clave1234', 'rol': '2', 'id_espacio': '5'})
        check('Alta de Docente con espacio a cargo -> ok', r_doc.get('ok'), r_doc)
        check('El espacio 5 quedó asignado al Docente creado',
              (5, r_doc.get('id')) in ASIGNACIONES, ASIGNACIONES)

        r_est = ClienteController.registrar({
            'nombre': 'Luis', 'apellido': 'Torres', 'correo': 'luis@colegio.edu',
            'password': 'clave1234', 'rol': '1'})
        check('Alta de Estudiante SIN campo de espacio -> ok', r_est.get('ok'), r_est)
        check('Al Estudiante no se le asigna ningún espacio',
              all(uid != r_est.get('id') for _, uid in ASIGNACIONES), ASIGNACIONES)

        check('Usuario nuevo creado con su rol correcto',
              CREADOS and CREADOS[0]['nombre_rol'] == 'Docente' and CREADOS[1]['nombre_rol'] == 'Estudiante',
              [u['nombre_rol'] for u in CREADOS])

    # Cada uno entra con sus credenciales y llega a su panel
    for correo, pw, rol, ruta in (
            ('ana@colegio.edu', 'clave1234', 'Docente', '/maestro/panel'),
            ('luis@colegio.edu', 'clave1234', 'Estudiante', '/estudiante/panel')):
        c = client()
        d = c.post('/api/clientes/login', json={'correo': correo, 'password': pw}).get_json()
        check('Nuevo %s inicia sesión' % rol, d.get('ok') and d.get('panel') == ruta, d)
        with c.session_transaction() as s:
            if 'id_usuario' in s:
                s['nombre_rol'] = rol
        r = c.get(ruta)
        check('Nuevo %s llega a %s' % (rol, ruta), r.status_code == 200, r.status_code)

    # El rol del panel lo decide el servidor, no el HTML
    check('La ruta del panel viene de la respuesta del servidor (clave "panel")',
          'PANEL_POR_ROL' in _leer('controllers\\controller.py'))

    print('\n===== 7. SIN DATOS DE EJEMPLO EN PANTALLAS =====')
    c = login_session('Administrador')
    texto = ''
    for ruta in ('/admin/panel', '/login', '/admin/login'):
        texto += (client().get(ruta).get_data(as_text=True) if ruta in ('/login', '/admin/login')
                  else c.get(ruta).get_data(as_text=True))
    muestras = ['Carolina R', 'Juan P', 'Izada de bandera', 'Prctica ptica', 'Laboratorio de Fisica']
    faltas = [m for m in muestras if m in texto]
    check('Sin datos de ejemplo de los mockups', not faltas, faltas)

    print('\n===== RESUMEN =====')
    ok = sum(1 for _, r, _ in RESULTADOS if r)
    fail = [n for n, r, _ in RESULTADOS if not r]
    print('TOTAL: %d | PASS: %d | FAIL: %d' % (len(RESULTADOS), ok, len(fail)))
    for n in fail:
        print('   FAIL ->', n)
    return 1 if fail else 0


if __name__ == '__main__':
    sys.exit(main())
