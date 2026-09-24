# Diagnóstico del grafo de conocimiento — ISAILO_MAPS

| Campo | Valor |
|---|---|
| Fecha | 2026-09-23 |
| Proyecto | Proyecto-sena- (ISAILO_MAPS) |
| Fuente | `graphify-out/GRAPH_REPORT.md`, `graphify-out/graph.json` |
| Herramienta | graphify 0.9.17 (skill 0.9.13) |
| Modo de extracción | `--code` (solo código, sin extracción semántica) |
| Rama | `revision` |
| Alcance | 24 archivos de código · 257 nodos · 675 aristas · 16 comunidades |

---

## 1. Resumen ejecutivo

El grafo confirma que **ISAILO_MAPS es una aplicación Flask clásica en capas** (`routes → controllers → models → database`) con un frontend JavaScript que concentra casi la mitad de la superficie de código. La estructura es coherente y **no se detectaron ciclos de importación**.

Los tres hallazgos que más condicionan el proyecto son:

1. **La capa de acceso a datos es el cuello de botella estructural.** `get_connection()` es el segundo nodo más conectado (42 aristas) y actúa como puente entre 7 de las 16 comunidades. Se invoca en **38 puntos** distintos de los 4 modelos, abriendo y cerrando una conexión nueva en cada operación (sin *pooling*).
2. **Casi la mitad del grafo no es código propio.** `static/panel.js` (71 nodos) y `static/pannellum/pannellum.js` (50 nodos, librería de terceros vendorizada) suman **121 de 257 nodos (~47%)**. La comunidad de mayor tamaño y menor cohesión (0.044) es, en realidad, la librería Pannellum completa, no un módulo del dominio.
3. **La capa de base de datos SQL no está representada.** `database/isailo_maps.sql` quedó fuera del grafo porque falta `tree_sitter_sql`, y `static/config.json` produjo 0 nodos. El esquema real (tablas, claves foráneas, roles) solo es visible indirectamente a través de `database/conexion.py`.

Adicionalmente, la verificación manual del código reveló riesgos de **seguridad** (secretos y credenciales con valores por defecto inseguros, `debug=True`), **efectos secundarios al importar** (`init_db()` en `app.py:14`) y **consultas ineficientes** (filtrado en Python sobre `listar_todas()`).

---

## 2. Alcance y metodología

### Qué se analizó
- Se ejecutó graphify en modo **code-only** (`--code`), por lo que la extracción fue **estructural (AST) y determinista**, sin costo de tokens.
- Se cubrieron **24 archivos de código**: Python del backend (`app.py`, `config.py`, `controllers/`, `models/`, `routes/`, `utils/`, `database/conexion.py`) y JavaScript del frontend (`static/panel.js`, `static/pannellum/pannellum.js`).

### Qué quedó fuera
| Categoría | Archivos | Motivo |
|---|---|---|
| Documentos | 28 | Excluidos por el modo `--code` |
| Imágenes | 18 | Excluidas por el modo `--code` |
| SQL | `database/isailo_maps.sql` | Falta el parser `tree_sitter_sql` |
| JSON | `static/config.json` | Producjo 0 nodos (sin estructura extraíble) |
| Plantillas | `templates/*.html` | HTML no cubierto por el AST actual |

> **Implicación:** el diagnóstico describe la lógica de aplicación, pero **no** el esquema de datos ni la capa de presentación HTML. Las conclusiones sobre persistencia se basan en el código Python que consume la base de datos.

### Distribución de nodos por archivo (top 10)
| Nodos | Archivo |
|---:|---|
| 71 | `static/panel.js` |
| 50 | `static/pannellum/pannellum.js` |
| 18 | `routes/clientes_routes.py` |
| 14 | `models/solicitud_model.py` |
| 13 | `models/cliente_model.py` |
| 11 | `models/espacio_model.py` |
| 10 | `models/evento_model.py` |
| 9 | `controllers/clientes_controller.py` |
| 7 | `controllers/panel_controller.py` |
| 7 | `controllers/solicitud_controller.py` |

