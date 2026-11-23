# Backup both MySQL databases to backup/kiddoquest-<time>.sql
# Run from anywhere:
#   .\scripts\database\backup.ps1
#   .\scripts\database\backup.ps1 jenkins
# MySQL must already be running (docker compose ps). The password is read inside the container.
param(
  [string]$Tag = ""
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $root

$id = docker compose ps -q mysql
if (-not $id) {
  throw "MySQL is not running. Start it with: docker compose up -d mysql"
}

$suffix = ""
if ($Tag -eq "jenkins") { $suffix = "-jenkins" }
$name = "kiddoquest-$(Get-Date -Format 'yyyy-MM-dd-HHmm')$suffix.sql"
New-Item -ItemType Directory -Force -Path (Join-Path $root "backup") | Out-Null

docker compose exec -T mysql sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --databases kiddoquest_openid kiddoquest_farm --single-transaction --routines --triggers --default-character-set=utf8mb4 --hex-blob --set-gtid-purged=OFF > /tmp/kiddoquest.sql 2>/tmp/dump.err'
if ($LASTEXITCODE -ne 0) {
  docker compose exec -T mysql cat /tmp/dump.err
  throw "mysqldump failed."
}

$dest = Join-Path $root "backup\$name"
docker compose cp "mysql:/tmp/kiddoquest.sql" $dest
if ($LASTEXITCODE -ne 0) { throw "Could not copy the dump out of the container." }
docker compose exec -T mysql rm -f /tmp/kiddoquest.sql /tmp/dump.err

$tail = Get-Content -LiteralPath $dest -Tail 1
if ($tail -notmatch "Dump completed") { throw "The backup looks incomplete: backup\$name" }
$bytes = (Get-Item -LiteralPath $dest).Length
Write-Host "Backed up to backup/$name ($bytes bytes)"
