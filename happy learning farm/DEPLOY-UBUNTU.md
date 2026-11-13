# Deploy Happy Learning Farm on Ubuntu

How to run the whole stack (MySQL, OpenID, farm API, Nginx on 8080) and Jenkins on an Ubuntu computer, with the code from GitHub and the data from `backup/kiddoquest-2026-10-29-2101.sql`.

| Port | Service | Reached by | Tailscale |
|---|---|---|---|
| 8080 | Nginx: game and APIs | Everyone | **Funnel** (public https) |
| 22 | SSH | Only your tailnet devices | **Serve** |
| 13306 | MySQL | Only your tailnet devices | **Serve** |
| 18090 | Jenkins | Only your tailnet devices | **Serve** |

Funnel puts a port on the public internet. Serve shares it only with devices signed in to your own tailnet. Never funnel 22, 13306 or 18090: Jenkins runs as root with the Docker socket, so whoever gets into it controls the machine.

The folder name `happy learning farm` has spaces, so always quote it.

## 1. Tailscale: open 8080 with Funnel

```bash
sudo apt update && sudo apt install -y curl
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
tailscale status
sudo systemctl enable tailscaled
sudo systemctl start tailscaled
```

`tailscale up` prints a link; open it and sign in to your tailnet. `tailscale status` shows this machine's name. Its full name, `<name>.tail5e7276.ts.net`, is written `<host>` below.

In the Tailscale admin console, allow Funnel for this machine (Access controls → Funnel). Then:

```bash
sudo tailscale funnel --bg http://127.0.0.1:8080
```

The game will be at `https://<host>` once the services run (step 6). Until then the address answers with an error, which is expected.

Because the hostname is new:

1. In `frontend/common/cloud-config.js`, change `HMF_SERVICE` and the hostname check to `<host>`. Commit and push, so the GitHub Pages copy of the game calls this server.
2. In Google Cloud Console, open the OAuth client and add `https://<host>` to **Authorized JavaScript origins**. Without it, Google sign-in fails.

## 2. Tailscale: open 22, 13306 and 18090 with Serve

SSH needs an SSH server on the machine:

```bash
sudo apt install -y openssh-server
sudo systemctl enable --now ssh
```

Then share the three ports with your tailnet only:

```bash
sudo tailscale serve --bg --tcp 22 tcp://127.0.0.1:22
sudo tailscale serve --bg --tcp 13306 tcp://127.0.0.1:13306
sudo tailscale serve --bg --https 18090 http://127.0.0.1:18090
```

From another device signed in to your tailnet:

- SSH: `ssh <user>@<host>`
- MySQL: a client such as DBeaver or MySQL Workbench, host `<host>`, port `13306`, user `root`, password from `.env` (step 4).
- Jenkins: `https://<host>:18090/`

MySQL and Jenkins answer once they run (steps 5 to 7). The compose files bind 13306 and 18090 to `127.0.0.1`, so the LAN cannot reach them directly; only Serve can. Docker-published ports bypass `ufw`, which is why this matters.

Check or undo:

```bash
tailscale serve status
tailscale funnel status
sudo tailscale serve --tcp 22 off
sudo tailscale serve --tcp 13306 off
sudo tailscale serve --https 18090 off
```

Funnel and Serve settings survive reboots.

## 3. Install Docker

```bash
sudo apt install -y git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
sudo systemctl enable docker
```

Log out and back in (or reconnect over SSH), then check:

```bash
docker compose version
```

## 4. Download the source code

```bash
git clone https://github.com/jd-xia/kiddoquest.git ~/kiddoquest
cd ~/kiddoquest/"happy learning farm"
```

If the repository is private, sign in first with `gh auth login` or use a personal access token.

Create `.env` with the secrets:

```bash
cp .env.example .env && nano .env
```

- `AUTH_JWT_SECRET`: at least 32 characters, used by both backends. Generate one with `openssl rand -base64 48`.
- `MYSQL_ROOT_PASSWORD`: a strong password. MySQL keeps the password from its first start, so set it now, before step 5.
- `GOOGLE_CLIENT_ID`: leave as it is.

