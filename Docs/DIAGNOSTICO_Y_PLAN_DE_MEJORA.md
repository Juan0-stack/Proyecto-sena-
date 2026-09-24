# Diagnóstico y Plan de Mejora — ISAILO_MAPS

| Campo | Valor |
|---|---|
| Fecha | 2026-09-23 |
| Proyecto | Proyecto-sena- (ISAILO_MAPS) |
| Rama | `revision` |
| Stack | Flask 3.0.3 · MySQL/MariaDB (`mysql-connector-python` 8.4.0) · JS vanilla |
| Base del diagnóstico | Revisión multi-eje del código (no del grafo) |
| Skills aplicadas | `code-review-and-quality` (5 ejes), `security-and-hardening`, `performance-optimization` |

Este documento complementa a `Docs/DIAGNOSTICO_GRAFO.md`. Aquel describe **qué forma tiene** el código (según el grafo); este describe **qué hay que mejorar y cómo hacerlo** (según la revisión directa del código).

---

## 1. Resumen ejecutivo

La aplicación está **funcionalmente completa y bien organizada en capas** (`routes → controllers → models → database`), sin ciclos de importación. La separación de responsabilidades es correcta y consistente. Sin embargo, la revisión multi-eje detecta **problemas que impiden considerarla lista para producción**, concentrados en tres áreas:

- **Seguridad (crítico):** secretos con valores por defecto embebidos, **ausencia total de protección CSRF** en endpoints que mutan datos, cookies de sesión sin endurecer, `debug=True` y login sin límite de intentos.
- **Correctitud y ciclo de vida:** el acceso a datos **se degrada silenciosamente** en errores (`get_connection` devuelve `None`), y `init_db()` ejecuta creación de esquema y *seeding* **al importar** `app.py`.
- **Rendimiento y mantenibilidad:** sin *pooling* de conexiones, **escaneos completos de tablas con filtrado en Python**, endpoints de listado sin paginación, esquema sin migraciones (y el `.sql` del repo está **desactualizado**), y **cero pruebas automatizadas**.

### Conteo de hallazgos por severidad

| Severidad | Cantidad | Ejes |
|---|---:|---|
| **Crítica** (bloquea producción) | 4 | Seguridad (3), Correctitud (1) |
| **Alta** | 5 | Seguridad (3), Rendimiento (1), Arquitectura (1) |
| **Media** | 7 | Correctitud (3), Rendimiento (2), Mantenibilidad (2) |
| **Baja / Nit** | 5 | Mantenibilidad y estilo |

---

## 2. Metodología

Se aplicaron las tres skills sobre los 24 archivos de código:

1. **`code-review-and-quality`** — revisión en 5 ejes: correctitud, legibilidad, arquitectura, seguridad y rendimiento. Cada hallazgo se etiqueta con severidad (Crítico / Alto / Medio / Bajo).
2. **`security-and-hardening`** — verificación contra OWASP Top 10, gestión de secretos, cabeceras, cookies, validación de entrada y control de acceso.
3. **`performance-optimization`** — búsqueda de patrones N+1, consultas sin índice, datos sin límite y trabajo redundante.

**Alcance revisado:** `app.py`, `config.py`, `database/conexion.py`, `controllers/*.py` (5), `models/*.py` (4), `routes/*.py` (5), `utils/*.py` (2), `static/panel.js`, `static/config.json`, `templates/admin_panel.html`, `database/isailo_maps.sql`, `requirements.txt`, `README.md`.

---

## 3. Mapa de hallazgos

