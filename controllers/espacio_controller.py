from models.cliente_model import ClienteModel
from models.espacio_model import EspacioModel
from models.solicitud_model import SolicitudModel

ESTADOS_VALIDOS = ('Disponible', 'Ocupado', 'Mantenimiento')


class EspacioController:

    @staticmethod
    def _procesar(datos, incluir_estado=True):
        nombre = (datos.get('nombre') or '').strip()[:100]
        tipo = (datos.get('tipo') or '').strip()[:50]
        descripcion = (datos.get('descripcion') or '').strip()[:255]

        if not nombre:
            return None, 'El nombre del espacio es obligatorio.'

        try:
            capacidad = int(datos.get('capacidad')) if datos.get('capacidad') not in (None, '') else None
        except (TypeError, ValueError):
            return None, 'La capacidad debe ser un número.'

        destacado = str(datos.get('destacado')).lower() in ('1', 'true', 'on', 'si', 'sí')

        encargado = datos.get('id_usuario_encargado')
        if encargado in (None, ''):
            encargado = None
        else:
            try:
                encargado = int(encargado)
            except (TypeError, ValueError):
                return None, 'Encargado inválido.'
            docente = ClienteModel.buscar_por_id(encargado)
            if not docente or docente.get('nombre_rol') != 'Docente':
                return None, 'El encargado debe ser un usuario con rol Docente.'
            if docente.get('estado') != 'Activo':
                return None, 'El docente seleccionado está inactivo.'

        estado = None
        if incluir_estado:
            estado = (datos.get('estado') or 'Disponible').strip()
            if estado not in ESTADOS_VALIDOS:
                return None, 'Estado del espacio inválido.'

        valores = {
            'nombre': nombre,
            'tipo': tipo,
            'descripcion': descripcion,
            'capacidad': capacidad,
            'destacado': destacado,
            'id_usuario_encargado': encargado,
        }
        if incluir_estado:
            valores['estado'] = estado
        return valores, None

    @staticmethod
    def crear(datos):
        valores, error = EspacioController._procesar(datos)
        if error:
            return {'ok': False, 'error': error}

        nuevo_id = EspacioModel.crear(
            valores['nombre'], valores['tipo'], valores['descripcion'],
            valores['capacidad'], valores['destacado'], valores['id_usuario_encargado']
        )
        if not nuevo_id:
            return {'ok': False, 'error': 'No se pudo crear el espacio.'}
        return {'ok': True, 'id': nuevo_id}

    @staticmethod
    def actualizar(id_espacio, datos):
        valores, error = EspacioController._procesar(datos)
        if error:
            return {'ok': False, 'error': error}

        if not EspacioModel.obtener(id_espacio):
            return {'ok': False, 'error': 'El espacio no existe.'}

        if not EspacioModel.actualizar(
            id_espacio, valores['nombre'], valores['tipo'], valores['descripcion'],
            valores['capacidad'], valores['estado'], valores['destacado'],
            valores['id_usuario_encargado']
        ):
            return {'ok': False, 'error': 'No se pudo actualizar el espacio.'}
        return {'ok': True}

    @staticmethod
    def eliminar(id_espacio):
        espacio = EspacioModel.obtener(id_espacio)
        if not espacio:
            return {'ok': False, 'error': 'El espacio no existe.'}

        if SolicitudModel.contar_por_espacio(id_espacio) > 0:
            return {
                'ok': False,
                'error': 'El espacio tiene solicitudes asociadas y no puede eliminarse. '
                         'Puedes marcarlo en Mantenimiento o Inactivo en su lugar.'
            }

        if not EspacioModel.eliminar(id_espacio):
            return {'ok': False, 'error': 'No se pudo eliminar el espacio.'}
        return {'ok': True}
