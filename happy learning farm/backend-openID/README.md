# backend-openid

通用的 OpenID Connect 登录服务。它只负责确认「这是谁」，不保存农场进度。开心农场和其他游戏都可以调用同一组接口。

## 登录怎么工作

1. 游戏在浏览器里用 Google Identity Services 取得 **ID Token**。
2. 游戏把令牌交给 `POST /api/v1/auth/login`。
3. 服务用 Google 公布的签名公钥核对该令牌的签名、签发方、过期时间和受众（`GOOGLE_CLIENT_ID`）。
4. 同一个已验证邮箱只绑定一个账号，绑定后不能改到别的账号。另一个邮箱登录会进入另一个账号。
5. 服务签发自己的访问令牌。农场 API 只认这枚令牌，不再接触 Google 令牌。

这里不使用 Google 客户端密钥，也不把密钥写进源码。浏览器只拿得到公开的 Client ID。

## 接口

| 方法 | 路径 | 作用 |
|---|---|---|
| `POST` | `/api/v1/auth/login` | `{ "provider": "google", "idToken": "..." }` → 访问令牌和内部用户 |
| `GET` | `/api/v1/auth/me` | 当前用户的内部 ID 和显示名。需要 `Authorization: Bearer` |
| `GET` | `/api/v1/auth/providers` | 当前启用的身份提供方，目前是 `google` |
| `GET` | `/actuator/health` | 健康检查 |

交互式文档：`http://localhost:8080/swagger-ui.html`

返回的用户对象有 `id`、`displayName` 和已绑定的 `email`。邮箱不放进访问令牌。农场接口只认内部用户 ID。

## 接入另一个身份提供方

新增一个 Spring Bean，实现 `com.kiddoquest.openid.provider.IdentityProvider`：

- `providerId()` 返回短名字，例如 `apple`。
- `verify(idToken)` 在服务端核验该提供方的身份令牌，返回 `VerifiedIdentity`。

登录请求里的 `provider` 会选择这个 Bean。农场代码不用跟着改。

## 本地运行

在 `backend-openID/backend` 目录：

```powershell
$env:AUTH_JWT_SECRET = "change-me-to-a-long-random-string-32b"
$env:GOOGLE_CLIENT_ID = "你的公开 Client ID"
mvn spring-boot:run
```

`AUTH_JWT_SECRET` 至少 32 字节，并且必须和 `backend-data` 使用同一个值。未设置时进程会拒绝启动。

Google Cloud Console 里创建一个 **Web** 客户端，把 `https://jd-xia.github.io` 加进 Authorized JavaScript origins。把同一个 Client ID 写进游戏的 `common/cloud-config.js`（这是公开标识，不是密钥）。

数据库是 MySQL 库 `kiddoquest_openid`。`docker compose up` 会启动 MySQL，数据在卷 `mysql-data` 里。不要用 `docker compose down -v`，那会删掉这个卷。

本机单独运行时，先有一个 MySQL，再设置：

```powershell
$env:OPENID_DB_URL = "jdbc:mysql://localhost:3306/kiddoquest_openid?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
$env:OPENID_DB_USERNAME = "root"
$env:OPENID_DB_PASSWORD = "kiddoquest-local"
mvn spring-boot:run
```

打包：

```powershell
mvn -q -DskipTests package
java -jar target/backend-openid-1.0.0-SNAPSHOT.jar
```

变量写在进程环境里。服务不会自动加载 `.env` 文件。用 Docker Compose 时，写在游戏目录的 `.env`（见同目录 `.env.example`）。

两个服务一起启动时，在游戏目录执行：

```powershell
docker compose up --build
```

游戏页面在 GitHub Pages 上。登录和农场 API 从 `http://localhost:8000` 进入。Nginx 只把 `/api/v1/auth/` 转到认证服务，不提供页面。密钥和 Google Client ID 可写在游戏目录的 `.env`（见 `.env.example`）。未提供密钥时，Compose 使用仅供本机的默认值。

## 测试

```powershell
mvn test
```

测试使用内存数据库，并替掉 Google 的网络验签，所以不会访问 Google。