---

## 3. Arquitectura reconstruida

El grafo dibuja un flujo unidireccional limpio:

```
app.py  (registra 5 blueprints)
   │
   ├── routes/*_routes.py      → capa HTTP (endpoints Flask)
   │        │
   │        └── controllers/*_controller.py  → validación y reglas de negocio
   │                 │
   │                 └── models/*_model.py   → SQL y acceso a datos
   │                          │
   │                          └── database/conexion.py → get_connection() → MySQL
   │
   └── config.py  (Config, leído por conexion.py)

static/panel.js  → frontend SPA (consume la API vía api())
static/pannellum/pannellum.js → visor panorámico de terceros
```

**Ciclos de importación:** ninguno detectado. La dirección `routes → controllers → models → database` se respeta sin excepciones, lo que es una señal positiva de disciplina arquitectónica.

**Concentración de poder:** los 5 blueprints se registran en `app.py:16-20`; `init_db()` se invoca en `app.py:14` (ver riesgo 8.2).

---

## 4. God nodes (nodos más conectados)

| # | Nodo | Aristas | Interpretación |
|---:|---|---:|---|
| 1 | `Ba()` | 49 | Función interna del visor **Pannellum** (librería de terceros). No es código propio. |
| 2 | `get_connection()` | 42 | **Acceso a datos.** Puente entre 7 comunidades; punto único de acoplamiento a MySQL. |
| 3 | `SolicitudModel` | 22 | Modelo central del dominio: las solicitudes cruzan espacios, usuarios y eventos. |
| 4 | `ClienteModel` | 19 | Usuarios/roles; usado por autenticación y por la validación de encargados. |
| 5 | `EspacioModel` | 18 | Espacios físicos; núcleo del catálogo. |
| 6 | `esc()` | 18 | Utilidad de escape del frontend (`panel.js`). |
| 7 | `lista()` | 18 | Normalizador de filas en `utils/formato.py`; usado por todos los modelos. |
| 8 | `api()` | 17 | Cliente HTTP del frontend; punto de entrada de todas las llamadas a la API. |
| 9 | `initBotones()` | 17 | Cablea los *event listeners* del panel (varias aristas INFERRED). |
| 10 | `initAcciones()` | 16 | Inicializa acciones de UI; también dispara recargas. |

**Lectura:** excluyendo `Ba()` (ajeno) y las utilidades de UI (`esc`, `api`, `initBotones`, `initAcciones`), los verdaderos ejes del dominio son **`get_connection` + los 3 modelos** (`Solicitud`, `Cliente`, `Espacio`). `EventoModel` no aparece en el top-10: es el módulo menos acoplado.

---

## 5. Análisis de comunidades

El grafo detectó **16 comunidades** (13 mostradas en el reporte, 3 delgadas omitidas).

| Comunidad | Tamaño | Cohesión | Etiqueta | Comentario |
|---|---:|---:|---|---|
| 0 | 45 | **0.044** | Panorama Viewer Library | **Anomalía**: librería Pannellum. Cohesión muy baja; no es módulo del proyecto. |
| 1 | 35 | 0.104 | Events & Dashboard | Controladores de eventos/panel + modelo de eventos. |
| 2 | 27 | 0.111 | Authentication & Clients | Autenticación, sesión y CRUD de clientes. |
| 3 | 20 | 0.205 | Space Booking Requests | Núcleo del negocio: solicitudes y ocupación. |
| 4 | 20 | 0.237 | Panel UI Modals | Modales y llamadas `api()` del frontend. |
| 5 | 18 | 0.176 | Space Management | CRUD de espacios. |
| 6 | 16 | 0.242 | Dashboard Rendering | Renderizado de paneles por rol. |
| 7 | 15 | 0.229 | Panel Navigation & Alerts | Menú, campaña de notificaciones y calendario. |
| 8 | 13 | 0.282 | Availability Calendar | Calendario operativo y validación de disponibilidad. |
| 9 | 12 | 0.273 | Client Data Access | `ClienteModel` + conexión a BD. |
| 10 | 11 | **0.400** | Dashboard Activity & Formatting | Actividad reciente + `utils/formato.py`. Bien cohesionada. |
| 11 | 7 | 0.333 | Spaces & Stats UI | Espacios y estadísticas del frontend. |
| 12 | 6 | **0.667** | App Bootstrap & DB | `app.py`, `config.py`, `conexion.py`. **La más cohesionada.** |
| 13 | 6 | 0.467 | Request Listing | Listados de solicitudes. |
| 14 | 5 | 0.400 | Panorama Camera Controls | Setters de cámara de Pannellum. |
| 15 | 1 | 1.000 | Utils Package Init | `utils/__init__.py` (nodo aislado). |

