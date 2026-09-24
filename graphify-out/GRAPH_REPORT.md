# Graph Report - .  (2026-09-23)

## Corpus Check
- Large corpus: 70 files · ~1,276,901 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 257 nodes · 675 edges · 16 communities (13 shown, 3 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Panorama Viewer Library
- Events & Dashboard
- Authentication & Clients
- Space Booking Requests
- Panel UI Modals
- Space Management
- Dashboard Rendering
- Panel Navigation & Alerts
- Availability Calendar
- Client Data Access
- Dashboard Activity & Formatting
- Spaces & Stats UI
- App Bootstrap & DB
- Request Listing

## God Nodes (most connected - your core abstractions)
1. `Ba()` - 49 edges
2. `get_connection()` - 42 edges
3. `SolicitudModel` - 22 edges
4. `ClienteModel` - 19 edges
5. `EspacioModel` - 18 edges
6. `esc()` - 18 edges
7. `lista()` - 18 edges
8. `api()` - 17 edges
9. `initBotones()` - 17 edges
10. `initAcciones()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `ClienteController` --uses--> `ClienteModel`  [INFERRED]
  controllers/clientes_controller.py → models/cliente_model.py
- `EspacioController` --uses--> `ClienteModel`  [INFERRED]
  controllers/espacio_controller.py → models/cliente_model.py
- `EspacioController` --uses--> `SolicitudModel`  [INFERRED]
  controllers/espacio_controller.py → models/solicitud_model.py
- `PanelController` --uses--> `ClienteModel`  [INFERRED]
  controllers/panel_controller.py → models/cliente_model.py
- `PanelController` --uses--> `EspacioModel`  [INFERRED]
  controllers/panel_controller.py → models/espacio_model.py

## Import Cycles
- None detected.

## Communities (16 total, 3 thin omitted)

### Community 1 - "Events & Dashboard"
Cohesion: 0.10
Nodes (12): EventoController, PanelController, _proximos_eventos(), EventoModel, resumen_admin(), actualizar_evento(), crear_evento(), eliminar_evento() (+4 more)

### Community 2 - "Authentication & Clients"
Cohesion: 0.11
Nodes (12): ClienteController, actualizar_cliente(), cambiar_estado_cliente(), home(), listar_clientes(), listar_docentes(), listar_roles(), login_cliente() (+4 more)

### Community 3 - "Space Booking Requests"
Cohesion: 0.21
Nodes (6): SolicitudController, SolicitudModel, ocupacion_espacio(), cambiar_estado_solicitud(), crear_solicitud(), ocupacion_mes()

### Community 4 - "Panel UI Modals"
Cohesion: 0.24
Nodes (20): abrirModal(), abrirModalEspacio(), abrirModalEvento(), abrirModalUsuario(), api(), cargarDocentes(), cargarEspacios(), cargarResumen() (+12 more)

### Community 5 - "Space Management"
Cohesion: 0.18
Nodes (6): EspacioController, EspacioModel, actualizar_espacio(), crear_espacio(), eliminar_espacio(), listar_espacios()

### Community 6 - "Dashboard Rendering"
Cohesion: 0.24
Nodes (16): alternarZonaSolicitudes(), badgeEstado(), badgeSol(), cargarEventos(), cargarPanel(), esc(), fmtFecha(), iconoPorTipo() (+8 more)

### Community 7 - "Panel Navigation & Alerts"
Cohesion: 0.23
Nodes (12): abrirCampana(), activarVista(), alternarFila(), aplicarContrasteChips(), decidirDesdeCampana(), eventosEnFecha(), initModales(), initTabs() (+4 more)

### Community 8 - "Availability Calendar"
Cohesion: 0.28
Nodes (13): abrirMiniCal(), abrirModalSolicitud(), cambiarMesOperativo(), cargarOcupacionOperativa(), dos(), hoyISO(), initBotones(), iso() (+5 more)

### Community 10 - "Dashboard Activity & Formatting"
Cohesion: 0.40
Nodes (4): _actividad(), fila(), lista(), normalizar()

### Community 11 - "Spaces & Stats UI"
Cohesion: 0.33
Nodes (7): accionesPorRol(), cargarSolicitudes(), espaciosFiltrados(), pintarEspacios(), pintarStatsMaestro(), refrescarDespuesDeCambio(), setText()

### Community 12 - "App Bootstrap & DB"
Cohesion: 0.67
Nodes (3): Config, init_db(), _sembrar_admin()

## Knowledge Gaps
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `get_connection()` connect `Client Data Access` to `Events & Dashboard`, `Authentication & Clients`, `Space Booking Requests`, `Space Management`, `Dashboard Activity & Formatting`, `App Bootstrap & DB`, `Request Listing`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `Ba()` connect `Panorama Viewer Library` to `Panorama Camera Controls`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `SolicitudModel` connect `Space Booking Requests` to `Events & Dashboard`, `Authentication & Clients`, `Space Management`, `Dashboard Activity & Formatting`, `Request Listing`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `SolicitudModel` (e.g. with `EspacioController` and `PanelController`) actually correct?**
  _`SolicitudModel` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `ClienteModel` (e.g. with `ClienteController` and `EspacioController`) actually correct?**
  _`ClienteModel` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `EspacioModel` (e.g. with `EspacioController` and `PanelController`) actually correct?**
  _`EspacioModel` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `Panorama Viewer Library` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._