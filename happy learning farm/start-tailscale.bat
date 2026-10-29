@echo off
setlocal
rem Publish https://mvinb-2203.tail5e7276.ts.net on the public internet,
rem proxying to Nginx on this PC (port 8080).
rem Start the stack first: docker compose up -d
rem From cmd:         start-tailscale.bat
rem From PowerShell:  .\start-tailscale.bat
rem Do not use ./start-tailscale.bat in cmd. cmd treats "." as the command.

set "TS=%ProgramFiles%\Tailscale\tailscale.exe"
if not exist "%TS%" (
  echo Tailscale is not installed at "%TS%".
  exit /b 1
)

set "TSLOG=%TEMP%\happy-farm-tailscale-status.txt"
set "TRY=0"

:waitts
set /a TRY+=1
"%TS%" status >"%TSLOG%" 2>&1
if not errorlevel 1 goto ready
findstr /I /C:"starting" "%TSLOG%" >nul
if errorlevel 1 goto notconn
if %TRY% GEQ 8 goto stuck
echo Tailscale is still starting ^(%TRY%/8^)...
timeout /t 2 /nobreak >nul
goto waitts

:notconn
echo Tailscale is not connected. Sign in with: "%TS%" up
type "%TSLOG%"
exit /b 1

:stuck
echo Tailscale is stuck starting. From an Administrator PowerShell, run:
echo   Restart-Service Tailscale
echo Then run this script again.
type "%TSLOG%"
exit /b 1

:ready
"%TS%" funnel --bg http://127.0.0.1:8080
if errorlevel 1 exit /b 1

echo.
"%TS%" funnel status
endlocal
