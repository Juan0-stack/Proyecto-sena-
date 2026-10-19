from flask import Blueprint, jsonify, session

from controllers.controller import PanelController
from utils.auth import login_required

panel_bp = Blueprint('panel', __name__)


@panel_bp.route('/api/panel', methods=['GET'])
@login_required(api=True)
def datos_panel():
    rol = session.get('nombre_rol')
    if rol in ('Administrador', 'Gestión de Calidad'):
        return jsonify({'ok': True, 'rol': rol, 'datos': PanelController.datos_admin()})
    if rol == 'Docente':
        return jsonify({'ok': True, 'rol': rol, 'datos': PanelController.datos_docente(session.get('id_usuario'))})
    return jsonify({'ok': False, 'error': 'Esta cuenta no tiene acceso a un panel.'}), 403