**Observaciones:**
- **Las comunidades más cohesionadas son las más pequeñas y "hoja"** (12, 13, 14): hacen una cosa. Las más grandes y difusas (0, 1, 2) son las que mezclan responsabilidades.
- **La comunidad 0 debe descartarse del análisis de diseño**: mide la calidad interna de Pannellum, no del proyecto. La pregunta del reporte "¿debería dividirse *Panorama Viewer Library*?" es un falso positivo.
- **Las comunidades 1 y 2 son las candidatas reales a refactor**: `Events & Dashboard` (0.104) y `Authentication & Clients` (0.111) mezclan controladores, modelos y rutas de dominios distintos.

---

## 6. Verificación de aristas inferidas (INFERRED)

El grafo marcó **18 aristas como INFERRED** (confianza 0.5). Se verificaron contra el código fuente: **las 18 son correctas**.

### 6.1 Acoplamiento controlador → modelo (11 aristas) — **VERIFICADAS**
| Origen | Destino | Evidencia |
|---|---|---|
| `ClienteController` | `ClienteModel` | `controllers/clientes_controller.py:3` |
| `EspacioController` | `ClienteModel` | `controllers/espacio_controller.py:1` |
| `EspacioController` | `EspacioModel` | `controllers/espacio_controller.py:2` |
| `EspacioController` | `SolicitudModel` | `controllers/espacio_controller.py:3` |
| `EventoController` | `EventoModel` | `controllers/evento_controller.py` |
| `PanelController` | `ClienteModel` | `controllers/panel_controller.py:3` |
| `PanelController` | `EspacioModel` | `controllers/panel_controller.py:4` |
| `PanelController` | `EventoModel` | `controllers/panel_controller.py:5` |
| `PanelController` | `SolicitudModel` | `controllers/panel_controller.py:6` |
| `SolicitudController` | `EspacioModel` | `controllers/solicitud_controller.py:5` |
| `SolicitudController` | `SolicitudModel` | `controllers/solicitud_controller.py:6` |

### 6.2 *Indirect calls* en `static/panel.js` (7 aristas) — **VERIFICADAS**
`initBotones()` registra *listeners* que referencian directamente las funciones destino:
`guardarEspacio` (`panel.js:1398`), `guardarUsuario` (`panel.js:1402`), `guardarEvento` (`panel.js:1406`), `enviarSolicitud` (`panel.js:1413`), `validarDisponibilidad` (`panel.js:1417`). Las aristas de `guardarEspacio`/`initAcciones` hacia `cargarResumen()` son consistentes con el patrón de "refrescar tras guardar".

> **Conclusión:** el 2.7% de aristas inferidas no introduce ruido; puede considerarse fiable. El 97.3% restante (657 aristas) es EXTRACTED, es decir, derivado directamente del AST.

---

## 7. Salud del grafo y calidad de datos

Diagnóstico de integridad (solo lectura) sobre la extracción:

