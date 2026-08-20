@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo IT Maps Lead Generator - Windows
echo.

if not exist .env (
  echo Creating .env from .env.example...
  copy .env.example .env >nul
  echo Add your GOOGLE_MAPS_API_KEY to .env before searching.
)

where py >nul 2>nul
if %errorlevel%==0 (
  set PYTHON=py -3
) else (
  set PYTHON=python
)

if not exist .venv (
  echo Creating virtual environment...
  %PYTHON% -m venv .venv
  call .venv\Scripts\activate.bat
  python -m pip install --upgrade pip >nul
  pip install -r requirements.txt
) else (
  call .venv\Scripts\activate.bat
)

echo.
echo Starting server...
echo   Local:   http://localhost:8080
echo   Network: http://YOUR-PC-IP:8080  (for phone/tablet on same Wi-Fi)
echo.
python -m uvicorn server.main:app --host 0.0.0.0 --port 8080 --reload
pause
