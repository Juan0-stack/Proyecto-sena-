import datetime

from models.cliente_model import ClienteModel
from models.espacio_model import EspacioModel
from models.evento_model import EventoModel
from models.solicitud_model import SolicitudModel


def _actividad(limite=8):
    items = []
    for s in SolicitudModel.listar_recientes(limite):
        items.append({
            'tipo': 'solicitud',
            'estado': s['estado'],
            'texto': f"{s['solicitante']} solicitó {s['espacio_nombre']}",
            'detalle': s['nombre_actividad'],
            'tiempo': s['fecha_solicitud'] or ''
        })
    for ev in EventoModel.listar_recientes(limite // 2):
        items.append({
            'tipo': 'evento',
            'estado': '',
            'texto': f"Evento publicado: {ev['nombre']}",
            'detalle': ev.get('descripcion') or '',
            'tiempo': ev.get('fecha_creacion') or ev.get('fecha_inicio') or ''
        })
    items.sort(key=lambda x: x['tiempo'], reverse=True)
    return items[:limite]


def _proximos_eventos():
    return [
        {
            'id_evento': ev['id_evento'],
            'nombre': ev['nombre'],
            'color': ev['color'],
            'fecha_inicio': ev['fecha_inicio'],
            'fecha_fin': ev.get('fecha_fin') or ''
        }
        for ev in EventoModel.listar_futuros(5)
    ]


class PanelController:

    @staticmethod
    def datos_admin():
        hoy = datetime.date.today().isoformat()
        limite_vencida = (datetime.datetime.now() - datetime.timedelta(hours=24)).strftime('%Y-%m-%dT%H:%M')

        resumen = {
            'espacios': EspacioModel.contar(),
            'espacios_disponibles': EspacioModel.contar_por_estado('Disponible'),
            'usuarios_activos': ClienteModel.contar_activos(),
            'solicitudes_pendientes': SolicitudModel.contar_por_estado('pendiente'),
            'eventos': EventoModel.contar()
        }

        pendientes_por_espacio = {}
        for s in SolicitudModel.listar_todas():
            if s['estado'] != 'pendiente':
                continue
            item = pendientes_por_espacio.get(s['id_espacio'])
            if not item:
                item = {
                    'id_espacio': s['id_espacio'],
                    'espacio_nombre': s['espacio_nombre'],
                    'espacio_tipo': s['espacio_tipo'],
                    'encargado': s.get('encargado_nombre') or '',
                    'total': 0,
                    'vencidas': 0
                }
                pendientes_por_espacio[s['id_espacio']] = item
            item['total'] += 1
            if (s['fecha_solicitud'] or '') < limite_vencida:
                item['vencidas'] += 1

        vencidas_total = sum(x['vencidas'] for x in pendientes_por_espacio.values())

        aprobadas_hoy = SolicitudModel.ocupacion(hoy, hoy)
        eventos_hoy = []
        for ev in EventoModel.listar():
            if ev['fecha_inicio'] <= hoy and (not ev.get('fecha_fin') or ev['fecha_fin'] >= hoy):
                eventos_hoy.append({
                    'id_evento': ev['id_evento'],
                    'nombre': ev['nombre'],
                    'color': ev['color']
                })

        return {
            'resumen': resumen,
            'vencidas_total': vencidas_total,
            'pendientes_por_espacio': list(pendientes_por_espacio.values()),
            'actividad': _actividad(8),
            'hoy': {
                'fecha': hoy,
                'aprobadas': aprobadas_hoy,
                'eventos': eventos_hoy
            },
            'proximos_eventos': _proximos_eventos()
        }

    @staticmethod
    def datos_docente(id_usuario):
        hoy = datetime.date.today().isoformat()
        mis_espacios = EspacioModel.listar_por_encargado(id_usuario)
        ids = {e['id_espacio'] for e in mis_espacios}

        mis_solicitudes = SolicitudModel.listar_de_usuario(id_usuario)

        pendientes = []
        feed = []
        for s in SolicitudModel.listar_todas():
            if s['id_espacio'] not in ids:
                continue
            if s['estado'] == 'pendiente':
                pendientes.append(s)
            feed.append({
                'tipo': 'solicitud',
                'estado': s['estado'],
                'texto': f"{s['solicitante']} · {s['espacio_nombre']}",
                'detalle': s['nombre_actividad'],
                'tiempo': s['fecha_solicitud'] or ''
            })

        for s in mis_solicitudes:
            feed.append({
                'tipo': 'solicitud',
                'estado': s['estado'],
                'texto': f"Tu solicitud · {s['espacio_nombre']}",
                'detalle': s['nombre_actividad'],
                'tiempo': s['fecha_solicitud'] or ''
            })

        feed.sort(key=lambda x: x['tiempo'], reverse=True)

        resumen = {
            'mis_solicitudes': len(mis_solicitudes),
            'por_autorizar': len(pendientes),
            'espacios_cargo': len(mis_espacios),
        }

        return {
            'resumen': resumen,
            'hoy': hoy,
            'mis_espacios': mis_espacios,
            'pendientes': pendientes,
            'actividad': feed[:8],
            'proximos_eventos': _proximos_eventos()
        }

    @staticmethod
    def datos_estudiante():
        proximos = EventoModel.listar_futuros(6)
        return {
            'proximo_evento': proximos[0] if proximos else None,
            'eventos': proximos
        }