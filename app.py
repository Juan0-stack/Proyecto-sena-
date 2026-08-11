from flask import Flask

from config import Config
from database.conexion import init_db
from routes.clientes_routes import clientes_bp

app = Flask(__name__)
app.config.from_object(Config)

init_db()

app.register_blueprint(clientes_bp)

if __name__ == '__main__':
    app.run(debug=True)
