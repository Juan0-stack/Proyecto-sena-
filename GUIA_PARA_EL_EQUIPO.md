# Guía para el equipo

Esta guía se construye con lo que se ha revisado directamente en el proyecto. Se ampliará al simplificar más archivos.

## 1. Qué es ISAILO MAPS

ISAILO MAPS es una aplicación web del Instituto San Ignacio de Loyola. Permite consultar espacios, calendarios y eventos, y administrar información según el rol de cada usuario. Flask sirve las páginas y conecta las acciones con la base de datos MySQL.

## 2. Mapa de carpetas y archivos

| Archivo o carpeta | Para qué sirve |
|---|---|
| `app.py` | Inicia Flask, prepara la base de datos y registra las rutas. |
| `config.py` | Guarda la configuración de Flask y los datos de conexión a MySQL. |
| `requirements.txt` | Lista Flask y el conector de MySQL que necesita el proyecto. |
| `routes/` | Recibe las direcciones de páginas y solicitudes de la página. |
| `controllers/` | Valida las acciones y organiza la lógica de la aplicación. |
| `models/` | Consulta y actualiza los datos de MySQL. |
| `database/` | Abre la conexión y prepara las tablas de la base de datos. |
| `utils/` | Guarda funciones de apoyo, como la revisión de permisos. |
| `templates/` | Contiene las páginas HTML que Flask muestra. |
| `templates/partials/` | Contiene piezas compartidas, como el encabezado y el menú lateral. |
| `static/` | Contiene estilos, imágenes y JavaScript. |
| `static/js/motion.js` | Centraliza las animaciones y el desplazamiento suave de los paneles. |
| `static/panel.js` | Conecta los controles y secciones de los paneles. |

## 3. Cómo viaja una acción: iniciar sesión

1. La persona escribe sus datos en el formulario de `templates/login.html`.
2. `static/js/login.js` envía los datos a `/api/clientes/login`.
3. `routes/clientes_routes.py` recibe la solicitud y llama a `ClienteController.iniciar_sesion` en `controllers/controller.py`.
4. El controlador valida la cuenta y pide a `ClienteModel.verificar_credenciales`, en `models/cliente_model.py`, que revise la contraseña.
5. El modelo consulta MySQL mediante `database/conexion.py`.
6. Si los datos son válidos, el controlador guarda la sesión y devuelve la dirección del panel. `login.js` abre esa dirección.

## 4. Los roles

| Rol | Lo que muestran las rutas y los menús del proyecto |
|---|---|
| Administrador | Puede entrar al panel administrativo, que incluye la sección de gestión de roles. |
| Gestión de Calidad | Usa el panel administrativo con opciones limitadas; su menú no incluye gestión de roles. |
| Docente | Tiene un panel propio. Los datos de espacios se consultan para el usuario docente. |
| Estudiante | Su menú contiene Mapa y Calendario. |

Las rutas protegidas revisan el rol en el servidor mediante `utils/auth.py` y las rutas de `routes/clientes_routes.py`.

## 5. Recetas para cambios comunes

| Quiero cambiar… | Archivo que debo revisar |
|---|---|
| Los colores de los paneles | `static/css/tokens.css` |
| El texto de una página | La plantilla correspondiente dentro de `templates/` |
| El logo de la portada | `static/logo.png` y `templates/index.html` |
| El logo compartido de los paneles y logins | `templates/partials/logo.html` y la imagen que ese archivo carga |
| Un botón del menú lateral | El menú del rol en su plantilla y `templates/partials/panel_sidebar.html` |
| Crear un usuario | La sección de usuarios del panel administrativo |
| Una animación de un panel | `static/js/motion.js`; la plantilla puede marcar elementos con `data-reveal` |
| Poner el mapa público | El espacio `#mapa-container` de `templates/index.html` |

La portada también tiene estilos propios en `static/css.css`. Conviene revisar el selector exacto antes de cambiar un color.

## 6. Animaciones y efecto del título

`static/js/motion.js` reúne las animaciones que usan los paneles. Usa anime.js para las transiciones y Lenis para el desplazamiento suave cuando esas librerías están disponibles. Si la persona pide menos movimiento, el archivo muestra el contenido sin animaciones.

La portada usa otra animación escrita dentro de `templates/index.html`. En la portada actual, el título visible es el logo. No encontré archivos `techtext.js` ni `techtext.css` en `static/` durante esta revisión.

## 7. Glosario

| Palabra | Significado |
|---|---|
| Ruta | Dirección que recibe una página o una acción, por ejemplo `/login`. |
| Controlador | Código que valida una acción y decide qué resultado devolver. |
| Modelo | Código que consulta o modifica datos guardados. |
| Plantilla | Archivo HTML que Flask usa para mostrar una página. |
| Sesión | Datos que el servidor recuerda mientras la persona está identificada. |
| Cookie | Pequeño dato que el navegador guarda y envía al servidor; Flask la usa para reconocer la sesión. |
| Caché | Copia temporal que el navegador guarda para cargar algo más rápido. |
| Hash de contraseña | Resultado protegido que se guarda en vez de la contraseña original. |
| Endpoint | Dirección de una acción de la aplicación, normalmente una API. |
| Variable CSS | Nombre reutilizable para un color, tamaño u otro estilo. |
| Canvas | Área HTML donde JavaScript puede dibujar. |

## 8. Problemas frecuentes

- **La pantalla queda oscura:** revisa que carguen las hojas CSS y los archivos JavaScript del panel. Las plantillas tienen una salida de seguridad para dejar visible el contenido.
- **No aparece un botón del menú:** revisa la lista `menu` en la plantilla del rol y las opciones permitidas por la ruta del servidor.
- **No deja iniciar sesión:** revisa que MySQL esté activo, que la configuración de `DB_*` sea correcta y que la solicitud llegue a `/api/clientes/login`.
- **Aparecen letras raras:** las plantillas usan `UTF-8` y la base de datos se crea con `utf8mb4`; revisa que esos valores se conserven al editar.

## 9. Cómo ejecutar el proyecto

1. Instala y enciende MySQL.
2. Abre una terminal en la carpeta del proyecto.
3. Crea un entorno de Python y actívalo:

   ```text
   py -m venv .venv
   .venv\Scripts\activate
   ```

4. Instala las dependencias:

   ```text
   pip install -r requirements.txt
   ```

5. Si MySQL usa datos distintos a los valores predeterminados, configura `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` y `DB_NAME`.
6. Inicia la aplicación:

   ```text
   python app.py
   ```

7. Abre `http://127.0.0.1:5000/` en el navegador.

Al iniciar, `app.py` llama a `init_db()` para preparar la base de datos.
