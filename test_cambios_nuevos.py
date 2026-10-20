# -*- coding: utf-8 -*-
"""
Pruebas de los "Cambios nuevos de ISAILO MAPS" (documento con 6 cambios).

Capa de modelos en memoria (no hay MySQL en esta máquina).
Uso:  python test_cambios_nuevos.py

Cubre, por ahora:
  - Punto 4: Administrador vs. Gestión de Calidad (dos roles, dos homes).
"""
import os
import sys

from werkzeug.security import generate_password_hash

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import app as app_module  # noqa: E402
from models.cliente_model import ClienteModel  # noqa: E402
from models.espacio_model import EspacioModel  # noqa: E402
from models.solicitud_model import SolicitudModel  # noqa: E402
from models.evento_model import EventoModel  # noqa: E402

app = app_module.app
app.config['TESTING'] = True
app.config['SECRET_KEY'] = 'test'

HASH_ADMIN = generate_password_hash('isailo2026', method='pbkdf2:sha256')
HASH_CAL = generate_password_hash('calidad123', method='pbkdf2:sha256')
HASH_DOC = generate_password_hash('docente123', method='pbkdf2:sha256')
HASH_EST = generate_password_hash('estudiante123', method='pbkdf2:sha256')

USUARIOS = [
    {'id_usuario': 1, 'nombre': 'Administrador', 'apellido': 'ISAILO', 'correo': 'admin',
     'password_hash': HASH_ADMIN, 'estado': 'Activo', 'id_rol': 3, 'nombre_rol': 'Administrador'},
    {'id_usuario': 2, 'nombre': 'Carolina', 'apellido': 'Rios', 'correo': 'carolina@colegio.edu',
     'password: 'docente123', 'estado': 'Activo', 'id_rol': 2, 'nombre_rol': 'Docente'},
    {'id_usuario': 3, 'nombre': 'Pedro', 'apellido': 'Gomez', 'correo': 'pedro@colegio.edu',
     'password_hash': HASH_EST, 'estado': 'Activo', 'id_rol': 1, 'nombre_rol': 'Estudiante'},
    {'id_usuario': 4, 'nombre': 'Sofia', 'apellido': 'Mora', 'correo': 'sofia@colegio.edu',
     'password_hash': HASH_EST, 'estado': 'Activo', 'id_rol': 1, 'nombre_rol': 'Estudiante'},
    {'id_usuario': 5, 'nombre': 'Calidad', 'apellido': 'ISAILO', 'correo': 'calidad@isailo.edu',
     'password_hash': HASH_CAL, 'estado': 'Activo', 'id_rol': 4, 'nombre_rol': 'Gestión de Calidad'},
]
by_correo = {u['correo']: u for u in USUARIOS}

NOMBRE_ROL = {1: 'Estudiante', 2: 'Docente', 3: 'Administrador', 4: 'Gestión de Calidad'}


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
    {'id_rol': r, 'nombre_rol': NOMBRE_ROL[r]} for r in (1, 2, 3, 4)])
ClienteModel.listar_docentes = staticmethod(lambda: [{'id_usuario': 2, 'nombre': 'Carolina', 'apellido': 'Rios'}])
ClienteModel.contar_activos = staticmethod(lambda: sum(1 for u in USUARIOS if u['estado'] == 'Activo'))
ClienteModel.cambiar_estado = staticmethod(lambda uid, estado: True)
ClienteModel.actualizar = staticmethod(lambda *a, **k: True)

CREADOS = []
ELIMINADOS = []
ASIGNACIONES = []


def _crear(nombre, apellido, correo, password, id_rol):
    nuevo = {'id_usuario': 100 + len(CREADOS), 'nombre': nombre, 'apellido': apellido,
             'correo': correo, 'password_hash': generate_password_hash(password),
             'estado': 'Activo', 'id_rol': int(id_rol), 'nombre_rol': NOMBRE_ROL[int(id_rol)]}
    CREADOS.append(nuevo)
    by_correo[correo] = nuevo
    return nuevo['id_usuario']


def _eliminar(uid):
    ELIMINADOS.append(int(uid))
    return True


ClienteModel.crear = staticmethod(_crear)
ClienteModel.eliminar = staticmethod(_eliminar)
EspacioModel.asignar_encargado = staticmethod(
    lambda id_espacio, id_usuario: ASIGNACIONES.append((int(id_espacio), id_usuario)) or True)

# Base de datos "recién creada": todo en cero.
EspacioModel.listar = staticmethod(lambda: [])
EspacioModel.listar_por_encargado = staticmethod(lambda uid: [])
EspacioModel.contar = staticmethod(lambda: 0)
EspacioModel.contar_por_estado = staticmethod(lambda e: 0)
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


