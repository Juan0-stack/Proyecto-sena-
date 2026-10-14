@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"
python.exe "%SCRIPT_DIR%app.py" %*
endlocal
