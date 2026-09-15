from flask import session

from models.cliente_model import ClienteModel

PANEL_POR_ROL = {
    'Administrador': '/admin/panel',
    'Docente': '/maestro/panel',
    'Estudiante': '/estudiante/panel'
}


class ClienteController:

    @staticmethod
    def _validar_base(nombre, apellido, correo):
        nombre = (nombre or '').strip()
        apellido = (apellido or '').strip()
        correo = (correo or '').strip()

        if not nombre:
            return None, None, None, 'El nombre es obligatorio.'
        if not correo or ' ' in correo or len(correo) < 3:
            return None, None, None, 'Ingresa un usuario o correo válido.'

        return nombre, apellido, correo, None

    @staticmethod
    def _rol_desde_datos(datos):
        try:
            id_rol = int(datos.get('rol') or datos.get('id_rol') or 1)
        except (TypeError, ValueError):
            id_rol = 1
        if id_rol not in (1, 2, 3):
            id_rol = 1
        return id_rol

    @staticmethod
    def registrar(datos):
        nombre, apellido, correo, error = ClienteController._validar_base(
            datos.get('nombre'), datos.get('apellido'), datos.get('correo')
        )
        if error:
            return {'ok': False, 'error': error}

        password = (datos.get('password') or '').strip()
        if len(password) < 4:
            return {'ok': False, 'error': 'La contraseña debe tener al menos 4 caracteres.'}

        id_rol = ClienteController._rol_desde_datos(datos)

        if ClienteModel.buscar_por_correo(correo):
            return {'ok': False, 'error': 'Ya existe una cuenta con ese usuario o correo.'}

        nuevo_id = ClienteModel.crear(nombre, apellido, correo, password, id_rol)
        if not nuevo_id:
            return {'ok': False, 'error': 'No se pudo crear el usuario. Verifica la conexión a la base de datos.'}

        return {'ok': True, 'id': nuevo_id}

    @staticmethod
    def actualizar(id_usuario, datos):
        nombre, apellido, correo, error = ClienteController._validar_base(
            datos.get('nombre'), datos.get('apellido'), datos.get('correo')
        )
        if error:
            return {'ok': False, 'error': error}

        password = (datos.get('password') or '').strip()
        if password and len(password) < 4:
            return {'ok': False, 'error': 'La contraseña debe tener al menos 4 caracteres.'}

        id_rol = ClienteController._rol_desde_datos(datos)
        id_usuario = int(id_usuario)

        existente = ClienteModel.buscar_por_correo(correo)
        if existente and existente['id_usuario'] != id_usuario:
            return {'ok': False, 'error': 'Ya existe una cuenta con ese usuario o correo.'}

        if id_usuario == session.get('id_usuario') and id_rol != 3:
            return {'ok': False, 'error': 'No puedes quitarte tu propio rol de administrador.'}

        if not ClienteModel.buscar_por_id(id_usuario):
            return {'ok': False, 'error': 'El usuario no existe.'}

        if not ClienteModel.actualizar(id_usuario, nombre, apellido, correo, id_rol, password or None):
            return {'ok': False, 'error': 'No se pudo actualizar el usuario.'}

        return {'ok': True}

    @staticmethod
    def cambiar_estado(id_usuario, estado):
        if estado not in ('Activo', 'Inactivo'):
            return {'ok': False, 'error': 'Estado inválido.'}
        if int(id_usuario) == session.get('id_usuario') and estado == 'Inactivo':
            return {'ok': False, 'error': 'No puedes deshabilitar tu propia cuenta.'}
        if not ClienteModel.cambiar_estado(int(id_usuario), estado):
            return {'ok': False, 'error': 'No se pudo cambiar el estado del usuario.'}
        return {'ok': True}

    @staticmethod
    def iniciar_sesion(datos):
        correo = (datos.get('correo') or datos.get('user') or '').strip()
        password = (datos.get('password') or datos.get('pass') or '').strip()

        if not correo or not password:
            return {'ok': False, 'error': 'Ingresa tu usuario y contraseña.'}

        usuario = ClienteModel.verificar_credenciales(correo, password)
        if not usuario:
            return {'ok': False, 'error': 'Credenciales incorrectas. Intenta nuevamente.'}

        if usuario.get('estado') != 'Activo':
            return {'ok': False, 'error': 'Tu cuenta está deshabilitada. Contacta al administrador.'}

        nombre_completo = f"{usuario['nombre']} {usuario.get('apellido') or ''}".strip()

        session.clear()
        session['id_usuario'] = usuario['id_usuario']
        session['nombre'] = nombre_completo
        session['correo'] = usuario['correo']
        session['id_rol'] = usuario.get('id_rol')
        session['nombre_rol'] = usuario.get('nombre_rol')

        ClienteModel.actualizar_acceso(usuario['id_usuario'])

        rol = usuario.get('nombre_rol')
        return {
            'ok': True,
            'cliente': {
                'id': usuario['id_usuario'],
                'nombre': nombre_completo,
                'correo': usuario['correo'],
                'rol': rol
            },
            'panel': PANEL_POR_ROL.get(rol, '/estudiante/panel')
        }

    @staticmethod
    def cerrar_sesion():
        session.clear()
