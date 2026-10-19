from flask import Blueprint, jsonify, request, session

from controllers.controller import EventoController
from utils.auth import login_required, role_required

eventos_bp = Blueprint('eventos', __name__)


@eventos_bp.route('/api/publico/eventos-culturales', methods=['GET'])
def listar_eventos_culturales_publicos():
    """Agenda pública de solo lectura: únicamente eventos culturales."""
    from models.evento_model import EventoModel
    eventos = EventoModel.listar(tipo_evento='Cultural')
    return jsonify({'ok': True, 'eventos': eventos})


@eventos_bp.route('/api/eventos', methods=['GET'])
@login_required(api=True)
def listar_eventos():
    from models.evento_model import EventoModel
    return jsonify({'ok': True, 'eventos': EventoModel.listar()})


@eventos_bp.route('/api/eventos', methods=['POST'])
@role_required('Administrador', 'Gestión de Calidad', api=True)
def crear_evento():
    datos = request.get_json(silent=True) or {}
    return jsonify(EventoController.crear(datos, session.get('id_usuario')))


@eventos_bp.route('/api/eventos/<int:id_evento>', methods=['PUT'])
@role_required('Administrador', 'Gestión de Calidad', api=True)
def actualizar_evento(id_evento):
    datos = request.get_json(silent=True) or {}
    return jsonify(EventoController.actualizar(id_evento, datos))


@eventos_bp.route('/api/eventos/<int:id_evento>', methods=['DELETE'])
@role_required('Administrador', 'Gestión de Calidad', api=True)
def eliminar_evento(id_evento):
    return jsonify(EventoController.eliminar(id_evento))