| Métrica | Valor | Interpretación |
|---|---:|---|
| Nodos | 257 | — |
| Aristas crudas | 706 | — |
| Aristas candidatas válidas | 685 | — |
| Aristas con endpoint colgante | **21** | Llamadas a símbolos externos (Flask, `mysql.connector`, DOM). Esperado. |
| Aristas con endpoint faltante | 0 | Sin corrupción. |
| Auto-bucles | 0 | Sin corrupción. |
| Aristas colapsadas (mismo par) | **10** | Varias relaciones entre el mismo par de nodos (p. ej. `calls` + `method`). |
| Grupos de variantes de relación | 6 | Normal. |

### Alertas de cobertura
1. **`database/isailo_maps.sql` no analizado** — falta `tree_sitter_sql` (`pip install "graphifyy[sql]"`). La capa de datos queda ciega.
2. **`static/config.json` produjo 0 nodos** — puede ser un archivo de configuración sin estructura o vacío.
3. **3 comunidades delgadas (<3 nodos) omitidas** del reporte.
4. **`utils/__init__.py` es un nodo huérfano** (comunidad 15 de tamaño 1).

> **Veredicto:** el grafo es **íntegro** (0 endpoints faltantes, 0 auto-bucles). Las 21 aristas colgantes son normales en código que llama a librerías externas y no indican corrupción, pero sí recuerdan que el grafo **no incluye las dependencias externas**.

---

## 8. Hallazgos técnicos y riesgos

Estos hallazgos provienen de verificar el código real citado por el grafo. Se ordenan por severidad.

### 8.1 Seguridad
- **Secretos con valores por defecto inseguros.** `config.py:5` define `SECRET_KEY` con el literal `'isailo-maps-secret-key-2026'` si falta la variable de entorno; `config.py:9-10` usan `DB_USER='root'` y `DB_PASSWORD=''`. En producción esto permite falsificación de sesiones y acceso a la BD.
- **Administrador sembrado con contraseña fija.** `database/conexion.py:22-36` crea el usuario `admin` con la contraseña `isailo2026` (`_sembrar_admin`), sin forzar cambio.
- **`debug=True`.** `app.py:23` ejecuta Flask en modo depuración (consola interactiva expuesta si se despliega tal cual).

### 8.2 Arquitectura y ciclo de vida
- **`init_db()` con efectos secundarios al importar.** `app.py:14` ejecuta la creación de base de datos, tablas y *seeding* **al importar el módulo**. Esto impide testear, rompe entornos sin MySQL y mezcla arranque con esquema.
- **Esquema embebido en código.** Las tablas se definen en `database/conexion.py:53-146` en lugar de migraciones versionadas. No hay historial de cambios de esquema.
- **`get_connection()` devuelve `None` de forma silenciosa** ante error (`conexion.py:17-19`). Todos los modelos comprueban `if not conn: return []`, por lo que **un fallo de BD se degrada en una lista vacía** sin distinguir "no hay datos" de "error de conexión".

### 8.3 Rendimiento
- **Sin *pooling* de conexiones.** 38 llamadas a `get_connection()` (verificado por búsqueda) abren y cierran una conexión por operación. Bajo carga, esto agota conexiones de MySQL.
- **Filtrado en Python sobre tablas completas.** `controllers/panel_controller.py:60` y `:113` iteran `SolicitudModel.listar_todas()` para filtrar por estado/espacio en memoria, en lugar de usar `WHERE` en SQL. A escala, esto trae toda la tabla a la aplicación.

### 8.4 Mantenibilidad
- **Librería vendorizada pesada.** `static/pannellum/` incluye `pannellum-2.5.7.zip`, `pannellum.js` (50 nodos) e imágenes. Infla el grafo y las métricas, y no debería mezclarse con el código del dominio.
- **README mínimo** (`README.md`, 5 líneas, solo un enlace). Sin documentación de arquitectura ni de puesta en marcha.
- **Sin pruebas.** No existe carpeta de tests ni dependencias de testing (`requirements.txt` solo lista Flask y mysql-connector).
- **Dependencias mínimas:** `requirements.txt` fija `Flask==3.0.3` y `mysql-connector-python==8.4.0`.

