from flask import Blueprint, jsonify, request, session

from controllers.controller import EventoController
from models.evento_model import EventoModel
from models.espacio_model import EspacioModel
from utils.auth import login_required, role_required
from utils.modo_docente import modo_actual

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
    eventos = EventoModel.listar()
    if session.get('nombre_rol') == 'Docente' and modo_actual() == 'encargado':
        mis_ids = {e.get('id_espacio') for e in EspacioModel.listar_por_encargado(session.get('id_usuario'))}
        eventos = [ev for ev in eventos if mis_ids.intersection(ev.get('id_espacios') or [])]
    return jsonify({'ok': True, 'eventos': eventos})


@eventos_bp.route('/api/eventos', methods=['POST'])
@role_required('Administrador', 'Gestión de Calidad', 'Docente', api=True)
def crear_evento():
    datos = request.get_json(silent=True) or {}
    if session.get('nombre_rol') == 'Docente':
        if modo_actual() != 'encargado':
            return jsonify({'ok': False, 'error': 'Cambia al modo Encargado para gestionar eventos.'}), 403
        mis_ids = {e.get('id_espacio') for e in EspacioModel.listar_por_encargado(session.get('id_usuario'))}
        if not datos.get('id_espacios') or any(id_espacio not in mis_ids for id_espacio in datos.get('id_espacios', [])):
            return jsonify({'ok': False, 'error': 'Solo puedes asignar eventos a tus espacios a cargo.'}), 403
    return jsonify(EventoController.crear(datos, session.get('id_usuario')))


@eventos_bp.route('/api/eventos/<int:id_evento>', methods=['PUT'])
@role_required('Administrador', 'Gestión de Calidad', 'Docente', api=True)
def actualizar_evento(id_evento):
    datos = request.get_json(silent=True) or {}
    if session.get('nombre_rol') == 'Docente':
        if modo_actual() != 'encargado':
            return jsonify({'ok': False, 'error': 'Cambia al modo Encargado para gestionar eventos.'}), 403
        if not _docente_puede_editar_evento(id_evento):
            return jsonify({'ok': False, 'error': 'No tienes permiso para editar este evento.'}), 403
        mis_ids = {e.get('id_espacio') for e in EspacioModel.listar_por_encargado(session.get('id_usuario'))}
        if not datos.get('id_espacios') or any(id_espacio not in mis_ids for id_espacio in datos.get('id_espacios', [])):
            return jsonify({'ok': False, 'error': 'Solo puedes asignar eventos a tus espacios a cargo.'}), 403
    return jsonify(EventoController.actualizar(id_evento, datos))


@eventos_bp.route('/api/eventos/<int:id_evento>', methods=['DELETE'])
@role_required('Administrador', 'Gestión de Calidad', 'Docente', api=True)
def eliminar_evento(id_evento):
    if session.get('nombre_rol') == 'Docente':
        if modo_actual() != 'encargado':
            return jsonify({'ok': False, 'error': 'Cambia al modo Encargado para gestionar eventos.'}), 403
        if not _docente_puede_editar_evento(id_evento):
            return jsonify({'ok': False, 'error': 'No tienes permiso para eliminar este evento.'}), 403
    return jsonify(EventoController.eliminar(id_evento))


def _docente_puede_editar_evento(id_evento):
    evento = EventoModel.obtener(id_evento)
    if not evento:
        return False
    mis_ids = {e.get('id_espacio') for e in EspacioModel.listar_por_encargado(session.get('id_usuario'))}
    ids_evento = set(evento.get('id_espacios') or [])
    return bool(ids_evento) and ids_evento.issubset(mis_ids)