Never `git add` `.env`.

## 5. Start the database and import the latest backup

The backup comes with the clone: `backup/kiddoquest-2026-10-29-2101.sql`. It holds both databases, `kiddoquest_openid` (accounts) and `kiddoquest_farm` (children and farms).

```bash
cd ~/kiddoquest/"happy learning farm"
BACKUP=backup/kiddoquest-2026-10-29-2101.sql

# Start only MySQL and wait until it is ready
docker compose up -d --build mysql
until [ "$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q mysql)")" = healthy ]; do sleep 3; done; echo "MySQL is ready"

# Import the backup
docker compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD"' < "$BACKUP"

# Check the rows arrived
docker compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "SELECT COUNT(*) AS accounts FROM kiddoquest_openid.openid_user; SELECT COUNT(*) AS children FROM kiddoquest_farm.farm_child; SELECT COUNT(*) AS farms FROM kiddoquest_farm.farm_snapshot;"'
```

- A warning about using a password on the command line is normal. A line starting with `ERROR` means the import stopped. Running it again is safe: the file drops and recreates each table.
- This backup is from before Farm Chat. In step 6 the farm service adds the missing chat table and columns by itself. Each child gets its player number (P0000001…) the next time its farm syncs.

## 6. Stop the database, then bring up all services

```bash
cd ~/kiddoquest/"happy learning farm"
docker compose down
docker compose up -d --build
```

`docker compose down` keeps the data volume. Never add `-v`, which deletes it.

The first build takes a few minutes while Maven builds both backends. Then check:

```bash
docker compose ps
curl -fsS http://localhost:8080/api/v1/health
```

All four services should be `running` (MySQL, OpenID and farm `healthy`). The game is at `https://<host>` and, on this machine, `http://localhost:8080`.

## 7. Bring up Jenkins

```bash
cd ~/kiddoquest/"happy learning farm"/deploy/jenkins
cp .env.example .env && nano .env
```

In `deploy/jenkins/.env`:

- `JENKINS_ADMIN_PASSWORD`: a strong password for the user `admin`.
- `HOST_PROJECT_DIR`: the project folder's real path, for example `HOST_PROJECT_DIR=/home/<user>/kiddoquest/happy learning farm`. The `/run/desktop/mnt/host/...` form is only for Docker Desktop on Windows.

Jenkins builds links and redirects from its own address. Set it to the Serve address from step 2 in `deploy/jenkins/casc.yaml`, or the login page sends you to localhost:

```yaml
unclassified:
  location:
    url: "https://<host>:18090/"
```

Start it:

```bash
docker compose up -d --build
docker compose logs -f jenkins
```

The first build downloads Jenkins and the Docker CLI and takes a few minutes. When the log shows `Jenkins is fully up and running`, press Ctrl+C and open `https://<host>:18090/`. Sign in as `admin`. There is no setup wizard: the admin user and the deploy job come from `casc.yaml` on every start.

To deploy a new version later:

1. On the machine: `cd ~/kiddoquest && git pull`. The job builds the folder exactly as it is.
2. In Jenkins: job **happy-learning-farm-deploy** → **Build with Parameters** → Build.

The job runs the tests, backs up the database into `backup/kiddoquest-<time>-jenkins.sql`, keeps the running images as `:previous`, builds, deploys and checks that the game answers. Jenkins runs as root, so those backup files are owned by root.

If a deploy goes wrong, go back to the previous images (in the project folder):

```bash
for i in backend-mysql backend-openidsec backend-data backend-gateway; do docker tag "jiandao/kiddoquest-happy-learning-farm-$i:previous" "jiandao/kiddoquest-happy-learning-farm-$i:latest"; done
docker compose up -d --no-build
```

## Restore a backup again later

With everything running, stop the services that write to the database, import, and start them again:

```bash
cd ~/kiddoquest/"happy learning farm"
docker compose stop farm openid nginx
docker compose exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD"' < backup/<file>.sql
docker compose up -d
```

The import replaces the tables in both databases, so anything played since that backup is lost.
