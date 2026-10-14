import os
import sys

# Permite ejecutar `python app.py` desde cualquier carpeta:
# siempre nos situamos en la carpeta real del proyecto.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(BASE_DIR)
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from flask import Flask, render_template

from config import Config
from database.conexion import init_db
from routes.clientes_routes import clientes_bp
from routes.espacio_routes import espacios_bp
from routes.evento_routes import eventos_bp
from routes.panel_routes import panel_bp
from routes.solicitud_routes import solicitudes_bp
from utils.auth import login_required

app = Flask(__name__)
app.config.from_object(Config)

# Se crea el esquema local cuando MySQL/MariaDB esta disponible. La web puede
# seguir sirviendo sus paginas publicas mientras la base de datos esta detenida.
if not init_db():
    app.logger.warning(
        'No se pudo inicializar la base de datos. Comprueba que MySQL este iniciado '
        'y que config.py apunte a la instalacion correcta.'
    )

app.register_blueprint(clientes_bp)
app.register_blueprint(espacios_bp)
app.register_blueprint(solicitudes_bp)
app.register_blueprint(eventos_bp)
app.register_blueprint(panel_bp)


@app.route('/pan')
def panellum():
    return render_template('panellum_example_1.html')


@app.route('/mapa')
@login_required()
def mapa():
    return render_template('Mapa_General.html')


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)
