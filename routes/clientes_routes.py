from flask import Blueprint, render_template, request, jsonify

from controllers.clientes_controller import ClienteController
from models.cliente_model import ClienteModel

clientes_bp = Blueprint('clientes', __name__)


@clientes_bp.route('/')
def index():
    return render_template('index.html')


@clientes_bp.route('/index.html')
def index_html():
    return render_template('index.html')


@clientes_bp.route('/login')
def login():
    return render_template('login.html')


@clientes_bp.route('/login.html')
def login_html():
    return render_template('login.html')


@clientes_bp.route('/register')
def register():
    return render_template('register.html')


@clientes_bp.route('/register.html')
def register_html():
    return render_template('register.html')


@clientes_bp.route('/home')
def home():
    return render_template('home.html')


@clientes_bp.route('/home.html')
def home_html():
    return render_template('home.html')


@clientes_bp.route('/admin')
def admin():
    return render_template('admin.html')


@clientes_bp.route('/admin.html')
def admin_html():
    return render_template('admin.html')


@clientes_bp.route('/admin-login')
def admin_login():
    return render_template('admin-login.html')


@clientes_bp.route('/admin-login.html')
def admin_login_html():
    return render_template('admin-login.html')


@clientes_bp.route('/api/clientes/registrar', methods=['POST'])
def registrar_cliente():
    datos = request.get_json(silent=True) or request.form
    return jsonify(ClienteController.registrar(datos))


@clientes_bp.route('/api/clientes/login', methods=['POST'])
def login_cliente():
    datos = request.get_json(silent=True) or request.form
    return jsonify(ClienteController.iniciar_sesion(datos))


@clientes_bp.route('/api/clientes', methods=['GET'])
def listar_clientes():
    return jsonify({'ok': True, 'clientes': ClienteModel.listar()})


@clientes_bp.route('/api/roles', methods=['GET'])
def listar_roles():
    return jsonify({'ok': True, 'roles': ClienteModel.listar_roles()})