| # | Eje | Hallazgo | Severidad | Ubicación |
|---:|---|---|---|---|
| 3.1 | Seguridad | `SECRET_KEY` y credenciales DB con valores por defecto | **Crítica** | `config.py:5,7-10` |
| 3.2 | Seguridad | Sin protección CSRF en endpoints mutantes | **Crítica** | `routes/*.py` (POST/PUT/PATCH/DELETE) |
| 3.3 | Seguridad | Cookies de sesión sin `Secure`/`SameSite`/`HttpOnly` explícitos | **Alta** | `config.py`, `app.py:11-12` |
| 3.4 | Seguridad | Login sin límite de intentos (fuerza bruta) | **Alta** | `routes/clientes_routes.py:74-77` |
| 3.5 | Seguridad | `debug=True` en el arranque | **Alta** | `app.py:23` |
| 3.6 | Correctitud | `init_db()` con efectos secundarios al importar | **Crítica** | `app.py:14`, `database/conexion.py:39-151` |
| 3.7 | Correctitud | `get_connection()` devuelve `None` de forma silenciosa | **Alta** | `database/conexion.py:8-19` |
| 3.8 | Correctitud | Validaciones débiles de fecha/hora | **Media** | `controllers/evento_controller.py:20-23`, `controllers/solicitud_controller.py:24-29` |
| 3.9 | Correctitud | `logout` por GET y sin `@login_required` | **Media** | `routes/clientes_routes.py:30-33` |
| 3.10 | Correctitud | Contraseña mínima de 4 caracteres | **Media** | `controllers/clientes_controller.py:46-47,69-70` |
| 3.11 | Arquitectura | Esquema embebido, sin migraciones; `.sql` desactualizado | **Alta** | `database/conexion.py:53-146`, `database/isailo_maps.sql` |
| 3.12 | Arquitectura | Acoplamiento directo a `get_connection()` en 37 puntos | **Media** | `models/*.py` |
| 3.13 | Rendimiento | Sin *pooling* de conexiones | **Alta** | `database/conexion.py:8-19` |
| 3.14 | Rendimiento | Filtrado en Python sobre `listar_todas()` | **Media** | `controllers/panel_controller.py:60,113` |
| 3.15 | Rendimiento | Listados sin paginación | **Media** | `models/cliente_model.py:181-202`, `models/solicitud_model.py:91-107` |
| 3.16 | Rendimiento | Sin índices en `solicitudes` | **Media** | `database/conexion.py:103-122` |
| 3.17 | Mantenibilidad | Cero pruebas automatizadas | **Alta** | (todo el repo) |
| 3.18 | Mantenibilidad | Librería Pannellum vendorizada dentro de `static/` | **Baja** | `static/pannellum/` |
| 3.19 | Mantenibilidad | Import dentro de función | **Baja** | `routes/evento_routes.py:12` |
| 3.20 | Mantenibilidad | README de 5 líneas | **Baja** | `README.md` |
| 3.21 | Seguridad | Cabeceras de seguridad ausentes (CSP, HSTS, X-Frame-Options) | **Media** | `app.py` |

---

## 4. Hallazgos detallados

Cada hallazgo incluye **evidencia**, **impacto** y **cómo mejorarlo** con código concreto.

### 4.1 [CRÍTICO] Secretos y credenciales con valores por defecto

**Evidencia**
```python
# config.py
SECRET_KEY = os.environ.get('SECRET_KEY', 'isailo-maps-secret-key-2026')   # línea 5
DB_USER = os.environ.get('DB_USER', 'root')                                # línea 9
DB_PASSWORD = os.environ.get('DB_PASSWORD', '')                            # línea 10
```

**Impacto.** Si se despliega sin variables de entorno, la `SECRET_KEY` es pública (está en el repositorio) y cualquiera puede **falsificar cookies de sesión** y suplantar a cualquier usuario, incluido el administrador. Las credenciales `root`/vacío exponen la base de datos completa.

**Cómo mejorarlo.** Fallar al arrancar si falta un secreto y usar un `.env` no versionado.

```python
# config.py
import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY')
    DB_HOST = os.environ.get('DB_HOST', 'localhost')
    DB_PORT = int(os.environ.get('DB_PORT', 3306))
    DB_USER = os.environ.get('DB_USER')
    DB_PASSWORD = os.environ.get('DB_PASSWORD')
    DB_NAME = os.environ.get('DB_NAME', 'isailo_maps')


def validar_config():
    faltantes = [k for k in ('SECRET_KEY', 'DB_USER', 'DB_PASSWORD')
                 if not getattr(Config, k)]
    if faltantes:
        raise RuntimeError(f'Faltan variables de entorno: {", ".join(faltantes)}')
```

```python
# app.py
from config import Config, validar_config
app.config.from_object(Config)
validar_config()
```

Añadir a `.gitignore` (ya tiene `.opencode/`; agregar):
```
.env
.env.*
```

---

### 4.2 [CRÍTICO] Sin protección CSRF

