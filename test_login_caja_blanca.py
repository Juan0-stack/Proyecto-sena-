from flask import Flask, session
from unittest.mock import patch

from controllers.controller import ClienteController


app = Flask(__name__)
app.config['SECRET_KEY'] = 'test-secret'


def _usuario_base(**overrides):
    usuario = {
        'id_usuario': 7,
        'nombre': 'Ana',
        'apellido': 'Pérez',
        'correo': 'ana@correo.com',
        'estado': 'Activo',
        'nombre_rol': 'Docente',
        'id_rol': 2,
    }
    usuario.update(overrides)
    return usuario


def test_login_campos_vacios():
    with app.test_request_context():
        resultado = ClienteController.iniciar_sesion({'correo': '', 'password': ''})
        assert resultado['ok'] is False
        assert 'usuario o correo' in resultado['error']


def test_login_usuario_no_existe():
    with app.test_request_context():
        with patch('models.cliente_model.ClienteModel.verificar_credenciales', return_value=None):
            resultado = ClienteController.iniciar_sesion({'correo': 'noexiste@correo.com', 'password': '1234'})
            assert resultado['ok'] is False
            assert 'Credenciales incorrectas' in resultado['error']


def test_login_cuenta_inactiva():
    with app.test_request_context():
        usuario = _usuario_base(estado='Inactivo')
        with patch('models.cliente_model.ClienteModel.verificar_credenciales', return_value=usuario):
            resultado = ClienteController.iniciar_sesion({'correo': usuario['correo'], 'password': '1234'})
            assert resultado['ok'] is False
            assert 'deshabilitada' in resultado['error']


def test_login_estudiante_denegado():
    with app.test_request_context():
        usuario = _usuario_base(nombre_rol='Estudiante', id_rol=1)
        with patch('models.cliente_model.ClienteModel.verificar_credenciales', return_value=usuario):
            resultado = ClienteController.iniciar_sesion({'correo': usuario['correo'], 'password': '1234'})
            assert resultado['ok'] is False
            assert 'estudiantes' in resultado['error']


def test_login_admin_only_con_docente_redirecciona():
    with app.test_request_context():
        usuario = _usuario_base()
        with patch('models.cliente_model.ClienteModel.verificar_credenciales', return_value=usuario):
            resultado = ClienteController.iniciar_sesion({'correo': usuario['correo'], 'password': '1234', 'admin_only': True})
            assert resultado['ok'] is False
            assert resultado['redirect'] == '/login?aviso=docente'


def test_login_normal_con_administrador_redirecciona_a_login_admin():
    with app.test_request_context():
        usuario = _usuario_base(nombre_rol='Administrador', id_rol=3)
        with patch('models.cliente_model.ClienteModel.verificar_credenciales', return_value=usuario):
            resultado = ClienteController.iniciar_sesion({'correo': usuario['correo'], 'password': '1234'})
            assert resultado['ok'] is False
            assert resultado['redirect'] == '/admin/login?aviso=admin'


def test_login_exitoso_docente_crea_sesion_y_panel():
    with app.test_request_context():
        usuario = _usuario_base(nombre_rol='Docente', id_rol=2)
        with patch('models.cliente_model.ClienteModel.verificar_credenciales', return_value=usuario):
            with patch('models.cliente_model.ClienteModel.actualizar_acceso', return_value=True):
                with patch('models.espacio_model.EspacioModel.listar_por_encargado', return_value=[]):
                    resultado = ClienteController.iniciar_sesion({'correo': usuario['correo'], 'password': '1234'})
                    assert resultado['ok'] is True
                    assert resultado['panel'] == '/maestro/panel'
                    assert resultado['cliente']['rol'] == 'Docente'
                    assert session['nombre_rol'] == 'Docente'
                    assert session['modo'] == 'docente'


def test_login_administrativo_con_cuenta_admin_y_admin_only():
    with app.test_request_context():
        usuario = _usuario_base(nombre_rol='Gestión de Calidad', id_rol=4)
        with patch('models.cliente_model.ClienteModel.verificar_credenciales', return_value=usuario):
            with patch('models.cliente_model.ClienteModel.actualizar_acceso', return_value=True):
                resultado = ClienteController.iniciar_sesion({'correo': usuario['correo'], 'password': '1234', 'admin_only': True})
                assert resultado['ok'] is True
                assert resultado['panel'] == '/calidad/panel'
                assert session['nombre_rol'] == 'Gestión de Calidad'
