# Import a SQL backup into the running MySQL container.
# Replaces tables in kiddoquest_openid and kiddoquest_farm.
#   .\scripts\database\restore.ps1 backup\kiddoquest.sql
# Start MySQL first. Stop openid and farm if players are online, then import, then:
#   docker compose up -d
param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$File
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")

if (-not (Test-Path -LiteralPath $File)) { throw "SQL file not found: $File" }
$src = (Resolve-Path -LiteralPath $File).Path

Set-Location $root
$id = docker compose ps -q mysql
if (-not $id) {
  throw "MySQL is not running. Start it with: docker compose up -d mysql"
}

$busy = @(docker compose ps -q openid farm nginx) | Where-Object { $_ }
if ($busy) {
  Write-Warning "Login, farm, or nginx is still running. Import replaces their tables. Stop them first if anyone is playing: docker compose stop openid farm nginx"
}

docker compose cp $src "mysql:/tmp/kiddoquest-import.sql"
if ($LASTEXITCODE -ne 0) { throw "Could not copy the SQL file into the container." }

docker compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" --default-character-set=utf8mb4 < /tmp/kiddoquest-import.sql'
$code = $LASTEXITCODE
docker compose exec -T mysql rm -f /tmp/kiddoquest-import.sql
if ($code -ne 0) { throw "Import failed." }

Write-Host "Imported $File"
Write-Host "Start the rest with: docker compose up -d"