**Evidencia.** Todos los endpoints que mutan estado aceptan JSON sin token CSRF. Por ejemplo `routes/clientes_routes.py:93-104` (`PUT`/`PATCH`), `routes/espacio_routes.py:19-36`, `routes/evento_routes.py:16-32`, `routes/solicitud_routes.py:12-32`. La cookie de sesión viaja automáticamente en cada petición, así que un sitio externo puede forzar acciones autenticadas.

**Impacto.** Un usuario autenticado que visite una página maliciosa podría, sin saberlo, crear/eliminar espacios, cambiar roles o autorizar solicitudes.

**Cómo mejorarlo.** Usar `Flask-WTF` (`CSRFProtect`) y enviar el token en las peticiones `fetch`.

```python
# app.py
from flask_wtf import CSRFProtect
csrf = CSRFProtect(app)
```
```html
<!-- templates/*_panel.html, dentro de <head> -->
<meta name="csrf-token" content="{{ csrf_token() }}">
```
```javascript
// static/panel.js, en api()
var TOKEN = document.querySelector('meta[name="csrf-token"]').content;
var opciones = {
    method: metodo || 'GET',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': TOKEN },
};
```

> Nota: `Flask-WTF` válida el token en peticiones mutantes. Alternativa sin dependencia: doble cookie + verificación de `Origin`/`Referer`.

---

### 4.3 [ALTO] Cookies de sesión sin endurecer

**Evidencia.** No se configura `SESSION_COOKIE_*`; Flask usa `SameSite=None` (el navegador aplica `Lax` por defecto, pero no está garantizado) y `Secure=False`.

**Impacto.** La cookie puede viajar por HTTP y quedar más expuesta a CSRF y a interceptación.

**Cómo mejorarlo.**
```python
# config.py (dentro de la clase Config)
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = True      # requiere HTTPS en producción
SESSION_COOKIE_SAMESITE = 'Lax'
PERMANENT_SESSION_LIFETIME = 60 * 60 * 8  # 8 horas
```

---

### 4.4 [ALTO] Login sin límite de intentos

**Evidencia.** `routes/clientes_routes.py:74-77` expone `POST /api/clientes/login` sin *throttling*. `ClienteController.iniciar_sesion` tampoco cuenta intentos.

**Impacto.** Ataque de fuerza bruta / *credential stuffing* contra `admin` y usuarios.

**Cómo mejorarlo.** `Flask-Limiter`:
```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
limiter = Limiter(get_remote_address, app=app, default_limits=['200/hour'])

@clientes_bp.route('/api/clientes/login', methods=['POST'])
@limiter.limit('10/15minutes')
def login_cliente():
    ...
```

---

### 4.5 [ALTO] `debug=True` en el arranque

**Evidencia.** `app.py:23`: `app.run(debug=True)`.

**Impacto.** Con el depurador activo se expone la consola interactiva de Werkzeug (ejecución de código remoto si es accesible) y se filtran *stack traces*.

**Cómo mejorarlo.**
```python
import os
if __name__ == '__main__':
    app.run(debug=os.environ.get('FLASK_DEBUG') == '1')
```
En producción, servidor WSGI real: `gunicorn -w 4 'app:app'` (añadir `gunicorn` a `requirements.txt`).

---

### 4.6 [CRÍTICO] `init_db()` con efectos secundarios al importar

**Evidencia.** `app.py:14` llama `init_db()` a nivel de módulo. `database/conexion.py:39-151` crea base de datos, tablas, ejecuta un `ALTER TABLE` defensivo (`:140-146`) y siembra un admin.

**Impacto.** Importar la app (incluido un test o un `flask --help`) intenta conectarse a MySQL, crea esquema y **siembra un administrador**. Rompe el aislamiento de pruebas y mezcla migración con arranque.

**Cómo mejorarlo.** Convertirlo en comando CLI explícito.
```python
# app.py
import click
from database.conexion import init_db

@app.cli.command('init-db')
def init_db_command():
    if init_db():
        click.echo('Base de datos inicializada.')
    else:
        click.echo('Fallo al inicializar la base de datos.', err=True)
```
`flask init-db` se ejecuta manualmente/despliegue. Ver también el punto 4.11 (migraciones).

---

### 4.7 [ALTO] `get_connection()` devuelve `None` de forma silenciosa

