from flask import Flask

from config import Config
from database.conexion import init_db
from routes.clientes_routes import clientes_bp
from routes.espacio_routes import espacios_bp
from routes.evento_routes import eventos_bp
from routes.solicitud_routes import solicitudes_bp

app = Flask(__name__)
app.config.from_object(Config)

init_db()

app.register_blueprint(clientes_bp)
app.register_blueprint(espacios_bp)
app.register_blueprint(solicitudes_bp)
app.register_blueprint(eventos_bp)

if __name__ == '__main__':
    app.run(debug=True)
