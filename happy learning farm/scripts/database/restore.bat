@echo off
setlocal
rem Import a SQL backup into the running MySQL container.
rem Replaces tables in kiddoquest_openid and kiddoquest_farm.
rem   scripts\database\restore.bat backup\kiddoquest.sql
rem Start MySQL first. Stop openid, farm, and nginx if anyone is playing.

if "%~1"=="" (
  echo Usage: scripts\database\restore.bat backup\kiddoquest.sql
  exit /b 1
)
if not exist "%~1" (
  echo SQL file not found: %~1
  exit /b 1
)
set "SRC=%~f1"

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

docker compose ps -q openid farm nginx > "%TEMP%\kiddoquest-busy.txt"
for %%A in ("%TEMP%\kiddoquest-busy.txt") do if %%~zA GTR 0 echo Warning: login, farm, or nginx is still running. Import replaces their tables. Stop them first if anyone is playing: docker compose stop openid farm nginx
del "%TEMP%\kiddoquest-busy.txt" 2>nul

docker compose cp "%SRC%" mysql:/tmp/kiddoquest-import.sql
if errorlevel 1 (
  echo Could not copy the SQL file into the container.
  popd
  exit /b 1
)

set "SCRIPT=%TEMP%\kiddoquest-import.sh"
> "%SCRIPT%" echo mysql -uroot -p"$MYSQL_ROOT_PASSWORD" --default-character-set=utf8mb4 ^< /tmp/kiddoquest-import.sql
docker compose cp "%SCRIPT%" mysql:/tmp/kiddoquest-import.sh
if errorlevel 1 (
  echo Could not copy the import script into the container.
  popd
  exit /b 1
)
del "%SCRIPT%" 2>nul

docker compose exec -T mysql sh -c "tr -d '\r' < /tmp/kiddoquest-import.sh | sh"
set "CODE=%ERRORLEVEL%"
docker compose exec -T mysql rm -f /tmp/kiddoquest-import.sh /tmp/kiddoquest-import.sql
if not "%CODE%"=="0" (
  echo Import failed.
  popd
  exit /b 1
)

echo Imported %~1
echo Start the rest with: docker compose up -d
popd
exit /b 0