**Evidencia.**
```python
# database/conexion.py:8-19
def get_connection():
    try:
        return mysql.connector.connect(...)
    except Error as e:
        print(f'Error al conectar a la base de datos: {e}')
        return None
```
Todos los modelos hacen `if not conn: return []` / `return 0` / `return None`.

**Impacto.** Un fallo de base de datos es indistinguible de "no hay datos". La UI muestra listas vacías y el usuario no recibe error; el incidente se silencia en producción (y el `print` contamina stdout).

**Cómo mejorarlo.** Propagar el error y capturarlo en la capa HTTP con un manejador global.
```python
# database/conexion.py
def get_connection():
    return pool.get_connection()   # deja que la excepción suba
```
```python
# app.py
from mysql.connector import Error
@app.errorhandler(Error)
def handle_db_error(e):
    app.logger.error('Error de base de datos: %s', e)
    return jsonify({'ok': False, 'error': 'Servicio temporalmente no disponible.'}), 503
```
Y usar un *context manager* que garantice cierre:
```python
from contextlib import contextmanager

@contextmanager
def db_cursor(dictionary=False):
    conn = pool.get_connection()
    try:
        cur = conn.cursor(dictionary=dictionary)
        yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()
```

---

### 4.8 [MEDIO] Validaciones débiles de fecha/hora

**Evidencia.**
- `controllers/evento_controller.py:20-23`: solo comprueba `len(fecha_inicio) == 10`; no parsea la fecha, así que `"aaaaaaaaaa"` pasa.
- `controllers/solicitud_controller.py:24-29`: compara horas como *strings* (`hora_inicio >= hora_fin`), válido solo si el formato `HH:MM` es correcto — lo cual no se valida (`'12:60'` o `'ab:cd'` serían aceptados si `len == 5` y contienen `:`).

**Impacto.** Datos inválidos llegan a la base de datos; errores confusos o registros corruptos.

**Cómo mejorarlo.** Parsear con `datetime`:
```python
# evento_controller
try:
    datetime.datetime.strptime(fecha_inicio, '%Y-%m-%d')
except ValueError:
    return None, 'La fecha de inicio no es válida.'

# solicitud_controller
try:
    hi = datetime.datetime.strptime(hora_inicio, '%H:%M').time()
    hf = datetime.datetime.strptime(hora_fin, '%H:%M').time()
except ValueError:
    return None, ..., 'Formato de hora inválido (usa HH:MM).'
if hi >= hf:
    return None, ..., 'La hora de fin debe ser posterior a la de inicio.'
```
> `solicitud_controller._validar` ya parsea la fecha; replicar el patrón para las horas.

---

### 4.9 [MEDIO] Logout por GET y sin `@login_required`

**Evidencia.** `routes/clientes_routes.py:30-33`:
```python
@clientes_bp.route('/logout')
def logout():
    ClienteController.cerrar_sesion()
    return redirect('/login')
```

**Impacto.** Un GET que cambia estado es un *logout CSRF* (un `<img src="/logout">` cierra la sesión). No es grave, pero es un antipatrón.

**Cómo mejorarlo.** Exigir POST (el template ya es un `<a href>`; basta convertirlo en formulario o botón que haga `fetch` POST) y añadir `@login_required`.

---

### 4.10 [MEDIO] Política de contraseñas débil

**Evidencia.** `controllers/clientes_controller.py:46-47,69-70`: mínimo 4 caracteres.

**Impacto.** Contraseñas triviales; combinado con 4.4 (sin rate limit), la superficie de ataque crece.

**Cómo mejorarlo.** Mínimo 8-12 caracteres y verificar contra listas de contraseñas comunes. Mantener `pbkdf2:sha256` (Werkzeug, correcto); si se desea, migrar a `scrypt`/`argon2`.

---

### 4.11 [ALTO] Esquema embebido, sin migraciones y `.sql` desactualizado

**Evidencia.**
- `database/conexion.py:53-146` define el esquema completo en Python (incluido un `ALTER TABLE` ad-hoc).
- `database/isailo_maps.sql` **solo contiene `roles` y `usuarios`**; faltan `espacios`, `solicitudes` y `eventos_institucionales`. Es un volcado parcial y desactualizado que induce a error.

