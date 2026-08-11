from models.cliente_model import ClienteModel


class ClienteController:

    @staticmethod
    def registrar(datos):
        nombre = (datos.get('nombre') or '').strip()
        apellido = (datos.get('apellido') or '').strip()
        correo = (datos.get('correo') or '').strip()
        password = (datos.get('password') or '').strip()

        try:
            id_rol = int(datos.get('rol') or datos.get('id_rol') or 1)
        except (TypeError, ValueError):
            id_rol = 1
        if id_rol not in (1, 2, 3):
            id_rol = 1

        if not nombre:
            return {'ok': False, 'error': 'El nombre es obligatorio.'}
        if '@' not in correo:
            return {'ok': False, 'error': 'Ingresa un correo electrónico válido.'}
        if len(password) < 4:
            return {'ok': False, 'error': 'La contraseña debe tener al menos 4 caracteres.'}

        if ClienteModel.buscar_por_correo(correo):
            return {'ok': False, 'error': 'Ya existe una cuenta con ese correo.'}

        nuevo_id = ClienteModel.crear(nombre, apellido, correo, password, id_rol)
        if not nuevo_id:
            return {'ok': False, 'error': 'No se pudo registrar. Verifica la conexión a la base de datos.'}

        return {'ok': True, 'id': nuevo_id}

    @staticmethod
    def iniciar_sesion(datos):
        correo = (datos.get('correo') or datos.get('user') or '').strip()
        password = (datos.get('password') or datos.get('pass') or '').strip()

        if not correo or not password:
            return {'ok': False, 'error': 'Ingresa tu correo y contraseña.'}

        usuario = ClienteModel.verificar_credenciales(correo, password)
        if not usuario:
            return {'ok': False, 'error': 'Credenciales incorrectas. Intenta nuevamente.'}

        return {
            'ok': True,
            'cliente': {
                'id': usuario['id_usuario'],
                'nombre': usuario['nombre'],
                'correo': usuario['correo'],
                'rol': usuario.get('nombre_rol')
            }
        }
