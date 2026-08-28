from database.conexion import get_connection
from utils.formato import fila, lista


class EventoModel:

    @staticmethod
    def crear(nombre, descripcion, fecha_inicio, fecha_fin, color, creado_por):
        conn = get_connection()
        if not conn:
            return None
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO eventos_institucionales
                    (nombre, descripcion, fecha_inicio, fecha_fin, color, creado_por)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (nombre, descripcion, fecha_inicio, fecha_fin, color, creado_por)
            )
            conn.commit()
            return cursor.lastrowid
        except Exception as e:
            print(f'Error al crear evento: {e}')
            conn.rollback()
            return None
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def actualizar(id_evento, nombre, descripcion, fecha_inicio, fecha_fin, color):
        conn = get_connection()
        if not conn:
            return False
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE eventos_institucionales
                SET nombre = %s, descripcion = %s, fecha_inicio = %s,
                    fecha_fin = %s, color = %s
                WHERE id_evento = %s
                """,
                (nombre, descripcion, fecha_inicio, fecha_fin, color, id_evento)
            )
            conn.commit()
            return True
        except Exception as e:
            print(f'Error al actualizar evento: {e}')
            conn.rollback()
            return False
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def eliminar(id_evento):
        conn = get_connection()
        if not conn:
            return False
        try:
            cursor = conn.cursor()
            cursor.execute(
                "DELETE FROM eventos_institucionales WHERE id_evento = %s",
                (id_evento,)
            )
            conn.commit()
            return True
        except Exception as e:
            print(f'Error al eliminar evento: {e}')
            conn.rollback()
            return False
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def obtener(id_evento):
        conn = get_connection()
        if not conn:
            return None
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                "SELECT * FROM eventos_institucionales WHERE id_evento = %s",
                (id_evento,)
            )
            return fila(cursor.fetchone())
        except Exception as e:
            print(f'Error al obtener evento: {e}')
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
                """
                SELECT * FROM eventos_institucionales
                ORDER BY fecha_inicio ASC, nombre ASC
                """
            )
            return lista(cursor.fetchall())
        except Exception as e:
            print(f'Error al listar eventos: {e}')
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
            cursor.execute("SELECT COUNT(*) FROM eventos_institucionales")
            return cursor.fetchone()[0]
        except Exception as e:
            print(f'Error al contar eventos: {e}')
            return 0
        finally:
            cursor.close()
            conn.close()
