#!/bin/sh
# Import a SQL backup into the running MySQL container.
#   scripts/database/restore.sh backup/kiddoquest.sql
# Start MySQL first. The file replaces tables in both databases.
set -eu

if [ "$#" -ne 1 ] || [ ! -f "$1" ]; then
  echo "Usage: scripts/database/restore.sh backup/kiddoquest.sql" >&2
  exit 1
fi

case "$1" in
  /*) src=$1 ;;
  *) src=$(pwd)/$1 ;;
esac

root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
cd "$root"

if [ -z "$(docker compose ps -q mysql)" ]; then
  echo "MySQL is not running. Start it with: docker compose up -d mysql" >&2
  exit 1
fi

if [ -n "$(docker compose ps -q openid farm nginx)" ]; then
  echo "Warning: login, farm, or nginx is still running. Import replaces their tables." >&2
fi

docker compose cp "$src" mysql:/tmp/kiddoquest-import.sql
docker compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" --default-character-set=utf8mb4 < /tmp/kiddoquest-import.sql'
docker compose exec -T mysql rm -f /tmp/kiddoquest-import.sql
echo "Imported $1"
echo "Start the rest with: docker compose up -d"
