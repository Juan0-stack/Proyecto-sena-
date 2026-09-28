from flask import Flask

from config import Config
from database.conexion import init_db
from routes.clientes_routes import clientes_bp
from routes.espacio_routes import espacios_bp
from routes.evento_routes import eventos_bp
from routes.panel_routes import panel_bp
from routes.solicitud_routes import solicitudes_bp

app = Flask(__name__)
app.config.from_object(Config)

init_db()

<<<<<<< HEAD
# Inicializar MySQL
mysql.init_app(app)

#por defecto abre index.html
@app.route('/')
def inicio():
    return render_template('index.html')

@app.route('/pan')
def panellum():
    return render_template('panellum_example_1.html')

#cuando se abre el href, /register_pag, abre el html
@app.route('/register_pag')
def register_pag():
    return render_template('register.html')

#FORMULARIO, de action='/register', metodos , como pull push
@app.route('/register', methods=['GET', 'POST'])
def guardar_usuario():
    if request.method == 'POST':
        #post= enviar info al server

        nombre = request.form.get('nombre', '') #nombre(variable) <-- nombre(html)
        apellido = request.form.get('apellido', '')
        correo = request.form.get('correo', '')
        password_hash = request.form.get('password_hash', '')

        cursor = mysql.connection.cursor() #deja que python maneje sql/guarda en sql(var) las intrucciones
        sql = """ 
        INSERT INTO usuarios(nombre, apellido, correo, password_hash) 
        VALUES(%s, %s, %s, %s)
        """
        datos = (nombre, apellido, correo, password_hash) #coge todos en datos
        cursor.execute(sql, datos) #ejecutar el insert into
        mysql.connection.commit() # confirmar
        cursor.close() #CIERRA la herramienta

        return "Cliente guardado correctamente" # mensaje despues

    return render_template('register.html') #opcional, renderizar


#falta demas tablas// 
=======
>>>>>>> 9a9ec80bac947583e7d4b3c5bb2abc1376fa72ca
app.register_blueprint(clientes_bp)
app.register_blueprint(espacios_bp)
app.register_blueprint(solicitudes_bp)
app.register_blueprint(eventos_bp)
<<<<<<< HEAD
=======
app.register_blueprint(panel_bp)
>>>>>>> 9a9ec80bac947583e7d4b3c5bb2abc1376fa72ca

if __name__ == '__main__':
    app.run(debug=True)
