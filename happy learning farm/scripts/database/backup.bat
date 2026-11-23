@echo off
setlocal
rem Backup both MySQL databases to backup\kiddoquest-<time>.sql
rem   scripts\database\backup.bat
rem   scripts\database\backup.bat jenkins
rem MySQL must already be running. The password is read inside the container.

set "ROOT=%~dp0..\.."
pushd "%ROOT%" || exit /b 1

set "MYSQL_ID="
docker compose ps -q mysql > "%TEMP%\kiddoquest-mysql-id.txt"
set /p MYSQL_ID=<"%TEMP%\kiddoquest-mysql-id.txt"
del "%TEMP%\kiddoquest-mysql-id.txt" 2>nul
if "%MYSQL_ID%"=="" (
  echo MySQL is not running. Start it with: docker compose up -d mysql
  popd
  exit /b 1
)

set "SUFFIX="
if /i "%~1"=="jenkins" set "SUFFIX=-jenkins"
for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd-HHmm"') do set "STAMP=%%I"
set "NAME=kiddoquest-%STAMP%%SUFFIX%.sql"
if not exist backup mkdir backup

set "SCRIPT=%TEMP%\kiddoquest-dump.sh"
> "%SCRIPT%" echo mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --databases kiddoquest_openid kiddoquest_farm --single-transaction --routines --triggers --default-character-set=utf8mb4 --hex-blob --set-gtid-purged=OFF ^> /tmp/kiddoquest.sql 2^> /tmp/dump.err

docker compose cp "%SCRIPT%" mysql:/tmp/kiddoquest-dump.sh
if errorlevel 1 (
  echo Could not copy the dump script into the container.
  popd
  exit /b 1
)
del "%SCRIPT%" 2>nul

docker compose exec -T mysql sh -c "tr -d '\r' < /tmp/kiddoquest-dump.sh | sh"
if errorlevel 1 (
  docker compose exec -T mysql cat /tmp/dump.err
  docker compose exec -T mysql rm -f /tmp/kiddoquest-dump.sh /tmp/kiddoquest.sql /tmp/dump.err
  echo mysqldump failed.
  popd
  exit /b 1
)

docker compose cp mysql:/tmp/kiddoquest.sql "backup\%NAME%"
if errorlevel 1 (
  echo Could not copy the dump out of the container.
  popd
  exit /b 1
)
docker compose exec -T mysql rm -f /tmp/kiddoquest-dump.sh /tmp/kiddoquest.sql /tmp/dump.err

set "TAIL="
for /f "usebackq delims=" %%L in ("backup\%NAME%") do set "TAIL=%%L"
echo %TAIL% | findstr /C:"Dump completed" >nul
if errorlevel 1 (
  echo The backup looks incomplete: backup\%NAME%
  popd
  exit /b 1
)

for %%F in ("backup\%NAME%") do echo Backed up to backup\%NAME% (%%~zF bytes)
popd
exit /b 0