def login_session(nombre_rol, id_usuario=2, nombre='Usuario Prueba'):
    c = client()
    with c.session_transaction() as s:
        s['id_usuario'] = id_usuario
        s['nombre'] = nombre
        s['correo'] = 'x@y.z'
        s['id_rol'] = {'Administrador': 3, 'Gestión de Calidad': 4, 'Docente': 2, 'Estudiante': 1}[nombre_rol]
        s['nombre_rol'] = nombre_rol
    return c


def main():
    print('\n===== PUNTO 4: ADMINISTRADOR vs. GESTIÓN DE CALIDAD =====')

    # --- Dos roles, dos homes ---
    r = client().post('/api/clientes/login', json={'correo': 'admin', 'password': 'isailo2026', 'admin_only': True})
    d = r.get_json()
    check('Admin entra por login administrativo -> /admin/panel',
          d.get('ok') and d.get('panel') == '/admin/panel', d)

    r = client().post('/api/clientes/login', json={'correo': 'calidad@isailo.edu', 'password': 'calidad123', 'admin_only': True})
    d = r.get_json()
    check('Gestión de Calidad entra por login administrativo -> /calidad/panel',
          d.get('ok') and d.get('panel') == '/calidad/panel', d)

    c = login_session('Gestión de Calidad', id_usuario=5, nombre='Calidad')
    r = c.get('/calidad/panel')
    check('Calidad entra a /calidad/panel -> 200', r.status_code == 200, r.status_code)

    c = login_session('Administrador', id_usuario=1)
    r = c.get('/calidad/panel')
    check('Administrador no entra a /calidad/panel -> redirige a /admin/panel',
          r.status_code == 302 and r.headers.get('Location') == '/admin/panel',
          '%s %s' % (r.status_code, r.headers.get('Location')))

    c = login_session('Docente')
    r = c.get('/calidad/panel')
    check('Docente no entra a /calidad/panel -> redirige a /maestro/panel',
          r.status_code == 302 and r.headers.get('Location') == '/maestro/panel',
          '%s %s' % (r.status_code, r.headers.get('Location')))

    # --- El home de Calidad no tiene lo exclusivo del Administrador ---
    c = login_session('Gestión de Calidad', id_usuario=5, nombre='Calidad')
    html_cal = c.get('/calidad/panel').get_data(as_text=True)
    check('Panel Calidad -> data-rol="Gestión de Calidad"', 'data-rol="Gestión de Calidad"' in html_cal)
    check('Panel Calidad SIN sección "Gestión roles" (id="roles")', 'id="roles"' not in html_cal)
    check('Panel Calidad conserva "Gestión maestros"', 'Gestión maestros' in html_cal)
    check('Panel Calidad conserva "Editar eventos"', 'Editar eventos' in html_cal)
    check('Panel Calidad conserva "Verificar solicitudes"', 'Verificar solicitudes' in html_cal)
    check('Panel Calidad conserva "Propiedades espacio"', 'Propiedades espacio' in html_cal)

    c = login_session('Administrador', id_usuario=1)
    html_admin = c.get('/admin/panel').get_data(as_text=True)
    check('Panel Admin -> data-rol="Administrador"', 'data-rol="Administrador"' in html_admin)
    check('Panel Admin SÍ tiene sección "Gestión roles" (id="roles")', 'id="roles"' in html_admin)
    check('Panel Admin muestra "Gestión de Calidad" (filtro/rol)', 'Gestión de Calidad' in html_admin
          or ('Gesti' in html_admin and 'Calidad' in html_admin))

    # --- Permisos de backend: crear usuarios ---
    c = login_session('Gestión de Calidad', id_usuario=5, nombre='Calidad')
    d = c.post('/api/clientes/registrar', json={'nombre': 'Nuevo', 'correo': 'nuevo.doc@x.co',
                                                'password': 'abcd', 'rol': 2}).get_json()
    check('Calidad SÍ puede crear Docente', d.get('ok') is True, d)

    d = c.post('/api/clientes/registrar', json={'nombre': 'Nuevo', 'correo': 'nuevo.est@x.co',
                                                'password': 'abcd', 'rol': 1}).get_json()
    check('Calidad SÍ puede crear Estudiante', d.get('ok') is True, d)

    d = c.post('/api/clientes/registrar', json={'nombre': 'Nuevo', 'correo': 'nuevo.adm@x.co',
                                                'password': 'abcd', 'rol': 3}).get_json()
    check('Calidad NO puede crear Administrador', (not d.get('ok')) and 'permiso' in (d.get('error') or ''), d)

    d = c.post('/api/clientes/registrar', json={'nombre': 'Nuevo', 'correo': 'nuevo.cal@x.co',
                                                'password': 'abcd', 'rol': 4}).get_json()
    check('Calidad NO puede crear Gestión de Calidad', (not d.get('ok')) and 'permiso' in (d.get('error') or ''), d)

    # --- Permisos de backend: tocar cuentas administrativas ---
    d = c.put('/api/clientes/1', json={'nombre': 'Hack', 'correo': 'admin', 'rol': 3}).get_json()
    check('Calidad NO puede editar cuenta de Administrador',
          (not d.get('ok')) and 'permiso' in (d.get('error') or ''), d)

    d = c.put('/api/clientes/5', json={'nombre': 'Calidad', 'correo': 'calidad@isailo.edu', 'rol': 4}).get_json()
    check('Calidad NO puede editar cuentas administrativas (incluida la propia)',
          (not d.get('ok')) and 'permiso' in (d.get('error') or ''), d)

    d = c.put('/api/clientes/2', json={'nombre': 'Carolina', 'correo': 'carolina@colegio.edu', 'rol': 2}).get_json()
    check('Calidad SÍ puede editar Docente', d.get('ok') is True, d)

    d = c.put('/api/clientes/2', json={'nombre': 'Carolina', 'correo': 'carolina@colegio.edu', 'rol': 3}).get_json()
    check('Calidad NO puede ascender a nadie a Administrador',
          (not d.get('ok')) and 'permiso' in (d.get('error') or ''), d)

    d = c.patch('/api/clientes/1/estado', json={'estado': 'Inactivo'}).get_json()
    check('Calidad NO puede deshabilitar Administrador',
          (not d.get('ok')) and 'permiso' in (d.get('error') or ''), d)

    d = c.patch('/api/clientes/3/estado', json={'estado': 'Inactivo'}).get_json()
    check('Calidad SÍ puede deshabilitar Estudiante', d.get('ok') is True, d)

    # --- Eliminar usuarios: solo Administrador ---
    r = c.delete('/api/clientes/4')
    check('Calidad NO puede eliminar usuarios -> 403', r.status_code == 403, r.status_code)

    c_admin = login_session('Administrador', id_usuario=1)
    r = c_admin.delete('/api/clientes/4')
    check('Administrador SÍ puede eliminar usuarios -> ok',
          r.status_code == 200 and r.get_json().get('ok') is True, r.get_json())

    # --- Gestión roles: solo Administrador ---
    r = c.get('/api/roles')
    check('Calidad NO puede ver /api/roles -> 403', r.status_code == 403, r.status_code)
    r = c_admin.get('/api/roles')
    check('Administrador SÍ puede ver /api/roles -> 200', r.status_code == 200, r.status_code)

    # --- Endpoints compartidos (Calidad SÍ) ---
    for metodo, ruta, cuerpo in (
        ('post', '/api/espacios', {'nombre': 'Aula X'}),
        ('put', '/api/espacios/1', {'nombre': 'Aula X'}),
        ('post', '/api/eventos', {'nombre': 'Evento X'}),
        ('put', '/api/eventos/1', {'nombre': 'Evento X'}),
    ):
        resp = getattr(c, metodo)(ruta, json=cuerpo)
        check('Calidad puede usar %s %s (no 403)' % (metodo.upper(), ruta), resp.status_code != 403, resp.status_code)

    # --- Endpoints exclusivos del Administrador (Calidad -> 403) ---
    r = c.delete('/api/espacios/1')
    check('Calidad NO puede eliminar espacios -> 403', r.status_code == 403, r.status_code)

    r = c.get('/admin/panel')
    check('Calidad no entra a /admin/panel -> redirige a /calidad/panel',
          r.status_code == 302 and r.headers.get('Location') == '/calidad/panel',
          '%s %s' % (r.status_code, r.headers.get('Location')))

    # --- Docente/Estudiante no pueden administrar usuarios ---
    for rol in ('Docente', 'Estudiante'):
        c2 = login_session(rol, id_usuario=2 if rol == 'Docente' else 3)
        r = c2.get('/api/clientes')
        check('%s NO puede listar usuarios -> 403' % rol, r.status_code == 403, r.status_code)

    # --- /api/panel de Calidad responde como el panel de gestión ---
    r = c.get('/api/panel')
    d = r.get_json()
    check('Calidad /api/panel responde ok', r.status_code == 200 and d.get('ok') is True, d)

    print('\n===== RESUMEN =====')
    total = len(RESULTADOS)
    fallos = [n for n, ok, _ in RESULTADOS if not ok]
    print('TOTAL: %d | PASS: %d | FAIL: %d' % (total, total - len(fallos), len(fallos)))
    return 0 if not fallos else 1


if __name__ == '__main__':
    sys.exit(main())
