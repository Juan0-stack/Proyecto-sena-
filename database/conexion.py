import mysql.connector
from mysql.connector import Error
from werkzeug.security import generate_password_hash

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


def _sembrar_admin(cursor):
    cursor.execute("SELECT id_usuario FROM usuarios WHERE correo = %s", ('admin',))
    if cursor.fetchone() is None:
        cursor.execute(
            """
            INSERT INTO usuarios (nombre, apellido, correo, password_hash, estado, id_rol)
            VALUES (%s, %s, %s, %s, 'Activo', 3)
            """,
            (
                'Administrador',
                'ISAILO',
                'admin',
                generate_password_hash('isailo2026', method='pbkdf2:sha256')
            )
        )


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
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS espacios (
                id_espacio INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                tipo VARCHAR(50),
                descripcion VARCHAR(255),
                capacidad INT,
                estado ENUM('Disponible','Ocupado','Mantenimiento') DEFAULT 'Disponible',
                destacado BOOLEAN DEFAULT FALSE,
                id_usuario_encargado INT NULL,
                CONSTRAINT espacios_ibfk_1 FOREIGN KEY (id_usuario_encargado)
                    REFERENCES usuarios (id_usuario) ON DELETE SET NULL
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS solicitudes (
                id_solicitud INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                id_usuario INT NOT NULL,
                id_espacio INT NOT NULL,
                fecha_uso DATE NOT NULL,
                hora_inicio TIME NOT NULL,
                hora_fin TIME NOT NULL,
                nombre_actividad VARCHAR(100),
                descripcion VARCHAR(255),
                estado ENUM('pendiente','aprobada','rechazada') DEFAULT 'pendiente',
                fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT solicitudes_ibfk_1 FOREIGN KEY (id_usuario)
                    REFERENCES usuarios (id_usuario),
                CONSTRAINT solicitudes_ibfk_2 FOREIGN KEY (id_espacio)
                    REFERENCES espacios (id_espacio)
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS eventos_institucionales (
                id_evento INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                descripcion VARCHAR(255),
                fecha_inicio DATE NOT NULL,
                fecha_fin DATE,
                color VARCHAR(20) DEFAULT '#8B1E1E',
                creado_por INT,
                CONSTRAINT eventos_ibfk_1 FOREIGN KEY (creado_por)
                    REFERENCES usuarios (id_usuario) ON DELETE SET NULL
            )
            """
        )
        _sembrar_admin(cursor)
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Error as e:
        print(f'Error inicializando la base de datos: {e}')
        return False
