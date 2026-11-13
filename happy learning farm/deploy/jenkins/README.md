# Jenkins：一键部署到本机 Docker

Jenkins 跑在本机 Docker 里，地址 http://localhost:18090 ，用户 `admin`，密码在 `deploy/jenkins/.env`（不提交到 git）。

## 启动 Jenkins

在 `deploy/jenkins` 文件夹里执行（第一次会下载并构建镜像，几分钟）：

```powershell
docker compose up -d --build
```

Jenkins 的设置（管理员、部署任务）都写在 `casc.yaml` 里，每次启动自动生效，不用走安装向导。数据在 `kiddoquest-jenkins_jenkins-home` 卷里。

## 部署

打开 http://localhost:18090 → 任务 **happy-learning-farm-deploy** → **Build with Parameters** → Build。

流水线就是项目根目录的 `Jenkinsfile`，每次运行都从项目文件夹现读，所以部署的是文件夹里**现在**的代码（包括还没提交的改动）。步骤：

1. **Check**：Docker 能用、compose 文件没错、Docker 能看到 `frontend` 文件夹。
2. **Test**（`RUN_TESTS`）：两个后端的测试，有一个失败就不部署。
3. **Back up database**（`BACKUP_DB`）：两个库导出到 `backup/kiddoquest-<时间>-jenkins.sql`。
4. **Keep previous images**：现在运行的四个镜像另存一份 `:previous` 标签。
5. **Build**、**Deploy**：`docker compose -p happylearningfarm build` 和 `up -d`。项目名和在项目文件夹里手动 `docker compose up` 一样，所以 MySQL 卷和数据都保留。
6. **Smoke test**：等 http://localhost:8080/api/v1/health 回应，再确认首页能打开。

## 回到上一个版本

部署出问题时，用 `:previous` 镜像重新启动（在项目根目录执行）：

```powershell
foreach($i in 'backend-mysql','backend-openidsec','backend-data','backend-gateway'){ docker tag "jiandao/kiddoquest-happy-learning-farm-$i:previous" "jiandao/kiddoquest-happy-learning-farm-$i:latest" }
docker compose up -d --no-build
```

数据库要回到部署前的样子，用 Back up database 那一步留下的 SQL 文件，按 `database_migration.md` 导入。

## 注意

- Jenkins 以 root 身份运行并挂载了 Docker socket，等于能控制这台电脑的 Docker。只在本机用，不要把 18090 端口开放到外网。
- 项目文件夹搬家后，改 `deploy/jenkins/.env` 里的 `HOST_PROJECT_DIR`（Docker Desktop 把 `C:\` 显示为 `/run/desktop/mnt/host/c`），再 `docker compose up -d`。
