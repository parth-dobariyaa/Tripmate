@echo off
setlocal
cd /d "%~dp0"

start "TripMate Server" /min cmd /c "node server.js"
timeout /t 2 /nobreak >nul

where msedge.exe >nul 2>nul
if %errorlevel%==0 (
  start "" msedge.exe --app=http://localhost:3000/
  exit /b 0
)

where chrome.exe >nul 2>nul
if %errorlevel%==0 (
  start "" chrome.exe --app=http://localhost:3000/
  exit /b 0
)

start "" http://localhost:3000/
echo TripMate is running at http://localhost:3000/
echo Keep this window open while using TripMate.
pause
