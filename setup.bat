@echo off
setlocal

echo.
echo ==========================================
echo 🎙️ WhisperHook Local Development Setup
echo ==========================================
echo.

echo [+] Installing Node.js dependencies...
call npm install

echo.
echo [+] Setting up Python environment...
if not exist "python-core\venv" (
    echo [i] Creating virtual environment in python-core\venv...
    python -m venv python-core\venv
)

echo.
echo [+] Installing Python requirements...
python-core\venv\Scripts\python -m pip install --upgrade pip
python-core\venv\Scripts\python -m pip install -r python-core\requirements.txt

echo.
echo ==========================================
echo ✅ Setup complete!
echo.
echo To start WhisperHook in development mode:
echo   npm run tauri dev
echo ==========================================
echo.

pause
