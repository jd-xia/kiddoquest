#!/bin/sh
# Backup both MySQL databases to backup/kiddoquest-<time>.sql
#   scripts/database/backup.sh
#   scripts/database/backup.sh jenkins
# MySQL must already be running. The password is read inside the container.
set -eu
root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
cd "$root"

tag="${1:-}"
suffix=""
if [ "$tag" = "jenkins" ]; then suffix="-jenkins"; fi

if [ -z "$(docker compose ps -q mysql)" ]; then
  echo "MySQL is not running. Start it with: docker compose up -d mysql" >&2
  exit 1
fi

name="kiddoquest-$(date +%Y-%m-%d-%H%M)${suffix}.sql"
mkdir -p backup

docker compose exec -T mysql sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --databases kiddoquest_openid kiddoquest_farm --single-transaction --routines --triggers --default-character-set=utf8mb4 --hex-blob --set-gtid-purged=OFF > /tmp/kiddoquest.sql 2>/tmp/dump.err' \
  || { docker compose exec -T mysql cat /tmp/dump.err; exit 1; }

docker compose cp mysql:/tmp/kiddoquest.sql "backup/$name"
docker compose exec -T mysql rm -f /tmp/kiddoquest.sql /tmp/dump.err

tail -n 1 "backup/$name" | grep -q 'Dump completed' || { echo "The backup looks incomplete: backup/$name" >&2; exit 1; }
echo "Backed up to backup/$name ($(wc -c < "backup/$name") bytes)"
