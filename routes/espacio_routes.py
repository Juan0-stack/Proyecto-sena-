import datetime

from flask import Blueprint, jsonify, request

from controllers.controller import actualizar_espacio, crear_espacio, eliminar_espacio
from models.espacio_model import EspacioModel
from models.solicitud_model import SolicitudModel
from utils.auth import login_required, role_required

espacios_bp = Blueprint('espacios', __name__)


@espacios_bp.route('/api/espacios', methods=['GET'])
@login_required(api=True)
def listar_espacios():
    return jsonify({'ok': True, 'espacios': EspacioModel.listar()})


@espacios_bp.route('/api/espacios', methods=['POST'])
@role_required('Administrador', api=True)
def crear_espacio():
    datos = request.get_json(silent=True) or {}
    return jsonify(crear_espacio(datos))


@espacios_bp.route('/api/espacios/<int:id_espacio>', methods=['PUT'])
@role_required('Administrador', api=True)
def actualizar_espacio(id_espacio):
    datos = request.get_json(silent=True) or {}
    return jsonify(actualizar_espacio(id_espacio, datos))


@espacios_bp.route('/api/espacios/<int:id_espacio>', methods=['DELETE'])
@role_required('Administrador', api=True)
def eliminar_espacio(id_espacio):
    return jsonify(eliminar_espacio(id_espacio))


@espacios_bp.route('/api/espacios/<int:id_espacio>/ocupacion', methods=['GET'])
@login_required(api=True)
def ocupacion_espacio(id_espacio):
    desde = (request.args.get('desde') or '').strip()
    hasta = (request.args.get('hasta') or '').strip()
    try:
        fecha_desde = datetime.datetime.strptime(desde, '%Y-%m-%d').date()
        fecha_hasta = datetime.datetime.strptime(hasta, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'ok': False, 'error': 'Rango de fechas inválido.'}), 400
    if fecha_hasta < fecha_desde:
        return jsonify({'ok': False, 'error': 'El rango de fechas es inválido.'}), 400
    bloques = SolicitudModel.ocupacion(desde, hasta, id_espacio=id_espacio)
    return jsonify({'ok': True, 'bloques': bloques})
