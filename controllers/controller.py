import datetime
import re
from flask import session
from models.cliente_model import ClienteModel
from models.espacio_model import EspacioModel
from models.evento_model import EventoModel
from models.solicitud_model import SolicitudModel

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
            return {'ok': False, 'error': 'No tienes permiso para gestionar esta solicitud.'}

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
