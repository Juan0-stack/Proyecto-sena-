import datetime

from flask import session

from models.espacio_model import EspacioModel
from models.solicitud_model import SolicitudModel


class SolicitudController:

    @staticmethod
    def _validar(datos):
        fecha_uso = (datos.get('fecha_uso') or '').strip()
        hora_inicio = (datos.get('hora_inicio') or '').strip()
        hora_fin = (datos.get('hora_fin') or '').strip()
        nombre_actividad = (datos.get('nombre_actividad') or '').strip()[:100]
        descripcion = (datos.get('descripcion') or '').strip()[:255]

        try:
            datetime.datetime.strptime(fecha_uso, '%Y-%m-%d')
        except ValueError:
            return None, None, None, None, None, 'Ingresa una fecha válida.'

        if len(hora_inicio) != 5 or ':' not in hora_inicio:
            return None, None, None, None, None, 'Ingresa la hora de inicio.'
        if len(hora_fin) != 5 or ':' not in hora_fin:
            return None, None, None, None, None, 'Ingresa la hora de fin.'
        if hora_inicio >= hora_fin:
            return None, None, None, None, None, 'La hora de fin debe ser posterior a la de inicio.'
        if not nombre_actividad:
            return None, None, None, None, None, 'Indica el nombre de la actividad.'

        return fecha_uso, hora_inicio, hora_fin, nombre_actividad, descripcion, None

    @staticmethod
    def _se_cruza(bloques, hora_inicio, hora_fin, excluir_id=None):
        for bloque in bloques:
            if excluir_id and bloque['id_solicitud'] == excluir_id:
                continue
            if bloque['hora_inicio'] < hora_fin and bloque['hora_fin'] > hora_inicio:
                return bloque
        return None

    @staticmethod
    def crear(datos):
        fecha_uso, hora_inicio, hora_fin, nombre_actividad, descripcion, error = \
            SolicitudController._validar(datos)

        if error:
            return {'ok': False, 'error': error}

        try:
            id_espacio = int(datos.get('id_espacio'))
        except (TypeError, ValueError):
            return {'ok': False, 'error': 'Selecciona un espacio válido.'}

        espacio = EspacioModel.obtener(id_espacio)
        if not espacio:
            return {'ok': False, 'error': 'El espacio no existe.'}
        if espacio['estado'] == 'Mantenimiento':
            return {'ok': False, 'error': 'El espacio está en mantenimiento y no acepta solicitudes.'}

        bloque = SolicitudController._se_cruza(
            SolicitudModel.ocupacion(fecha_uso, fecha_uso, id_espacio=id_espacio),
            hora_inicio,
            hora_fin
        )
        if bloque:
            return {
                'ok': False,
                'disponible': False,
                'error': (
                    f"Fecha no disponible: ya hay una actividad aprobada ese día "
                    f"({bloque['nombre_actividad']}, {bloque['hora_inicio']}–{bloque['hora_fin']})."
                )
            }

        nuevo_id = SolicitudModel.crear(
            session.get('id_usuario'),
            id_espacio,
            fecha_uso,
            hora_inicio,
            hora_fin,
            nombre_actividad,
            descripcion
        )
        if not nuevo_id:
            return {'ok': False, 'error': 'No se pudo registrar la solicitud.'}

        return {'ok': True, 'id': nuevo_id}

    @staticmethod
    def listar_para_sesion():
        rol = session.get('nombre_rol')
        id_usuario = session.get('id_usuario')

        if rol == 'Administrador':
            solicitudes = SolicitudModel.listar_todas()
            for s in solicitudes:
                s['origen'] = 'general'
                s['puede_autorizar'] = True
            return solicitudes

        if rol == 'Docente':
            propias = SolicitudModel.listar_de_usuario(id_usuario)
            mis_espacios_ids = {
                e['id_espacio']: e['nombre']
                for e in EspacioModel.listar_por_encargado(id_usuario)
            }
            resultado = []
            vistas = set()
            for s in propias:
                s['puede_autorizar'] = s['id_espacio'] in mis_espacios_ids
                resultado.append(s)
                vistas.add(s['id_solicitud'])
            for id_espacio in mis_espacios_ids:
                for s in SolicitudModel.listar_por_espacio(id_espacio):
                    if s['id_solicitud'] in vistas:
                        continue
                    s['origen'] = 'mi_espacio'
                    s['puede_autorizar'] = s['estado'] == 'pendiente'
                    resultado.append(s)
                    vistas.add(s['id_solicitud'])
            resultado.sort(key=lambda x: x['fecha_solicitud'], reverse=True)
            return resultado

        return []

    @staticmethod
    def autorizar(id_solicitud, nuevo_estado):
        if nuevo_estado not in ('aprobada', 'rechazada'):
            return {'ok': False, 'error': 'Estado inválido.'}

        solicitud = SolicitudModel.obtener(id_solicitud)
        if not solicitud:
            return {'ok': False, 'error': 'La solicitud no existe.'}
        if solicitud['estado'] != 'pendiente':
            return {'ok': False, 'error': 'Esta solicitud ya fue revisada.'}

        rol = session.get('nombre_rol')
        id_usuario = session.get('id_usuario')
        es_admin = rol == 'Administrador'
        es_encargado = (
            rol == 'Docente'
            and solicitud.get('id_usuario_encargado') == id_usuario
        )

        if not (es_admin or es_encargado):
            return {'ok': False, 'error': 'No tienes permisos para autorizar esta solicitud.'}

        if nuevo_estado == 'aprobada':
            bloque = SolicitudController._se_cruza(
                SolicitudModel.ocupacion(
                    solicitud['fecha_uso'],
                    solicitud['fecha_uso'],
                    id_espacio=solicitud['id_espacio']
                ),
                solicitud['hora_inicio'],
                solicitud['hora_fin'],
                excluir_id=id_solicitud
            )
            if bloque:
                return {
                    'ok': False,
                    'error': (
                        "No se puede aprobar: se cruza con otra actividad aprobada "
                        f"({bloque['nombre_actividad']}, "
                        f"{bloque['hora_inicio']}–{bloque['hora_fin']})."
                    )
                }

        if not SolicitudModel.cambiar_estado(id_solicitud, nuevo_estado):
            return {'ok': False, 'error': 'No se pudo actualizar la solicitud.'}

        return {'ok': True}
