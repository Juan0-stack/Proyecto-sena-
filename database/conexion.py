import mysql.connector
from mysql.connector import Error
from config import Config


def get_connection():
    try:
        return mysql.connector.connect(
            host=Config.DB_HOST,
            port=Config.DB_PORT,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=Config.DB_NAME
        )
    except Error as e:
        print(f'Error al conectar a la base de datos: {e}')
        return None


def init_db():
    try:
        conn = mysql.connector.connect(
            host=Config.DB_HOST,
            port=Config.DB_PORT,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD
        )
        cursor = conn.cursor()
        cursor.execute(
            f"CREATE DATABASE IF NOT EXISTS {Config.DB_NAME} "
            "DEFAULT CHARACTER SET utf8mb4"
        )
        conn.database = Config.DB_NAME
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS roles (
                id_rol INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                nombre_rol VARCHAR(50) NOT NULL UNIQUE,
                descripcion VARCHAR(200)
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS usuarios (
                id_usuario INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(50) NOT NULL,
                apellido VARCHAR(50),
                correo VARCHAR(100) NOT NULL UNIQUE,
                password_hash VARCHAR(150) NOT NULL,
                estado ENUM('Activo','Inactivo') DEFAULT 'Activo',
                fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
                ultimo_acceso DATETIME,
                id_rol INT,
                CONSTRAINT usuarios_ibfk_1 FOREIGN KEY (id_rol) REFERENCES roles (id_rol)
            )
            """
        )
        cursor.execute(
            """
            INSERT IGNORE INTO roles (id_rol, nombre_rol, descripcion)
            VALUES
                (1, 'Estudiante', 'Usuario estudiante de la institución'),
                (2, 'Docente', 'Usuario docente de la institución'),
                (3, 'Administrador', 'Usuario con acceso administrativo')
            """
        )
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Error as e:
        print(f'Error inicializando la base de datos: {e}')
        return False
