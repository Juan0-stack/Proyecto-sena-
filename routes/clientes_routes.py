from flask import Blueprint, jsonify, redirect, render_template, request, session

from controllers.controller import PANEL_POR_ROL, ClienteController, PanelController, SolicitudController
from models.cliente_model import ClienteModel
from models.espacio_model import EspacioModel
from models.evento_model import EventoModel
from models.solicitud_model import SolicitudModel
from utils.auth import login_required, role_required
from utils.modo_docente import modo_actual, espacios_a_cargo
from utils.espacios_mapa import clave_espacio

clientes_bp = Blueprint('clientes', __name__)


def _panel_para_rol(nombre_rol):
    return PANEL_POR_ROL.get(nombre_rol, '/login')


@clientes_bp.route('/')
@clientes_bp.route('/index.html')
def index():
    return render_template('index.html')



@clientes_bp.route('/login')
@clientes_bp.route('/login.html')
def login():
    if session.get('id_usuario'):
        destino = _panel_para_rol(session.get('nombre_rol'))
        if destino != '/login':
            return redirect(destino)
        ClienteController.cerrar_sesion()
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
    return render_template('admin_panel.html', es_admin=True)


@clientes_bp.route('/calidad/panel')
@role_required('Gestión de Calidad')
def calidad_panel():
    # Mismo home/plantilla que el Administrador, sin lo exclusivo de él
    # (Gestión roles, cuentas administrativas, eliminar usuarios). Spec §4.
    return render_template('admin_panel.html', es_admin=False)


@clientes_bp.route('/maestro/panel')
@role_required('Docente')
def maestro_panel():
    # Solo lectura: reutilizamos PanelController.datos_docente (spec §5).
    datos = PanelController.datos_docente(session.get('id_usuario'))
    espacios = datos.get('mis_espacios') or []
    modo = modo_actual()
    return render_template('maestro_panel.html', datos=datos, modo_docente=modo,
                           tiene_espacio=bool(espacios),
                           espacio=espacios[0] if espacios else None)


@clientes_bp.route('/api/cambiar-modo', methods=['POST'])
@role_required('Docente', api=True)
def cambiar_modo_docente():
    espacios = espacios_a_cargo()
    if not espacios:
        session['modo'] = 'docente'
        return jsonify({'ok': False, 'error': 'Tu cuenta no tiene un espacio a cargo.'}), 403
    datos = request.get_json(silent=True) or {}
    modo = (datos.get('modo') or '').strip().lower()
    if modo not in ('docente', 'encargado'):
        return jsonify({'ok': False, 'error': 'Elige un modo válido.'}), 400
    session['modo'] = modo
    return jsonify({'ok': True, 'modo': modo})


@clientes_bp.route('/maestro/mapa-funcional')
@role_required('Docente')
def mapa_funcional_maestro():
    # Reutiliza los planos interactivos existentes dentro del panel docente.
    return render_template('HOME(MAPA).html', integrado=True)


@clientes_bp.route('/mapa-publico')
def mapa_publico():
    # Mapa público de consulta: permite explorar edificios y pisos, sin reservar.
    return render_template('HOME(MAPA).html', integrado=True, vista_publica=True)


@clientes_bp.route('/street_view')
def recorrido_virtual():
    return render_template('recorrido_virtual.html')


@clientes_bp.route('/estudiante/panel')
def panel_estudiante_desactivado():
    return redirect('/login')


@clientes_bp.route('/api/clientes/login', methods=['POST'])
def login_cliente():
    datos = request.get_json(silent=True) or request.form
    return jsonify(ClienteController.iniciar_sesion(datos))


@clientes_bp.route('/api/clientes/registrar', methods=['POST'])
@role_required('Administrador', 'Gestión de Calidad', api=True)
def registrar_cliente():
    datos = request.get_json(silent=True) or request.form
    return jsonify(ClienteController.registrar(datos))


@clientes_bp.route('/api/clientes', methods=['GET'])
@role_required('Administrador', 'Gestión de Calidad', api=True)
def listar_clientes():
    usuarios = [
        usuario for usuario in ClienteModel.listar()
        if usuario.get('nombre_rol') != 'Estudiante'
    ]
    return jsonify({'ok': True, 'usuarios': usuarios})


@clientes_bp.route('/api/clientes/<int:id_usuario>', methods=['PUT'])
@role_required('Administrador', 'Gestión de Calidad', api=True)
def actualizar_cliente(id_usuario):
    datos = request.get_json(silent=True) or {}
    return jsonify(ClienteController.actualizar(id_usuario, datos))


@clientes_bp.route('/api/clientes/<int:id_usuario>', methods=['DELETE'])
@role_required('Administrador', api=True)
def eliminar_cliente(id_usuario):
    # Solo el Administrador elimina usuarios de forma definitiva (spec §4).
    return jsonify(ClienteController.eliminar(id_usuario))


@clientes_bp.route('/api/clientes/<int:id_usuario>/estado', methods=['PATCH'])
@role_required('Administrador', 'Gestión de Calidad', api=True)
def cambiar_estado_cliente(id_usuario):
    datos = request.get_json(silent=True) or {}
    return jsonify(ClienteController.cambiar_estado(id_usuario, (datos.get('estado') or '').strip()))


@clientes_bp.route('/api/docentes', methods=['GET'])
@login_required(api=True)
def listar_docentes():
    return jsonify({'ok': True, 'docentes': ClienteModel.listar_docentes()})


@clientes_bp.route('/api/roles', methods=['GET'])
@role_required('Administrador', api=True)
def listar_roles():
    return jsonify({'ok': True, 'roles': ClienteModel.listar_roles()})


@clientes_bp.route('/api/sesion', methods=['GET'])
@login_required(api=True)
def estado_sesion():
    rol = session.get('nombre_rol') or ''
    return jsonify({
        'ok': True,
        'autenticado': True,
        'rol': rol,
        'panel': PANEL_POR_ROL.get(rol) if rol else None
    })


@clientes_bp.route('/solicitud-espacio')
@clientes_bp.route('/solicitud-espacio.html')
@role_required('Docente')
def solicitud_espacio():
    # La solicitud independiente solo está disponible en modo Docente.
    if modo_actual() != 'docente':
        return redirect('/maestro/panel')
    espacios = [
        espacio for espacio in EspacioModel.listar()
        if clave_espacio(espacio.get('nombre'))
        and espacio.get('estado') != 'Mantenimiento'
    ]
    return render_template('solicitud_espacio.html', espacios=espacios)
