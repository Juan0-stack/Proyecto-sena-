from werkzeug.security import generate_password_hash, check_password_hash

from database.conexion import get_connection
from utils.formato import fila, lista


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
    def actualizar(id_usuario, nombre, apellido, correo, id_rol, password=None):
        conn = get_connection()
        if not conn:
            return False
        try:
            cursor = conn.cursor()
            if password:
                cursor.execute(
                    """
                    UPDATE usuarios
                    SET nombre = %s, apellido = %s, correo = %s,
                        id_rol = %s, password_hash = %s
                    WHERE id_usuario = %s
                    """,
                    (
                        nombre,
                        apellido,
                        correo,
                        id_rol,
                        generate_password_hash(password, method='pbkdf2:sha256'),
                        id_usuario
                    )
                )
            else:
                cursor.execute(
                    """
                    UPDATE usuarios
                    SET nombre = %s, apellido = %s, correo = %s, id_rol = %s
                    WHERE id_usuario = %s
                    """,
                    (nombre, apellido, correo, id_rol, id_usuario)
                )
            conn.commit()
            return True
        except Exception as e:
            print(f'Error al actualizar usuario: {e}')
            conn.rollback()
            return False
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def cambiar_estado(id_usuario, estado):
        conn = get_connection()
        if not conn:
            return False
        try:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE usuarios SET estado = %s WHERE id_usuario = %s",
                (estado, id_usuario)
            )
            conn.commit()
            return True
        except Exception as e:
            print(f'Error al cambiar estado del usuario: {e}')
            conn.rollback()
            return False
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def actualizar_acceso(id_usuario):
        conn = get_connection()
        if not conn:
            return False
        try:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE usuarios SET ultimo_acceso = NOW() WHERE id_usuario = %s",
                (id_usuario,)
            )
            conn.commit()
            return True
        except Exception as e:
            print(f'Error al actualizar último acceso: {e}')
            conn.rollback()
            return False
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
    def buscar_por_id(id_usuario):
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
                WHERE u.id_usuario = %s
                """,
                (id_usuario,)
            )
            return fila(cursor.fetchone())
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
                ORDER BY u.estado DESC, u.id_usuario ASC
                """
            )
            return lista(cursor.fetchall())
        except Exception as e:
            print(f'Error al listar usuarios: {e}')
            return []
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def listar_docentes():
        conn = get_connection()
        if not conn:
            return []
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                """
                SELECT u.id_usuario, u.nombre, u.apellido
                FROM usuarios u
                JOIN roles r ON u.id_rol = r.id_rol
                WHERE r.nombre_rol = 'Docente' AND u.estado = 'Activo'
                ORDER BY u.nombre ASC
                """
            )
            return lista(cursor.fetchall())
        except Exception as e:
            print(f'Error al listar docentes: {e}')
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

    @staticmethod
    def contar_activos():
        conn = get_connection()
        if not conn:
            return 0
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM usuarios WHERE estado = 'Activo'")
            return cursor.fetchone()[0]
        except Exception as e:
            print(f'Error al contar usuarios activos: {e}')
            return 0
        finally:
            cursor.close()
            conn.close()
