from flask import Flask, render_template, request

from config import Config
from database.conexion import init_db
from controllers.controller import ClienteController
from routes.clientes_routes import clientes_bp
from routes.espacio_routes import espacios_bp
from routes.evento_routes import eventos_bp
from routes.panel_routes import panel_bp
from routes.solicitud_routes import solicitudes_bp

app = Flask(__name__)
app.config.from_object(Config)

init_db()

#por defecto abre index.html
@app.route('/')
def inicio():
    return render_template('index.html')

@app.route('/pan')
def panellum():
    return render_template('solicitud_espacio.html')

#cuando se abre el href, /register_pag, abre el html
@app.route('/register_pag')
def register_pag():
    return render_template('solicitud_espacio.html')

#FORMULARIO, de action='/register', metodos , como pull push
@app.route('/register', methods=['GET', 'POST'])
def guardar_usuario():
    if request.method == 'POST':
        resultado = ClienteController.registrar(request.form)
        if not resultado['ok']:
            return resultado['error'], 400
        return 'Cliente guardado correctamente'

    return render_template('solicitud_espacio.html')


#falta demas tablas// 
app.register_blueprint(clientes_bp)
app.register_blueprint(espacios_bp)
app.register_blueprint(solicitudes_bp)
app.register_blueprint(eventos_bp)
app.register_blueprint(panel_bp)

if __name__ == '__main__':
    app.run(debug=True)
