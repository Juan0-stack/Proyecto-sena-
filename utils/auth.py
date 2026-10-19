from functools import wraps

from flask import jsonify, redirect, session


def _respuesta_sin_sesion(api):
    if api:
        return jsonify({'ok': False, 'error': 'Debes iniciar sesión.'}), 401
    # Para rutas que esperan acceso administrativo, ir al login de administrador
    return redirect('/login')


def _respuesta_sin_rol(api):
    if api:
        return jsonify({'ok': False, 'error': 'No tienes permisos para esta acción.'}), 403
    rol = session.get('nombre_rol')
    if rol == 'Administrador':
        return redirect('/admin/panel')
    if rol == 'Gestión de Calidad':
        return redirect('/calidad/panel')
    if rol == 'Docente':
        return redirect('/maestro/panel')
    if rol == 'Estudiante':
        return redirect('/estudiante/panel')
    return redirect('/login')


def login_required(api=False):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if not session.get('id_usuario'):
                return _respuesta_sin_sesion(api)
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def role_required(*roles, **opciones):
    api = opciones.get('api', False)

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if not session.get('id_usuario'):
                return _respuesta_sin_sesion(api)
            if session.get('nombre_rol') not in roles:
                return _respuesta_sin_rol(api)
            return fn(*args, **kwargs)
        return wrapper
    return decorator
