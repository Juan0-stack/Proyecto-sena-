from database.conexion import get_connection
from utils.formato import fila, lista


class EspacioModel:

    @staticmethod
    def _consulta_base():
        return """
            SELECT e.*, CONCAT(u.nombre, ' ', COALESCE(u.apellido, '')) AS encargado_nombre
            FROM espacios e
            LEFT JOIN usuarios u ON e.id_usuario_encargado = u.id_usuario
        """

    @staticmethod
    def crear(nombre, tipo, descripcion, capacidad, destacado, id_usuario_encargado):
        conn = get_connection()
        if not conn:
            return None
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO espacios
                    (nombre, tipo, descripcion, capacidad, destacado, id_usuario_encargado)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (nombre, tipo, descripcion, capacidad, destacado, id_usuario_encargado)
            )
            conn.commit()
            return cursor.lastrowid
        except Exception as e:
            print(f'Error al crear espacio: {e}')
            conn.rollback()
            return None
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def actualizar(id_espacio, nombre, tipo, descripcion, capacidad,
                   estado, destacado, id_usuario_encargado):
        conn = get_connection()
        if not conn:
            return False
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE espacios
                SET nombre = %s, tipo = %s, descripcion = %s, capacidad = %s,
                    estado = %s, destacado = %s, id_usuario_encargado = %s
                WHERE id_espacio = %s
                """,
                (nombre, tipo, descripcion, capacidad, estado,
                 destacado, id_usuario_encargado, id_espacio)
            )
            conn.commit()
            return True
        except Exception as e:
            print(f'Error al actualizar espacio: {e}')
            conn.rollback()
            return False
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def eliminar(id_espacio):
        conn = get_connection()
        if not conn:
            return False
        try:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM espacios WHERE id_espacio = %s", (id_espacio,))
            conn.commit()
            return True
        except Exception as e:
            print(f'Error al eliminar espacio: {e}')
            conn.rollback()
            return False
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def obtener(id_espacio):
        conn = get_connection()
        if not conn:
            return None
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                EspacioModel._consulta_base() + " WHERE e.id_espacio = %s",
                (id_espacio,)
            )
            return fila(cursor.fetchone())
        except Exception as e:
            print(f'Error al obtener espacio: {e}')
            return None
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def listar():
        conn = get_connection()
        if not conn:
            return []
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                EspacioModel._consulta_base() + " ORDER BY e.nombre ASC"
            )
            return lista(cursor.fetchall())
        except Exception as e:
            print(f'Error al listar espacios: {e}')
            return []
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def listar_por_encargado(id_usuario):
        conn = get_connection()
        if not conn:
            return []
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                EspacioModel._consulta_base() +
                " WHERE e.id_usuario_encargado = %s ORDER BY e.nombre ASC",
                (id_usuario,)
            )
            return lista(cursor.fetchall())
        except Exception as e:
            print(f'Error al listar espacios del encargado: {e}')
            return []
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def contar():
        conn = get_connection()
        if not conn:
            return 0
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM espacios")
            return cursor.fetchone()[0]
        except Exception as e:
            print(f'Error al contar espacios: {e}')
            return 0
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def contar_por_estado(estado):
        conn = get_connection()
        if not conn:
            return 0
        try:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT COUNT(*) FROM espacios WHERE estado = %s",
                (estado,)
            )
            return cursor.fetchone()[0]
        except Exception as e:
            print(f'Error al contar espacios por estado: {e}')
            return 0
        finally:
            cursor.close()
            conn.close()
