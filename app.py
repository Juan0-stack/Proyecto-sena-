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

# Create the local schema when MySQL/MariaDB is available. The web app can still
# serve its public pages while the database is stopped; API requests will need it.
if not init_db():
    app.logger.warning(
        'No se pudo inicializar la base de datos. Comprueba que MySQL esté iniciado '
        'y que config.py apunte a la instalación correcta.'
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

