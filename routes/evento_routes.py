from flask import Blueprint, jsonify, request, session

from controllers.controller import actualizar_evento, crear_evento, eliminar_evento
from utils.auth import login_required, role_required

eventos_bp = Blueprint('eventos', __name__)


@eventos_bp.route('/api/eventos', methods=['GET'])
@login_required(api=True)
def listar_eventos():
    from models.evento_model import EventoModel
    return jsonify({'ok': True, 'eventos': EventoModel.listar()})


@eventos_bp.route('/api/eventos', methods=['POST'])
@role_required('Administrador', api=True)
def crear_evento():
    datos = request.get_json(silent=True) or {}
    return jsonify(crear_evento(datos, session.get('id_usuario')))


@eventos_bp.route('/api/eventos/<int:id_evento>', methods=['PUT'])
@role_required('Administrador', api=True)
def actualizar_evento(id_evento):
    datos = request.get_json(silent=True) or {}
    return jsonify(actualizar_evento(id_evento, datos))


@eventos_bp.route('/api/eventos/<int:id_evento>', methods=['DELETE'])
@role_required('Administrador', api=True)
def eliminar_evento(id_evento):
    return jsonify(eliminar_evento(id_evento))
