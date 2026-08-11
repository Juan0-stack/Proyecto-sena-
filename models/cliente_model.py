from werkzeug.security import generate_password_hash, check_password_hash

from database.conexion import get_connection


class ClienteModel:

    @staticmethod
    def crear(nombre, apellido, correo, password, id_rol):
        conn = get_connection()
        if not conn:
            return None
        try:
            cursor = conn.cursor()
            query = """
                INSERT INTO usuarios (nombre, apellido, correo, password_hash, estado, id_rol)
                VALUES (%s, %s, %s, %s, 'Activo', %s)
            """
            cursor.execute(
                query,
                (
                    nombre,
                    apellido,
                    correo,
                    generate_password_hash(password, method='pbkdf2:sha256'),
                    id_rol
                )
            )
            conn.commit()
            return cursor.lastrowid
        except Exception as e:
            print(f'Error al crear usuario: {e}')
            conn.rollback()
            return None
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def buscar_por_correo(correo):
        conn = get_connection()
        if not conn:
            return None
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                """
                SELECT u.*, r.nombre_rol
                FROM usuarios u
                LEFT JOIN roles r ON u.id_rol = r.id_rol
                WHERE u.correo = %s
                """,
                (correo,)
            )
            return cursor.fetchone()
        except Exception as e:
            print(f'Error al buscar usuario: {e}')
            return None
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def verificar_credenciales(correo, password):
        usuario = ClienteModel.buscar_por_correo(correo)
        if usuario and check_password_hash(usuario.get('password_hash') or '', password):
            return usuario
        return None

    @staticmethod
    def listar():
        conn = get_connection()
        if not conn:
            return []
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                """
                SELECT u.id_usuario, u.nombre, u.apellido, u.correo, u.estado,
                       u.fecha_registro, u.ultimo_acceso, r.nombre_rol
                FROM usuarios u
                LEFT JOIN roles r ON u.id_rol = r.id_rol
                ORDER BY u.id_usuario DESC
                """
            )
            return cursor.fetchall()
        except Exception as e:
            print(f'Error al listar usuarios: {e}')
            return []
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def listar_roles():
        conn = get_connection()
        if not conn:
            return []
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute("SELECT id_rol, nombre_rol FROM roles ORDER BY id_rol")
            return cursor.fetchall()
        except Exception as e:
            print(f'Error al listar roles: {e}')
            return []
        finally:
            cursor.close()
            conn.close()
