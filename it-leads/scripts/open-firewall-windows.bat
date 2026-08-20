@echo off
echo Opening Windows Firewall for IT Lead Gen (port 8080)...
netsh advfirewall firewall delete rule name="IT Lead Gen 8080" >nul 2>nul
netsh advfirewall firewall add rule name="IT Lead Gen 8080" dir=in action=allow protocol=TCP localport=8080
if %errorlevel%==0 (
  echo Success — port 8080 is now allowed. Try opening the Network URL on your phone again.
) else (
  echo Failed. Run this script as Administrator: right-click → Run as administrator
)
pause
