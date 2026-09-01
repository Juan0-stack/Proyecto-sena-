from database.conexion import get_connection
from utils.formato import fila, lista


class SolicitudModel:

    @staticmethod
    def _consulta_base():
        return """
            SELECT s.*,
                   e.nombre AS espacio_nombre,
                   e.tipo AS espacio_tipo,
                   e.id_usuario_encargado,
                   CONCAT(u.nombre, ' ', COALESCE(u.apellido, '')) AS solicitante
            FROM solicitudes s
            JOIN espacios e ON s.id_espacio = e.id_espacio
            JOIN usuarios u ON s.id_usuario = u.id_usuario
        """

    @staticmethod
    def crear(id_usuario, id_espacio, fecha_uso, hora_inicio, hora_fin,
              nombre_actividad, descripcion):
        conn = get_connection()
        if not conn:
            return None
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO solicitudes
                    (id_usuario, id_espacio, fecha_uso, hora_inicio,
                     hora_fin, nombre_actividad, descripcion)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (id_usuario, id_espacio, fecha_uso, hora_inicio,
                 hora_fin, nombre_actividad, descripcion)
            )
            conn.commit()
            return cursor.lastrowid
        except Exception as e:
            print(f'Error al crear solicitud: {e}')
            conn.rollback()
            return None
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def obtener(id_solicitud):
        conn = get_connection()
        if not conn:
            return None
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                SolicitudModel._consulta_base() + " WHERE s.id_solicitud = %s",
                (id_solicitud,)
            )
            return fila(cursor.fetchone())
        except Exception as e:
            print(f'Error al obtener solicitud: {e}')
            return None
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def cambiar_estado(id_solicitud, estado):
        conn = get_connection()
        if not conn:
            return False
        try:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE solicitudes SET estado = %s WHERE id_solicitud = %s",
                (estado, id_solicitud)
            )
            conn.commit()
            return True
        except Exception as e:
            print(f'Error al cambiar estado de solicitud: {e}')
            conn.rollback()
            return False
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def listar_todas():
        conn = get_connection()
        if not conn:
            return []
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                SolicitudModel._consulta_base() +
                " ORDER BY s.fecha_uso DESC, s.hora_inicio ASC"
            )
            return lista(cursor.fetchall())
        except Exception as e:
            print(f'Error al listar solicitudes: {e}')
            return []
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def listar_de_usuario(id_usuario):
        conn = get_connection()
        if not conn:
            return []
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                SolicitudModel._consulta_base() +
                " WHERE s.id_usuario = %s ORDER BY s.fecha_uso DESC, s.hora_inicio ASC",
                (id_usuario,)
            )
            return lista(cursor.fetchall())
        except Exception as e:
            print(f'Error al listar solicitudes del usuario: {e}')
            return []
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def listar_por_espacio(id_espacio):
        conn = get_connection()
        if not conn:
            return []
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                SolicitudModel._consulta_base() +
                " WHERE s.id_espacio = %s ORDER BY s.fecha_uso DESC, s.hora_inicio ASC",
                (id_espacio,)
            )
            return lista(cursor.fetchall())
        except Exception as e:
            print(f'Error al listar solicitudes del espacio: {e}')
            return []
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def ocupacion(desde, hasta, id_espacio=None, tipo=None):
        condiciones = ["s.estado = 'aprobada'", "s.fecha_uso BETWEEN %s AND %s"]
        parametros = [desde, hasta]
        if id_espacio:
            condiciones.append("s.id_espacio = %s")
            parametros.append(id_espacio)
        if tipo:
            condiciones.append("e.tipo = %s")
            parametros.append(tipo)
        conn = get_connection()
        if not conn:
            return []
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                SolicitudModel._consulta_base() +
                " WHERE " + " AND ".join(condiciones) +
                " ORDER BY s.fecha_uso ASC, s.hora_inicio ASC",
                tuple(parametros)
            )
            return lista(cursor.fetchall())
        except Exception as e:
            print(f'Error al consultar ocupación: {e}')
            return []
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
                "SELECT COUNT(*) FROM solicitudes WHERE estado = %s",
                (estado,)
            )
            return cursor.fetchone()[0]
        except Exception as e:
            print(f'Error al contar solicitudes: {e}')
            return 0
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def contar_por_espacio(id_espacio):
        conn = get_connection()
        if not conn:
            return 0
        try:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT COUNT(*) FROM solicitudes WHERE id_espacio = %s",
                (id_espacio,)
            )
            return cursor.fetchone()[0]
        except Exception as e:
            print(f'Error al contar solicitudes del espacio: {e}')
            return 0
        finally:
            cursor.close()
            conn.close()
