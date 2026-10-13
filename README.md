# ISAILO MAPS

Aplicación local para consultar espacios del instituto y gestionar solicitudes y eventos.

## Requisitos

- Python 3.10 o posterior.
- XAMPP con MySQL (MariaDB) iniciado.

## Instalar dependencias e iniciar

Abre PowerShell y entra a la carpeta que contiene `app.py`:

```powershell
cd "C:\Users\juanb\Downloads\Proyecto-sena--main (2)\Proyecto-sena--main"
python -m pip install -r requirements.txt
python app.py
```

Si ya estás en la carpeta exterior `Proyecto-sena--main (2)`, entra a la carpeta interior antes de iniciar:

```powershell
cd .\Proyecto-sena--main
python app.py
```

Luego abre <http://127.0.0.1:5000> en el navegador. En XAMPP, inicia MySQL antes de iniciar sesión para que las funciones que usan la base de datos estén disponibles.

La configuración de conexión se puede cambiar con las variables `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` y `DB_NAME`. Sus valores predeterminados están en `config.py`.
