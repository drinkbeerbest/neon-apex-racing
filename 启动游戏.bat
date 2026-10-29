@echo off
setlocal
cd /d "%~dp0"
title NEON APEX - Game Launcher
color 0B

echo.
echo  ==========================================
echo    NEON APEX  -  MIDNIGHT CIRCUIT
echo  ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 goto missing_node

if not exist "node_modules\vite\bin\vite.js" (
  echo  First launch: installing game dependencies...
  echo  This may take a few minutes.
  echo.
  call npm install
  if errorlevel 1 goto install_failed
  echo.
)

echo  Starting the local game server...
echo  Your browser will open automatically.
echo.
echo  Keep this window open while playing.
echo  Close this window to stop the game.
echo.

call npm run dev -- --port 5173 --host 127.0.0.1 --open
if errorlevel 1 goto server_failed
exit /b 0

:missing_node
echo  Node.js was not found on this computer.
echo.
echo  Install Node.js 18 or newer, then run this file again:
echo  https://nodejs.org/
echo.
pause
exit /b 1

:install_failed
echo.
echo  Dependency installation failed.
echo  Check your network connection and try again.
echo.
pause
exit /b 1

:server_failed
echo.
echo  The game server could not start.
echo  Check the messages above for details.
echo.
pause
exit /b 1
