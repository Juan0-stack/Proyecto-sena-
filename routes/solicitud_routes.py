from datetime import date, timedelta

from flask import Blueprint, jsonify, request, session

from controllers.solicitud_controller import SolicitudController
from models.solicitud_model import SolicitudModel
from utils.auth import login_required, role_required

solicitudes_bp = Blueprint('solicitudes', __name__)


@solicitudes_bp.route('/api/solicitudes', methods=['POST'])
@role_required('Docente', api=True)
def crear_solicitud():
    datos = request.get_json(silent=True) or {}
    return jsonify(SolicitudController.crear(datos))


@solicitudes_bp.route('/api/solicitudes', methods=['GET'])
@login_required(api=True)
def listar_solicitudes():
    if session.get('nombre_rol') == 'Estudiante':
        return jsonify({'ok': False, 'error': 'No tienes permisos para ver las solicitudes.'}), 403
    return jsonify({'ok': True, 'solicitudes': SolicitudController.listar_para_sesion()})


@solicitudes_bp.route('/api/solicitudes/<int:id_solicitud>/estado', methods=['PATCH'])
@login_required(api=True)
def cambiar_estado_solicitud(id_solicitud):
    datos = request.get_json(silent=True) or {}
    nuevo_estado = (datos.get('estado') or '').strip().lower()
    return jsonify(SolicitudController.autorizar(id_solicitud, nuevo_estado))


@solicitudes_bp.route('/api/ocupacion', methods=['GET'])
@role_required('Administrador', 'Docente', api=True)
def ocupacion_mes():
    mes = (request.args.get('mes') or '').strip()
    tipo = (request.args.get('tipo') or '').strip()
    partes = mes.split('-')
    if len(partes) != 2:
        return jsonify({'ok': False, 'error': 'Formato de mes inválido. Usa YYYY-MM.'}), 400
    try:
        anio = int(partes[0])
        num = int(partes[1])
    except ValueError:
        return jsonify({'ok': False, 'error': 'Mes inválido.'}), 400
    if anio < 2000 or anio > 2100 or num < 1 or num > 12:
        return jsonify({'ok': False, 'error': 'Mes fuera de rango.'}), 400
    desde = date(anio, num, 1)
    if num == 12:
        hasta = date(anio + 1, 1, 1) - timedelta(days=1)
    else:
        hasta = date(anio, num + 1, 1) - timedelta(days=1)
    filas = SolicitudModel.ocupacion(desde, hasta, tipo=tipo or None)
    return jsonify({'ok': True, 'ocupacion': filas})
