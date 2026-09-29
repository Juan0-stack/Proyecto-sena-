from functools import wraps

from flask import jsonify, redirect, session


def _respuesta_sin_sesion(api):
    if api:
        return jsonify({'ok': False, 'error': 'Debes iniciar sesión.'}), 401
    return redirect('/login')


def _respuesta_sin_rol(api):
    if api:
        return jsonify({'ok': False, 'error': 'No tienes permisos para esta acción.'}), 403
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