---

## 9. Recomendaciones priorizadas

### Prioridad alta (seguridad / correctitud)
1. **Eliminar defaults inseguros**: exigir `SECRET_KEY`, `DB_USER` y `DB_PASSWORD` por variables de entorno; fallar al arrancar si faltan.
2. **Sacar `debug=True`** de `app.py:23`; controlarlo por variable de entorno.
3. **Forzar cambio de contraseña** del admin sembrado y no embeber credenciales en `_sembrar_admin`.
4. **Diferenciar error de BD de "sin datos"**: que `get_connection()` lance excepción o devuelva un resultado explícito en lugar de `None` silencioso.

### Prioridad media (arquitectura / rendimiento)
5. **Introducir un *pool* de conexiones** o un *context manager* único en `database/conexion.py`, y migrar los 38 puntos de uso.
6. **Mover `init_db()`** a un comando CLI (`flask init-db`) o migraciones (Alembic/Flyway); quitar el efecto secundario de `app.py:14`.
7. **Empujar los filtros a SQL**: reemplazar `listar_todas()` + filtrado en Python (`panel_controller.py:60,113`) por consultas con `WHERE`.
8. **Versionar el esquema** en migraciones a partir de `database/isailo_maps.sql`.

### Prioridad baja (calidad / tooling)
9. **Excluir `static/pannellum/`** del análisis de graphify (vendor) para que las métricas reflejen solo código propio; instalarlo como dependencia.
10. **Instalar `tree_sitter_sql`** y re-ejecutar el grafo para incorporar la capa de datos.
11. **Añadir tests** (pytest) para controladores y modelos; son los componentes con más lógica condicional.
12. **Ampliar el README** con arquitectura, variables de entorno y pasos de ejecución.

---

## 10. Preguntas que el grafo responde

Ordenadas por valor diagnóstico:

1. **¿Por qué `get_connection()` conecta 7 comunidades?** — Entre *betweenness* 0.073. Es el acoplamiento transversal del sistema: toda la persistencia pasa por ahí (ver §8.3).
2. **¿Por qué `SolicitudModel` conecta 5 comunidades?** — *Betweenness* 0.025. Las solicitudes son el dominio que cruza usuarios, espacios y eventos.
3. **¿Las relaciones inferidas de `SolicitudModel`/`ClienteModel`/`EspacioModel` son correctas?** — Sí; verificadas en §6.
4. **¿Debería dividirse *Panorama Viewer Library*?** — **Falso positivo**: es una librería de terceros (cohesión 0.044), no un módulo del proyecto. Se resuelve excluyéndola.
5. **¿Dónde está el mayor riesgo de refactor?** — Comunidades 1 (`Events & Dashboard`, 0.104) y 2 (`Authentication & Clients`, 0.111): baja cohesión + alto tamaño.

---

## Anexo — Métricas del grafo

```
Nodos:              257
Aristas:            675
Comunidades:        16  (13 mostradas, 3 delgadas omitidas)
EXTRACTED:          657  (97.3%)
INFERRED:            18  (2.7%)
AMBIGUOUS:            0
Ciclos de import:     0

Relaciones:
  calls            328
  contains         124
  method           111
  imports           49
  imports_from      45
  uses              11
  indirect_call      7

Cobertura:
  Archivos de código analizados:  24
  Documentos excluidos:           28
  Imágenes excluidas:             18
  SQL no analizado:                1  (falta tree_sitter_sql)
  JSON sin nodos:                  1  (static/config.json)

Salud:
  Aristas colgantes:  21  (símbolos externos)
  Aristas faltantes:   0
  Auto-bucles:         0
  Aristas colapsadas: 10
```

*Documento generado a partir de `graphify-out/GRAPH_REPORT.md` y verificado contra el código fuente en la rama `revision`.*
