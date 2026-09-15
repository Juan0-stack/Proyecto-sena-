from flask import Blueprint, jsonify, session

from controllers.panel_controller import PanelController
from utils.auth import login_required

panel_bp = Blueprint('panel', __name__)


@panel_bp.route('/api/panel', methods=['GET'])
@login_required(api=True)
def datos_panel():
    rol = session.get('nombre_rol')
    if rol == 'Administrador':
        return jsonify({'ok': True, 'rol': rol, 'datos': PanelController.datos_admin()})
    if rol == 'Docente':
        return jsonify({'ok': True, 'rol': rol, 'datos': PanelController.datos_docente(session.get('id_usuario'))})
    return jsonify({'ok': True, 'rol': rol, 'datos': PanelController.datos_estudiante()})