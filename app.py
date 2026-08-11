from flask import Flask, render_template, request
from config import Config
from database.conexion import mysql

app = Flask(__name__)

# Configuración MySQL
app.config['MYSQL_HOST'] = Config.MYSQL_HOST
app.config['MYSQL_USER'] = Config.MYSQL_USER
app.config['MYSQL_PASSWORD'] = Config.MYSQL_PASSWORD
app.config['MYSQL_DB'] = Config.MYSQL_DB

# Inicializar MySQL
mysql.init_app(app)

@app.route('/')
def inicio():
    return render_template('index.html')

@app.route('/register', methods=['GET'])
def register():
    return render_template('register.html')

@app.route('/register', methods=['POST'])
def guardar_usuario():
    nombre = request.form.get('nombre', '')
    apellido = request.form.get('apellido', '')
    correo = request.form.get('correo', '')
    password_hash = request.form.get('password_hash', '')

    cursor = mysql.connection.cursor()
    sql = """
    INSERT INTO usuarios(nombre, apellido, correo, password_hash)
    VALUES(%s, %s, %s, %s)
    """
    datos = (nombre, apellido, correo, password_hash)
    cursor.execute(sql, datos)
    mysql.connection.commit()
    cursor.close()

    return "Cliente guardado correctamente"

@app.route('/test-db')
def test_db():
    try:
        cursor = mysql.connection.cursor()
        cursor.execute("SELECT DATABASE()")
        resultado = cursor.fetchone()
        cursor.close()
        return f"Base de datos conectada: {resultado[0]}"
    except Exception as e:
        return f"Error de conexión: {e}"

if __name__ == '__main__':
    app.run(debug=True)
