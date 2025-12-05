@echo off
echo ================================================================================
echo INSTALACION DE DEPENDENCIAS PYTHON PARA RECONOCIMIENTO FACIAL
echo ================================================================================
echo.

REM Verificar si Python está instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python no esta instalado
    echo Por favor instala Python 3.8 o superior desde https://www.python.org/
    pause
    exit /b 1
)

echo [OK] Python encontrado:
python --version
echo.

REM Crear entorno virtual (opcional pero recomendado)
echo [1/3] Creando entorno virtual...
if not exist venv (
    python -m venv venv
    echo [OK] Entorno virtual creado
) else (
    echo [INFO] Entorno virtual ya existe
)
echo.

REM Activar entorno virtual
echo [2/3] Activando entorno virtual...
call venv\Scripts\activate.bat
echo.

REM Instalar dependencias
echo [3/3] Instalando dependencias (esto puede tomar varios minutos)...
python -m pip install --upgrade pip
pip install -r requirements.txt

echo.
echo ================================================================================
echo INSTALACION COMPLETADA
echo ================================================================================
echo.
echo Siguiente paso:
echo   python train_model_python.py
echo.
pause