**Impacto.** No hay historial de cambios de esquema; distintos entornos divergen; el `.sql` documenta una realidad falsa.

**Cómo mejorarlo.**
1. Adoptar migraciones (Alembic/Flyway o scripts SQL versionados `db/migrations/001_init.sql`, `002_*.sql`).
2. Regenerar `isailo_maps.sql` con el esquema completo **o** eliminarlo y dejar las migraciones como fuente de verdad.
3. Documentar en el README el comando de migración.

---

### 4.12 [MEDIO] Acoplamiento directo a `get_connection()` (37 puntos)

**Evidencia.** 37 llamadas en `models/*.py` (11 en `solicitud_model`, 10 en `cliente_model`, 8 en `espacio_model`, 8 en `evento_model`), cada una repitiendo el patrón `conn → cursor → try/except/finally`.

**Impacto.** Duplicación masiva; cualquier cambio en el acceso a datos obliga a tocar 37 sitios.

**Cómo mejorarlo.** Centralizar con el `db_cursor()` del punto 4.7 y refactorizar método a método (patrón repetido en los 4 modelos):
```python
# antes
conn = get_connection()
if not conn: return []
try:
    cursor = conn.cursor(dictionary=True)
    cursor.execute("...")
    return lista(cursor.fetchall())
finally: ...

# después
with db_cursor(dictionary=True) as cur:
    cur.execute("...")
    return lista(cur.fetchall())
```

---

### 4.13 [ALTO] Sin *pooling* de conexiones

**Evidencia.** `get_connection()` crea una conexión nueva por operación; se invoca 37 veces (y varias por petición, p. ej. `panel_controller.datos_admin`).

**Impacto.** Bajo carga se agotan las conexiones de MySQL; latencia añadida de *handshake* en cada operación.

**Cómo mejorarlo.** `MySQLConnectionPool`:
```python
# database/conexion.py
from mysql.connector import pooling

pool = pooling.MySQLConnectionPool(
    pool_name='isailo_pool',
    pool_size=5,
    pool_reset_session=True,
    host=Config.DB_HOST, port=Config.DB_PORT,
    user=Config.DB_USER, password=Config.DB_PASSWORD,
    database=Config.DB_NAME,
)
```
*(Requiere resolver 4.1: no construir el pool con credenciales por defecto.)*

---

### 4.14 [MEDIO] Filtrado en Python sobre `listar_todas()`

**Evidencia.**
```python
# controllers/panel_controller.py:60
for s in SolicitudModel.listar_todas():
    if s['estado'] != 'pendiente':
        continue
# controllers/panel_controller.py:113
for s in SolicitudModel.listar_todas():
    if s['id_espacio'] not in ids:
        continue
```

**Impacto.** Se trae **toda** la tabla de solicitudes al proceso de Python para descartar la mayoría. Coste O(n) de red y memoria por petición; empeora linealmente con el uso.

**Cómo mejorarlo.** Filtrar en SQL:
```python
# models/solicitud_model.py
@staticmethod
def listar_pendientes():
    with db_cursor(dictionary=True) as cur:
        cur.execute(SolicitudModel._consulta_base() +
                    " WHERE s.estado = 'pendiente'")
        return lista(cur.fetchall())

@staticmethod
def listar_por_espacios(ids):
    if not ids:
        return []
    marcadores = ','.join(['%s'] * len(ids))
    with db_cursor(dictionary=True) as cur:
        cur.execute(SolicitudModel._consulta_base() +
                    f" WHERE s.id_espacio IN ({marcadores})", tuple(ids))
        return lista(cur.fetchall())
```
```python
# panel_controller (admin)
for s in SolicitudModel.listar_pendientes(): ...
# panel_controller (docente)
for s in SolicitudModel.listar_por_espacios(ids): ...
```

---

### 4.15 [MEDIO] Listados sin paginación

**Evidencia.** `ClienteModel.listar()` (`:181-202`), `SolicitudModel.listar_todas()` (`:91-107`), `EspacioModel.listar()` (`:106-121`), `EventoModel.listar()` (`:99-117`) no limitan filas. `GET /api/clientes` devuelve todos los usuarios.

**Impacto.** Crecimiento no acotado de payload y memoria; degradación progresiva del panel.

