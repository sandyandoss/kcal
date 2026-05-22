@echo off
echo.
echo  Starting Kcal...
echo.

start "Kcal Backend" cmd /k "cd /d "%~dp0backend" && node --no-warnings src/index.js"
start "Kcal Frontend" cmd /k "cd /d "%~dp0frontend" && python -m http.server 5500"

ping -n 4 127.0.0.1 > nul

start http://localhost:5500

echo  Kcal is running at http://localhost:5500
echo  Close the two server windows to stop.
echo.
