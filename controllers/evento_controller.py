import re

from models.evento_model import EventoModel

COLOR_RE = re.compile(r'^#[0-9A-Fa-f]{6}$')


class EventoController:

    @staticmethod
    def _procesar(datos):
        nombre = (datos.get('nombre') or '').strip()[:100]
        descripcion = (datos.get('descripcion') or '').strip()[:255]
        fecha_inicio = (datos.get('fecha_inicio') or '').strip()
        fecha_fin = (datos.get('fecha_fin') or '').strip() or None
        color = (datos.get('color') or '#8B1E1E').strip()

        if not nombre:
            return None, 'El nombre del evento es obligatorio.'
        if len(fecha_inicio) != 10:
            return None, 'Ingresa la fecha de inicio del evento.'
        if fecha_fin and fecha_fin < fecha_inicio:
            return None, 'La fecha de fin no puede ser anterior a la de inicio.'
        if not COLOR_RE.match(color):
            color = '#8B1E1E'

        return {
            'nombre': nombre,
            'descripcion': descripcion,
            'fecha_inicio': fecha_inicio,
            'fecha_fin': fecha_fin,
            'color': color
        }, None

    @staticmethod
    def crear(datos, id_usuario):
        valores, error = EventoController._procesar(datos)
        if error:
            return {'ok': False, 'error': error}

        nuevo_id = EventoModel.crear(
            valores['nombre'], valores['descripcion'], valores['fecha_inicio'],
            valores['fecha_fin'], valores['color'], id_usuario
        )
        if not nuevo_id:
            return {'ok': False, 'error': 'No se pudo crear el evento.'}
        return {'ok': True, 'id': nuevo_id}

    @staticmethod
    def actualizar(id_evento, datos):
        valores, error = EventoController._procesar(datos)
        if error:
            return {'ok': False, 'error': error}

        if not EventoModel.obtener(id_evento):
            return {'ok': False, 'error': 'El evento no existe.'}

        if not EventoModel.actualizar(
            id_evento, valores['nombre'], valores['descripcion'],
            valores['fecha_inicio'], valores['fecha_fin'], valores['color']
        ):
            return {'ok': False, 'error': 'No se pudo actualizar el evento.'}
        return {'ok': True}

    @staticmethod
    def eliminar(id_evento):
        if not EventoModel.obtener(id_evento):
            return {'ok': False, 'error': 'El evento no existe.'}
        if not EventoModel.eliminar(id_evento):
            return {'ok': False, 'error': 'No se pudo eliminar el evento.'}
        return {'ok': True}