**Cómo mejorarlo.** Añadir `LIMIT`/`OFFSET` (o *cursor* por `id`) y parámetros `?page=`/`?per_page=` en los endpoints de listado. Empezar por `/api/clientes` y `/api/solicitudes`, que son los que crecen.

---

### 4.16 [MEDIO] Sin índices en `solicitudes`

**Evidencia.** El esquema (`database/conexion.py:103-122`) define PK y FKs, pero `ocupacion()` (`solicitud_model.py:189-215`) filtra por `estado`, `fecha_uso`, `id_espacio` y `tipo`, columnas sin índice compuesto.

**Impacto.** Los calendarios y la validación de disponibilidad harán *full scans* a medida que crezcan las solicitudes.

**Cómo mejorarlo.** En una migración:
```sql
CREATE INDEX idx_solicitudes_espacio_fecha ON solicitudes (id_espacio, fecha_uso);
CREATE INDEX idx_solicitudes_estado_fecha  ON solicitudes (estado, fecha_uso);
CREATE INDEX idx_eventos_fecha            ON eventos_institucionales (fecha_inicio, fecha_fin);
```
Verificar con `EXPLAIN` antes/después.

---

### 4.17 [ALTO] Cero pruebas automatizadas

**Evidencia.** No existe carpeta de tests ni dependencias de testing; `requirements.txt` solo lista Flask y mysql-connector.

**Impacto.** Cada cambio es una regresión potencial; no hay red de seguridad para refactors (justo los que este plan propone).

**Cómo mejorarlo.** Empezar por lo más frágil: controladores y reglas de negocio (funciones puras, fáciles de testear).
```python
# tests/test_solicitud_controller.py
def test_horario_invalido():
    r = SolicitudController._validar(
        {'fecha_uso': '2026-01-01', 'hora_inicio': '10:00',
         'hora_fin': '09:00', 'nombre_actividad': 'Clase'})
    assert r[-1] is not None
```
Añadir a `requirements.txt` (o `requirements-dev.txt`): `pytest`, `pytest-cov`. Objetivo inicial: cubrir validaciones y control de acceso (roles).

---

### 4.18 [BAJO] Librería Pannellum vendorizada

**Evidencia.** `static/pannellum/` contiene la librería 2.5.7 completa (JS/CSS/zip/imágenes) mezclada con el código propio. Representa ~50 de 257 nodos del grafo.

**Impacto.** Infla el repositorio y las métricas de análisis; dificulta distinguir código propio de terceros.

**Cómo mejorarlo.** Moverla a `static/vendor/pannellum/` (o instalarla vía CDN/gestor) y **excluirla del análisis** de graphify. Documentar su versión.

---

### 4.19 [BAJO] Import dentro de función

**Evidencia.** `routes/evento_routes.py:12`: `from models.evento_model import EventoModel` dentro de la vista, mientras el resto de rutas importan a nivel de módulo.

**Impacto.** Inconsistencia de estilo; oculta dependencias.

**Cómo mejorarlo.** Subir el import al encabezado del archivo.

---

### 4.20 [BAJO] README de 5 líneas

**Evidencia.** `README.md` solo tiene el nombre del proyecto y un enlace a SharePoint.

**Impacto.** Un nuevo integrante (o agente) no puede levantar el proyecto sin leer todo el código.

**Cómo mejorarlo.** Añadir: requisitos, variables de entorno, pasos de instalación/ejecución, comando `flask init-db`, estructura de carpetas y mapa de endpoints.

---

### 4.21 [MEDIO] Cabeceras de seguridad ausentes

