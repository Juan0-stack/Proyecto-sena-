from database.conexion import get_connection
from utils.formato import fila, lista


class EventoModel:

    @staticmethod
    def crear(nombre, descripcion, fecha_inicio, fecha_fin, color, creado_por,
              tipo_evento='Institucional', id_espacios=None):
        conn = get_connection()
        if not conn:
            return None
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO eventos_institucionales
                    (nombre, descripcion, fecha_inicio, fecha_fin, color, creado_por, tipo_evento)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (nombre, descripcion, fecha_inicio, fecha_fin, color, creado_por, tipo_evento)
            )
            id_evento = cursor.lastrowid
            for id_espacio in id_espacios or []:
                cursor.execute(
                    "INSERT INTO evento_espacios (id_evento, id_espacio) VALUES (%s, %s)",
                    (id_evento, id_espacio)
                )
            conn.commit()
            return id_evento
        except Exception as e:
            print(f'Error al crear evento: {e}')
            conn.rollback()
            return None
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def actualizar(id_evento, nombre, descripcion, fecha_inicio, fecha_fin, color,
                   tipo_evento='Institucional', id_espacios=None):
        conn = get_connection()
        if not conn:
            return False
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE eventos_institucionales
                SET nombre = %s, descripcion = %s, fecha_inicio = %s,
                    fecha_fin = %s, color = %s, tipo_evento = %s
                WHERE id_evento = %s
                """,
                (nombre, descripcion, fecha_inicio, fecha_fin, color, tipo_evento, id_evento)
            )
            cursor.execute("DELETE FROM evento_espacios WHERE id_evento = %s", (id_evento,))
            for id_espacio in id_espacios or []:
                cursor.execute(
                    "INSERT INTO evento_espacios (id_evento, id_espacio) VALUES (%s, %s)",
                    (id_evento, id_espacio)
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
                """
                SELECT ev.*,
                       COALESCE(GROUP_CONCAT(DISTINCT ee.id_espacio ORDER BY ee.id_espacio), '') AS espacios_ids,
                       COALESCE(GROUP_CONCAT(DISTINCT es.nombre ORDER BY es.nombre SEPARATOR ', '), '') AS espacios_nombres
                FROM eventos_institucionales ev
                LEFT JOIN evento_espacios ee ON ee.id_evento = ev.id_evento
                LEFT JOIN espacios es ON es.id_espacio = ee.id_espacio
                WHERE ev.id_evento = %s
                GROUP BY ev.id_evento
                """,
                (id_evento,)
            )
            evento = fila(cursor.fetchone())
            if evento:
                evento['id_espacios'] = [int(x) for x in evento.pop('espacios_ids', '').split(',') if x]
            return evento
        except Exception as e:
            print(f'Error al obtener evento: {e}')
            return None
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def listar(tipo_evento=None):
        conn = get_connection()
        if not conn:
            return []
        try:
            cursor = conn.cursor(dictionary=True)
            sql = """
                SELECT ev.*,
                       COALESCE(GROUP_CONCAT(DISTINCT ee.id_espacio ORDER BY ee.id_espacio), '') AS espacios_ids,
                       COALESCE(GROUP_CONCAT(DISTINCT es.nombre ORDER BY es.nombre SEPARATOR ', '), '') AS espacios_nombres
                FROM eventos_institucionales ev
                LEFT JOIN evento_espacios ee ON ee.id_evento = ev.id_evento
                LEFT JOIN espacios es ON es.id_espacio = ee.id_espacio
                {filtro}
                GROUP BY ev.id_evento
                ORDER BY ev.fecha_inicio ASC, ev.nombre ASC
                """.format(filtro='WHERE ev.tipo_evento = %s' if tipo_evento else '')
            cursor.execute(sql, (tipo_evento,) if tipo_evento else ())
            eventos = lista(cursor.fetchall())
            for evento in eventos:
                evento['id_espacios'] = [int(x) for x in evento.pop('espacios_ids', '').split(',') if x]
            return eventos
        except Exception as e:
            print(f'Error al listar eventos: {e}')
            return []
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def listar_futuros(limite=None):
        conn = get_connection()
        if not conn:
            return []
        try:
            cursor = conn.cursor(dictionary=True)
            sql = (
                "SELECT ev.*, "
                "COALESCE(GROUP_CONCAT(DISTINCT ee.id_espacio ORDER BY ee.id_espacio), '') AS espacios_ids, "
                "COALESCE(GROUP_CONCAT(DISTINCT es.nombre ORDER BY es.nombre SEPARATOR ', '), '') AS espacios_nombres "
                "FROM eventos_institucionales ev "
                "LEFT JOIN evento_espacios ee ON ee.id_evento = ev.id_evento "
                "LEFT JOIN espacios es ON es.id_espacio = ee.id_espacio "
                "WHERE (ev.fecha_fin IS NULL OR ev.fecha_fin >= CURDATE()) "
                "GROUP BY ev.id_evento ORDER BY ev.fecha_inicio ASC, ev.nombre ASC"
            )
            if limite:
                sql += " LIMIT %s"
                cursor.execute(sql, (limite,))
            else:
                cursor.execute(sql)
            eventos = lista(cursor.fetchall())
            for evento in eventos:
                evento['id_espacios'] = [int(x) for x in evento.pop('espacios_ids', '').split(',') if x]
            return eventos
        except Exception as e:
            print(f'Error al listar eventos futuros: {e}')
            return []
        finally:
            cursor.close()
            conn.close()

    @staticmethod
    def listar_recientes(limite=5):
        conn = get_connection()
        if not conn:
            return []
        try:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                "SELECT * FROM eventos_institucionales "
                "ORDER BY COALESCE(fecha_creacion, fecha_inicio) DESC LIMIT %s",
                (limite,)
            )
            return lista(cursor.fetchall())
        except Exception as e:
            print(f'Error al listar eventos recientes: {e}')
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
