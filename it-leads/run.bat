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

set LOCAL_IP=
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  set "candidate=%%a"
  set "candidate=!candidate: =!"
  if not "!candidate!"=="" if not "!candidate!"=="127.0.0.1" set LOCAL_IP=!candidate!
)

echo.
echo ============================================
echo   ON YOUR COMPUTER:  http://localhost:8080
if defined LOCAL_IP (
  echo   ON YOUR PHONE:     http://%LOCAL_IP%:8080
  echo.
  echo   Phone must use the address above - NOT localhost!
  echo   Same Wi-Fi required. If phone fails, run as Admin:
  echo   scripts\open-firewall-windows.bat
) else (
  echo   ON YOUR PHONE:     run ipconfig to find your IPv4 address
  echo                       then open http://YOUR-IP:8080
)
echo ============================================
echo.

python -m uvicorn server.main:app --host 0.0.0.0 --port 8080 --reload
pause
