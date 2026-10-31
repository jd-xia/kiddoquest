# 数据库迁移

账号和农场存档都在 MySQL 里。换服务器时，不要拷贝 Docker 卷，导出一份 SQL，再在新机器上导入。

当前这份备份是 `backup/kiddoquest-2026-10-29.sql`。

两个库要一起带走：

| 库 | 谁在用 | 表 |
|---|---|---|
| `kiddoquest_openid` | 登录服务 | `openid_user`、`openid_identity` |
| `kiddoquest_farm` | data 应用 | `farm_child`、`farm_snapshot`、`farm_sync_receipt` |

只导入 `kiddoquest_farm` 时，新服务器上的登录账号对不上原来的存档。`mysql/init.sql` 只创建空库，不含数据。

这份 SQL 里有账号和存档。不要提交到 git，也不要发到公开的地方。

## 备份

在项目目录执行。MySQL 容器要处于运行状态（`docker compose ps` 里 `mysql` 是 healthy）。

```powershell
New-Item -ItemType Directory -Force -Path backup | Out-Null
docker compose exec -T mysql sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --databases kiddoquest_openid kiddoquest_farm --single-transaction --routines --triggers --default-character-set=utf8mb4 --hex-blob --set-gtid-purged=OFF > /tmp/kiddoquest.sql'
docker compose cp mysql:/tmp/kiddoquest.sql backup/kiddoquest.sql
docker compose exec -T mysql rm -f /tmp/kiddoquest.sql
```

密码从容器自己的环境变量读取，不用写进命令。`--single-transaction` 导出的是 InnoDB 的一份一致快照。

不要用 PowerShell 的 `>` 直接接 `docker exec`。那样得到的是 UTF-16 文件，导入会失败。上面的做法是先在容器里写成 UTF-8，再用 `docker compose cp` 拷出来。

`mysqldump` 可能打印一行 “Using a password on the command line interface can be insecure.” 这不影响文件。

## 导入到另一台服务器

把项目、`.env` 和 SQL 文件一起拷过去。新机器上的 `MYSQL_ROOT_PASSWORD` 要和 `.env` 里一致；导入命令用的是那台机器容器里的密码，不是旧机器的密码。

先只启动 MySQL，等它 healthy，再导入，最后启动其余服务：

```powershell
docker compose up -d mysql
docker compose cp backup/kiddoquest.sql mysql:/tmp/kiddoquest.sql
docker compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" < /tmp/kiddoquest.sql'
docker compose exec -T mysql rm -f /tmp/kiddoquest.sql
docker compose up -d
```

SQL 里有 `DROP TABLE IF EXISTS`。如果 data 应用或登录服务已经建过空表，导入会用备份里的表和数据替换它们。仍建议在这两个服务启动之前导入，避免导入时有请求正在写库。

导入之后可以用下面两句确认行还在：

```powershell
docker compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SELECT COUNT(*) AS users FROM kiddoquest_openid.openid_user; SELECT COUNT(*) AS children FROM kiddoquest_farm.farm_child;"'
```

## 语音聊天（Farm Chat）

若语音发不出去、服务器日志里有 `Data too long for column 'voice_data'`，在 MySQL 里把该列改成 `LONGTEXT`（新版本的 farm 服务启动时也会自动尝试改）：

```powershell
docker compose exec mysql mysql -uroot -pkiddoquest-local -e "ALTER TABLE kiddoquest_farm.farm_message MODIFY voice_data LONGTEXT;"
```

若 `.env` 里没导出变量，密码默认与 `docker-compose.yml` 里一致（常见为 `kiddoquest-local`）。改完后执行 `docker compose up -d --build farm` 并强制刷新浏览器（`hall.js` / `cloud.js` 带新版本号）。

## 不要做的事

`docker compose down` 会停容器，但 `mysql-data` 卷还在。`docker compose down -v` 会删掉这个卷，库就空了。换服务器时用 SQL 文件，不要靠删卷再重建。