**Evidencia.** No se configura ninguna cabecera (CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`). Los templates cargan recursos de CDN (`fonts.googleapis.com`, `cdnjs.cloudflare.com`).

**Impacto.** Sin CSP no hay defensa en profundidad contra XSS; sin `X-Frame-Options` la app puede embeberse en un iframe (clickjacking).

**Cómo mejorarlo.** Añadir `flask-talisman` o un `after_request`:
```python
@app.after_request
def cabeceras(resp):
    resp.headers['X-Content-Type-Options'] = 'nosniff'
    resp.headers['X-Frame-Options'] = 'DENY'
    resp.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    resp.headers['Content-Security-Policy'] = (
        "default-src 'self'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; "
        "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; "
        "script-src 'self'; img-src 'self' data:;"
    )
    return resp
```
> El frontend usa `innerHTML` intensivamente pero escapa con `esc()`; una CSP estricta con `script-src 'self'` reduce el riesgo residual de un escape omitido. **No** habilitar `unsafe-inline` en `script-src`.

---

## 5. Plan de mejora por fases

### Fase 1 — Seguridad crítica (1-2 días)
- [ ] 4.1 Sacar secretos a `.env`; `validar_config()` al arranque; `.env` en `.gitignore`.
- [ ] 4.2 Añadir `CSRFProtect` + token en `fetch`.
- [ ] 4.3 Endurecer cookies de sesión (`Secure`, `HttpOnly`, `SameSite`).
- [ ] 4.5 `debug` por variable de entorno.
- [ ] 4.4 Rate limiting en login.
- [ ] 4.6 Mover `init_db()` a `flask init-db`.

**Resultado:** la app deja de tener vulnerabilidades críticas y el arranque es seguro.

### Fase 2 — Base de datos y rendimiento (2-4 días)
- [ ] 4.13 Pool de conexiones + `db_cursor()`.
- [ ] 4.7 Propagar errores de BD con manejador global.
- [ ] 4.12 Refactor de los 37 puntos de acceso a datos.
- [ ] 4.14 Filtrar en SQL (quitar bucles sobre `listar_todas()`).
- [ ] 4.16 Índices en `solicitudes` y `eventos`.
- [ ] 4.15 Paginación en listados.

**Resultado:** menos conexiones, menos datos transferidos, consultas con índice.

### Fase 3 — Correctitud y esquema (2-3 días)
- [ ] 4.8 Parseo de fecha/hora con `datetime`.
- [ ] 4.9 Logout por POST + `@login_required`.
- [ ] 4.10 Política de contraseñas más fuerte.
- [ ] 4.11 Migraciones versionadas; regenerar/eliminar el `.sql` obsoleto.
- [ ] 4.21 Cabeceras de seguridad / CSP.

### Fase 4 — Calidad y mantenibilidad (continuo)
- [ ] 4.17 Suite de tests (pytest) de controladores y control de acceso.
- [ ] 4.18 Mover Pannellum a `static/vendor/`.
- [ ] 4.19 Unificar imports.
- [ ] 4.20 Ampliar README.
- [ ] Configurar CI (lint + tests) y `gunicorn` para producción.

---

## 6. Cómo verificar cada mejora

| Cambio | Verificación |
|---|---|
| Secretos | Arrancar sin `.env` → debe fallar con mensaje claro; con `.env` → arranca |
| CSRF | `POST` sin token → 400; con token → OK |
| Cookies | DevTools → Application → Cookies: `Secure`, `HttpOnly`, `SameSite=Lax` |
| Rate limit | 11 intentos de login en <15 min → 429 |
| `debug` | Respuesta de error sin *stack trace*; `app.debug is False` |
| `init_db` | `python -c "import app"` ya no toca MySQL; `flask init-db` sí |
| Errores BD | Parar MySQL → endpoint devuelve 503 JSON, no lista vacía |
| Pool | `SHOW PROCESSLIST` estable bajo carga; sin agotamiento |
| Filtros SQL | `EXPLAIN` muestra uso de índice; sin `SELECT` de tabla completa |
| Índices | `EXPLAIN` pasa de `ALL` a `ref`/`range` |
| Tests | `pytest` en verde; cubren validaciones y roles |

---

## 7. Anexo — Tabla resumen

| Severidad | IDs |
|---|---|
| **Crítica** | 4.1, 4.2, 4.6 |
| **Alta** | 4.3, 4.4, 4.5, 4.7, 4.11, 4.13, 4.17 |
| **Media** | 4.8, 4.9, 4.10, 4.12, 4.14, 4.15, 4.16, 4.21 |
| **Baja** | 4.18, 4.19, 4.20 |

> **Recomendación de arranque:** ejecutar la **Fase 1** completa antes de cualquier despliegue público. Los puntos 4.1, 4.2 y 4.6 son bloqueantes: sin ellos la aplicación no debe exponerse a Internet.

---

*Documento generado con las skills `code-review-and-quality`, `security-and-hardening` y `performance-optimization`, a partir de la revisión directa del código en la rama `revision`.*
