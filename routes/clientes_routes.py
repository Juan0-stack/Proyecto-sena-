from flask import Blueprint, jsonify, redirect, render_template, request, session

from controllers.controller import PANEL_POR_ROL, ClienteController, PanelController, SolicitudController
from models.cliente_model import ClienteModel
from models.espacio_model import EspacioModel
from models.evento_model import EventoModel
from models.solicitud_model import SolicitudModel
from utils.auth import login_required, role_required

clientes_bp = Blueprint('clientes', __name__)


def _panel_para_rol(nombre_rol):
    return PANEL_POR_ROL.get(nombre_rol, '/estudiante/panel')


@clientes_bp.route('/')
@clientes_bp.route('/index.html')
def index():
    return render_template('index.html')


@clientes_bp.route('/login')
@clientes_bp.route('/login.html')
def login():
    return render_template('login.html')


@clientes_bp.route('/logout')
def logout():
    ClienteController.cerrar_sesion()
    return redirect('/login')


@clientes_bp.route('/home')
@clientes_bp.route('/home.html')
def home():
    if session.get('id_usuario'):
        return redirect(_panel_para_rol(session.get('nombre_rol')))
    return redirect('/login')


@clientes_bp.route('/register')
@clientes_bp.route('/register.html')
def redirigir_login():
    if session.get('id_usuario'):
        return redirect(_panel_para_rol(session.get('nombre_rol')))
    return redirect('/login')


@clientes_bp.route('/admin-login')
@clientes_bp.route('/admin-login.html')
@clientes_bp.route('/admin')
@clientes_bp.route('/admin.html')
def redirigir_login_admin():
    """Alias antiguos del acceso administrativo -> login administrativo."""
    if session.get('id_usuario'):
        return redirect(_panel_para_rol(session.get('nombre_rol')))
    return redirect('/admin/login')


@clientes_bp.route('/admin/login')
@clientes_bp.route('/admin/login.html')
def login_admin():
    if session.get('id_usuario'):
        return redirect(_panel_para_rol(session.get('nombre_rol')))
    return render_template('login_admin.html')


@clientes_bp.route('/admin/panel')
@role_required('Administrador')
def admin_panel():
    return render_template('admin_panel.html')


@clientes_bp.route('/maestro/panel')
@role_required('Docente')
def maestro_panel():
    # Solo lectura: reutilizamos PanelController.datos_docente (spec §5).
    datos = PanelController.datos_docente(session.get('id_usuario'))
    espacios = datos.get('mis_espacios') or []
    return render_template('maestro_panel.html', datos=datos,
                           tiene_espacio=bool(espacios),
                           espacio=espacios[0] if espacios else None)


@clientes_bp.route('/estudiante/panel')
@role_required('Estudiante')
def estudiante_panel():
    datos = PanelController.datos_estudiante()
    return render_template('estudiante_panel.html', datos=datos)


@clientes_bp.route('/api/clientes/login', methods=['POST'])
def login_cliente():
    datos = request.get_json(silent=True) or request.form
    return jsonify(ClienteController.iniciar_sesion(datos))


@clientes_bp.route('/api/clientes/registrar', methods=['POST'])
@role_required('Administrador', api=True)
def registrar_cliente():
    datos = request.get_json(silent=True) or request.form
    return jsonify(ClienteController.registrar(datos))


@clientes_bp.route('/api/clientes', methods=['GET'])
@role_required('Administrador', api=True)
def listar_clientes():
    return jsonify({'ok': True, 'usuarios': ClienteModel.listar()})


@clientes_bp.route('/api/clientes/<int:id_usuario>', methods=['PUT'])
@role_required('Administrador', api=True)
def actualizar_cliente(id_usuario):
    datos = request.get_json(silent=True) or {}
    return jsonify(ClienteController.actualizar(id_usuario, datos))


@clientes_bp.route('/api/clientes/<int:id_usuario>/estado', methods=['PATCH'])
@role_required('Administrador', api=True)
def cambiar_estado_cliente(id_usuario):
    datos = request.get_json(silent=True) or {}
    return jsonify(ClienteController.cambiar_estado(id_usuario, (datos.get('estado') or '').strip()))


@clientes_bp.route('/api/docentes', methods=['GET'])
@login_required(api=True)
def listar_docentes():
    return jsonify({'ok': True, 'docentes': ClienteModel.listar_docentes()})


@clientes_bp.route('/api/roles', methods=['GET'])
@login_required(api=True)
def listar_roles():
    return jsonify({'ok': True, 'roles': ClienteModel.listar_roles()})


@clientes_bp.route('/api/resumen', methods=['GET'])
@role_required('Administrador', api=True)
def resumen_admin():
    return jsonify({
        'ok': True,
        'resumen': {
            'espacios': EspacioModel.contar(),
            'espacios_disponibles': EspacioModel.contar_por_estado('Disponible'),
            'usuarios_activos': ClienteModel.contar_activos(),
            'solicitudes_pendientes': SolicitudModel.contar_por_estado('pendiente'),
            'eventos': EventoModel.contar()
        }
    })


@clientes_bp.route('/solicitud-espacio')
@clientes_bp.route('/solicitud-espacio.html')
@login_required()
def solicitud_espacio():
    return render_template('solicitud_espacio.html')
