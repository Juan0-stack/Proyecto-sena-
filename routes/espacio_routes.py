import datetime

from flask import Blueprint, jsonify, request, session

from controllers.controller import EspacioController
from models.espacio_model import EspacioModel
from models.solicitud_model import SolicitudModel
from utils.espacios_mapa import ESPACIOS_MAPA, clave_espacio
from utils.auth import login_required, role_required
from utils.modo_docente import modo_actual

espacios_bp = Blueprint('espacios', __name__)


@espacios_bp.route('/api/espacios', methods=['GET'])
@login_required(api=True)
def listar_espacios():
    rol = session.get('nombre_rol')
    id_usuario = session.get('id_usuario')
    if rol == 'Docente':
        return jsonify({'ok': True, 'espacios': EspacioModel.listar_por_encargado(id_usuario)})
    return jsonify({'ok': True, 'espacios': EspacioModel.listar()})


@espacios_bp.route('/api/mapa/espacios', methods=['GET'])
@role_required('Docente', api=True)
def listar_espacios_para_mapa():
    # El modo Docente ve los seis espacios solicitables; Encargado solo los suyos.
    espacios = []
    lista = EspacioModel.listar()
    modo = modo_actual()
    if modo == 'encargado':
        mis_ids = {e.get('id_espacio') for e in EspacioModel.listar_por_encargado(session.get('id_usuario'))}
        lista = [e for e in lista if e.get('id_espacio') in mis_ids]
    for espacio in lista:
        clave = clave_espacio(espacio.get('nombre'))
        if modo == 'docente' and not clave:
            continue
        espacio['zona_mapa'] = ESPACIOS_MAPA[clave]['zona'] if clave else None
        espacios.append(espacio)
    return jsonify({'ok': True, 'espacios': espacios})


@espacios_bp.route('/api/espacios', methods=['POST'])
@role_required('Administrador', 'Gestión de Calidad', api=True)
def crear_espacio():
    datos = request.get_json(silent=True) or {}
    return jsonify(EspacioController.crear(datos))


@espacios_bp.route('/api/espacios/<int:id_espacio>', methods=['PUT'])
@role_required('Administrador', 'Gestión de Calidad', api=True)
def actualizar_espacio(id_espacio):
    datos = request.get_json(silent=True) or {}
    return jsonify(EspacioController.actualizar(id_espacio, datos))


@espacios_bp.route('/api/espacios/<int:id_espacio>', methods=['DELETE'])
@role_required('Administrador', api=True)
def eliminar_espacio(id_espacio):
    return jsonify(EspacioController.eliminar(id_espacio))


@espacios_bp.route('/api/espacios/<int:id_espacio>/ocupacion', methods=['GET'])
@role_required('Administrador', 'Gestión de Calidad', 'Docente', api=True)
def ocupacion_espacio(id_espacio):
    espacio = EspacioModel.obtener(id_espacio)
    if not espacio:
        return jsonify({'ok': False, 'error': 'El espacio no existe.'}), 404
    if modo_actual() == 'encargado':
        mis_ids = {e.get('id_espacio') for e in EspacioModel.listar_por_encargado(session.get('id_usuario'))}
        if id_espacio not in mis_ids:
            return jsonify({'ok': False, 'error': 'No tienes permiso para consultar este espacio.'}), 403
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
