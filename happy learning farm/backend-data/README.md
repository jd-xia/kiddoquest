# backend-data

开心农场的后端。孩子档案、农场进度和同步都在这里，使用 Java 和 Spring Boot。身份认证不在这里实现；请求必须带 `backend-openid` 签发的访问令牌。

一个 Google 账号可以有最多 2 个孩子档案。档案之间分开存储，接口只会返回当前令牌名下的档案。

## 接口

基础地址 `http://localhost:8081`。除健康检查和 API 文档外，都要 `Authorization: Bearer`。

| 方法 | 路径 | 作用 |
|---|---|---|
| `GET` | `/api/v1/children` | 当前账号的孩子档案 |
| `POST` | `/api/v1/children` | 新建档案，可带上现有的本地 `player` |
| `GET` | `/api/v1/children/{id}` | 读取一个档案和存档 |
| `PATCH` | `/api/v1/children/{id}` | 修改名字、年级或形象 |
| `DELETE` | `/api/v1/children/{id}` | 删除档案和存档 |
| `POST` | `/api/v1/children/{id}/sync` | 手动同步 |
| `GET` | `/actuator/health` | 健康检查 |

交互式文档：`http://localhost:8081/swagger-ui.html`

### 同步请求

```json
{
  "idempotencyKey": "8-80-chars",
  "baseRevision": 1,
  "policy": "upload",
  "player": { }
}
```

`policy`：

- `upload`：只有 `baseRevision` 等于服务器当前版本时才写入。不一致时返回 `status: "conflict"`，服务器不改。
- `keep_local`：玩家确认后，用这台设备的存档覆盖服务器。
- `keep_server`：不写服务器，把服务器存档交回客户端。
- `merge`：玩家确认后按下面的规则合并再保存。

相同的 `idempotencyKey` 会得到第一次的结果，不会把同一次同步再记一遍。同步保存的是整份农场文档，服务器不会在文档之外再加一次金币或星星。

内容没变时返回 `unchanged`，版本号不变。

### 合并规则

- 金币、游戏时间、农场经验：保留较大的一份。
- 关卡星星和练习次数：每一关保留更好的记录。
- 装饰、已拥有的外观：取并集。
- 谷仓堆叠：每种保留较多的数量。
- 动物：两边都保留，每种最多 3 只。
- 同一块田、同一种作物：保留种下更早的那一株，浇过水就保持浇过。作物不同时，保留这台设备上的作物。
- 今天的任务：同一天取完成度较高的一份；不是同一天则保留日期较新的一份。
- 名字、年级、形象和正在穿的衣服：保留这台设备上的选择。

### 金币校验

学习金币每天最多 40。普通 `upload` 和 `merge` 不允许金币一下子超过「服务器已有金币 + 40 × 间隔天数 + 40」。超出时返回 `422`，服务器和（由游戏保证的）本机存档都不改。

玩家明确选择「保留这台设备」时，上限放宽到 20000，用来容纳长期离线游玩。第一次把一台设备的存档保存到新档案时，使用同样的 20000 上限。

非法的作物、过多的动物、未来的种植时间会被收紧或丢掉。孩子画的图片不在这份文档里，仍只留在浏览器的 IndexedDB。

## 本地运行

先启动 `backend-openid`。在 `backend-data/backend`：

```powershell
$env:AUTH_JWT_SECRET = "change-me-to-a-long-random-string-32b"
mvn spring-boot:run
```

密钥必须和认证服务相同。农场服务只验签，不能自己签发登录令牌。

默认数据库是 `./data/farm`。MySQL 使用 `--spring.profiles.active=mysql`，并设置 `FARM_DB_URL`、`FARM_DB_USERNAME` 和 `FARM_DB_PASSWORD`。

游戏页面由 Compose 提供，地址是 `http://localhost:8000`。不启动这两个服务时，游戏仍然可以离线玩。链接 Google 并打开孩子的农场后，页面大约每一分钟把该农场保存到这里；未登录时不会上传。

和认证服务一起启动：

```powershell
docker compose up --build
```

农场 API 与认证服务共用 `http://localhost:8000`。Nginx 把 `/api/v1/children` 转到农场服务。它会等认证服务健康检查通过后再启动，并使用同一个 `AUTH_JWT_SECRET`。

打包：

```powershell
mvn -q -DskipTests package
java -jar target/backend-data-1.0.0-SNAPSHOT.jar
```

## 测试

```powershell
mvn test
```

测试覆盖：未登录拒绝访问、六个档案上限、别人的档案不可见、版本冲突时不覆盖、相同幂等键不重复写入、金币暴增被拒绝、合并保留两边的进度。
