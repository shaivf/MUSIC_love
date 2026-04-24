# PROJECT_DETAILS

## 1. 模块级详细说明

## 启动与应用装配模块

### 职责
- 启动 HTTP 服务
- 组装中间件、路由、错误处理

### 主要文件
- `backend/server.js`
- `backend/src/app.js`

### 核心逻辑
- `server.js`
  - 读取 `process.env.PORT`
  - `app.listen(PORT)` 启动服务
  - 监听 `SIGTERM` / `SIGINT` 执行优雅关闭
- `app.js`
  - `cors` 跨域配置
  - `express.json()` 与 `express.urlencoded()` 解析请求体
  - 挂载静态目录 `/uploads -> src/uploads`
  - 健康检查路由 `/health`
  - 挂载 API 路由：`/api/auth`、`/api/songs`、`/api/user`
  - 404 与全局错误中间件

### 依赖关系
- 依赖 `routes/*.js`
- 依赖 `cors`、`express`、`dotenv`

### 对外能力
- 提供 API 服务入口与统一异常返回

---

## 认证模块（Auth）

### 职责
- 注册、登录、登出
- 生成和校验 JWT
- 保护私有接口

### 主要文件
- `backend/src/routes/auth.js`
- `backend/src/controllers/authController.js`
- `backend/src/config/jwt.js`

### 核心逻辑
- `register`：校验参数 -> 检查冲突 -> 哈希密码 -> 写入 users
- `login`：校验参数 -> 查用户 -> 比对密码 -> 生成 token
- `authMiddleware`：解析 `Authorization` 头 -> 验证 token -> 注入 `req.user`

### 依赖模块
- `database.js`（查/写 users）
- `response.js`（统一返回）
- `bcryptjs`（密码哈希）
- `jsonwebtoken`（签发/验签）

### 对外能力
- 身份认证入口
- 供其他模块复用的鉴权中间件

---

## 歌曲模块（Songs）

### 职责
- 歌曲上传、查询、详情、编辑、删除
- 我的歌曲列表

### 主要文件
- `backend/src/routes/song.js`
- `backend/src/controllers/songController.js`
- `backend/src/middleware/upload.js`

### 核心逻辑
- 上传：鉴权 + multer 收文件 + 入库 `songs`
- 列表：支持搜索、分页、按上传者邮箱过滤
- 详情：读取歌曲并自增 `play_count`
- 编辑/删除：校验资源归属（只能操作自己上传的）

### 依赖模块
- `jwt.js`（鉴权）
- `database.js`（songs 查询）
- `helpers.js`（分页参数）

### 对外能力
- 提供歌曲资源 REST API

---

## 用户互动模块（User Domain）

### 职责
- 个人资料
- 播放历史
- 收藏
- 播放列表（含歌单歌曲关系）

### 主要文件
- `backend/src/routes/user.js`
- `backend/src/controllers/userController.js`

### 核心逻辑
- profile：查询/更新 users
- history：写入与查询 `play_history`
- favorites：写入/删除/查询 `favorites`
- playlists：CRUD `playlists` + 管理 `playlist_songs`

### 依赖模块
- `jwt.js`（所有 user 路由都鉴权）
- `database.js`（多表联查）
- `helpers.js`（分页、文本规范化）

### 对外能力
- 提供用户中心相关业务 API

---

## 数据库与工具模块

### 职责
- 建立连接池
- 启动时确保核心表存在
- 统一响应结构
- 统一参数解析

### 主要文件
- `backend/src/config/database.js`
- `backend/src/utils/response.js`
- `backend/src/utils/helpers.js`
- `backend/database/init.sql`

### 关键点
- 使用 `mysql2/promise` 的连接池（Pool）
- SQL 以参数化查询（`?` 占位符）为主，降低 SQL 注入风险
- 响应格式统一：`{ success, code, data, message }`

## 2. 接口/API 说明

基础前缀（由 `app.js` 挂载）：
- 认证：`/api/auth`
- 歌曲：`/api/songs`
- 用户：`/api/user`

统一响应结构（`response.js`）：
- 成功：`{ success: true, code, data, message }`
- 失败：`{ success: false, code, data, message }`

### POST /api/auth/register

- 功能：用户注册
- 请求体：

```json
{
  "email": "user@example.com",
  "password": "password123",
  "username": "user_name"
}
```

- 处理流程：
  1. 校验 email 格式与 password 长度（>=6）
  2. 检查 email 与 username 冲突
  3. bcrypt 哈希密码
  4. 插入 users
- 成功响应：201（`sendSuccess(..., 201)`）
- 常见错误：
  - 400：参数不合法
  - 409：邮箱或用户名冲突
  - 500：数据库异常

### POST /api/auth/login

- 功能：登录并获取 JWT
- 请求体：

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

- 响应 data：

```json
{
  "token": "<jwt>",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "user_name"
  }
}
```

- 常见错误：
  - 400：缺少 email/password
  - 404：邮箱未注册
  - 401：密码错误

### POST /api/auth/logout

- 功能：登出提示接口（服务端不维护 token 黑名单）
- 请求体：无
- 响应：`success=true`
- 说明：当前实现主要由前端删除本地 token 完成“退出登录”

### GET /api/songs

- 功能：歌曲列表（公开）
- Query：
  - `search`（可选，按 title/artist 模糊搜索）
  - `page`（可选）
  - `pageSize` 或 `limit`（可选）
  - `uploaderEmail`（可选，按上传者邮箱模糊过滤）
- 响应 data：`{ total, page, pageSize, limit, songs }`
- 业务逻辑：联表 `songs + users`，按 `created_at DESC`

### GET /api/songs/:id

- 功能：歌曲详情（公开）
- 逻辑：
  - 查歌曲
  - 若存在则 `play_count + 1`
- 常见错误：404（歌曲不存在）

### POST /api/songs

- 功能：上传歌曲（鉴权）
- Header：`Authorization: Bearer <token>`
- Content-Type：`multipart/form-data`
- 表单字段：
  - `audio`（必填，支持 `.mp3/.wav/.flac/.m4a`）
  - `cover`（可选，支持 `.jpg/.jpeg/.png/.gif`）
  - `title`（必填）
  - `artist`（必填）
  - `album`、`description`、`duration`（可选）
- 限制：单文件最大 50MB，最多 2 个文件
- 响应：返回新歌曲信息
- 常见错误：
  - 400：缺少音频/缺少必填字段/格式不合法
  - 401：未登录
  - 500：落盘或数据库异常

### PUT /api/songs/:id

- 功能：编辑歌曲（鉴权）
- 规则：只能编辑本人上传的歌曲
- 请求体可包含：`title, artist, album, description, duration`
- 常见错误：
  - 400：未提供任何可更新字段 / 字段非法
  - 403：非本人资源
  - 404：歌曲不存在

### DELETE /api/songs/:id

- 功能：删除歌曲（鉴权）
- 规则：只能删除本人上传的歌曲
- 常见错误：403/404

### GET /api/songs/user/songs

- 功能：获取当前用户上传歌曲（鉴权）
- Query：分页参数
- 响应 data：`{ total, page, pageSize, limit, songs, data }`

### GET /api/user/profile

- 功能：获取当前用户资料（鉴权）

### PUT /api/user/profile

- 功能：更新用户资料（鉴权）
- 支持字段：`email, username, avatar, bio`
- 特点：
  - 对 email 做格式校验
  - 对 username/email 做唯一性检查
  - 支持 avatar/bio 传 `null`

### GET /api/user/history

- 功能：查询播放历史（鉴权）
- Query：分页
- 响应 data：`{ total, page, pageSize, limit, history }`

### POST /api/user/history

- 功能：记录播放历史（鉴权）
- 请求体：`{ "song_id": 123 }`

### POST /api/user/favorites

- 功能：添加收藏（鉴权）
- 请求体：`{ "song_id": 123 }`
- 常见错误：
  - 404：歌曲不存在
  - 409：重复收藏（唯一键冲突）

### DELETE /api/user/favorites/:songId

- 功能：取消收藏（鉴权）

### GET /api/user/favorites

- 功能：收藏列表（鉴权）
- Query：分页

### GET /api/user/playlists

- 功能：查询当前用户歌单（鉴权）

### POST /api/user/playlists

- 功能：创建歌单（鉴权）
- 请求体：`{ "name": "xx", "description": "..." }`
- 错误：409（同名冲突）

### PUT /api/user/playlists/:playlistId

- 功能：更新歌单（鉴权）
- 请求体：可更新 `name` / `description`

### DELETE /api/user/playlists/:playlistId

- 功能：删除歌单（鉴权）

### GET /api/user/playlists/:playlistId/songs

- 功能：查询歌单内歌曲（鉴权）

### POST /api/user/playlists/:playlistId/songs

- 功能：向歌单加歌（鉴权）
- 请求体：`{ "song_id": 123 }`
- 错误：409（已存在）

### DELETE /api/user/playlists/:playlistId/songs/:songId

- 功能：从歌单移除歌曲（鉴权）

## 3. 数据模型说明

数据来源：`backend/database/init.sql` 与 `backend/src/config/database.js` 中建表 SQL。

### users

- 说明：用户主表
- 主要字段：
  - `id`（INT, PK, 自增）
  - `email`（VARCHAR(100), UNIQUE, NOT NULL）
  - `username`（VARCHAR(50), UNIQUE）
  - `password`（VARCHAR(255), NOT NULL，保存哈希）
  - `avatar`（VARCHAR(255), 可空）
  - `bio`（TEXT, 可空）
  - `is_active`（TINYINT(1), 默认1）
  - `created_at` / `updated_at`（时间戳）
- 索引：`idx_email`, `idx_username`, `idx_created_at`

### songs

- 说明：歌曲主表
- 主要字段：
  - `id`（PK）
  - `title`, `artist`（NOT NULL）
  - `album`, `description`（可空）
  - `duration`（INT, NOT NULL）
  - `cover`, `audio_url`（文件访问 URL）
  - `uploader_id`（FK -> users.id）
  - `play_count`, `download_count`, `is_public`
  - `created_at`, `updated_at`
- 约束/索引：
  - 外键 `uploader_id`
  - 普通索引：title/artist/created_at/uploader_id
  - 全文索引：`FULLTEXT idx_search (title, artist, album)`

### play_history

- 说明：用户播放历史
- 字段：`id`, `user_id`, `song_id`, `played_at`
- 关系：`user_id -> users.id`，`song_id -> songs.id`
- 索引：用户、歌曲、时间，以及联合索引 `(user_id, played_at)`

### favorites

- 说明：用户收藏关系
- 字段：`id`, `user_id`, `song_id`, `created_at`
- 关系：`user_id -> users.id`，`song_id -> songs.id`
- 约束：`UNIQUE(user_id, song_id)` 防重复收藏

### playlists

- 说明：用户歌单
- 字段：`id`, `user_id`, `name`, `description`, `created_at`, `updated_at`
- 关系：`user_id -> users.id`
- 约束：`UNIQUE(user_id, name)` 防同一用户同名歌单

### playlist_songs

- 说明：歌单-歌曲关系表（多对多）
- 字段：`id`, `playlist_id`, `song_id`, `added_at`
- 关系：
  - `playlist_id -> playlists.id`
  - `song_id -> songs.id`
- 约束：`UNIQUE(playlist_id, song_id)` 防同歌重复添加

### 专业词汇解释

- 主键（Primary Key）：唯一标识一条记录的字段。
- 外键（Foreign Key）：关联另一张表主键的字段，用于保证关系一致性。
- 索引（Index）：用于加速查询的数据结构。
- 唯一约束（Unique Constraint）：保证某列/组合值不重复。

## 4. 配置文件说明

## backend/.env

从代码读取到的关键配置项：

- `PORT`：后端监听端口
- `NODE_ENV`：运行环境（development/production）
- `DB_HOST` / `DB_USER` / `DB_PASSWORD` / `DB_NAME`：数据库连接
- `JWT_SECRET`：JWT 签名密钥（必须在生产环境使用强随机值）
- `JWT_EXPIRY`：token 过期时间，如 `7d`

在 `.env` 中还发现：`MAX_FILE_SIZE`, `UPLOAD_PATH`, `CORS_ORIGIN`，但在当前源码中未发现被读取的证据。

## backend/package.json

- 脚本：
  - `npm run dev`（nodemon）
  - `npm start`（node server.js）
  - `npm test`（vitest）
  - `npm run test:e2e`
- 说明：未定义 `lint` 脚本。

## backend/Dockerfile

- 多阶段构建（builder + runtime）
- runtime 安装 `dumb-init`（用于正确转发信号）
- 创建 uploads 目录
- 使用非 root 用户 `appuser`
- 健康检查命令请求 `/health`

## 根目录 docker-compose.yml

- `database`（MySQL）
- `backend`（Node API）
- `frontend`（Nginx 托管前端）
- 通过环境变量注入 DB 与 JWT 配置

## 根目录 docker-compose.prod.yml

- 生产扩展：资源限制、副本、备份、可选 nginx-proxy/prometheus

## 5. 鉴权与权限机制

## 登录与 token 生成

- 登录接口：`POST /api/auth/login`
- 成功后调用 `generateToken(payload)` 生成 JWT
- payload 包含：`id`, `email`, `username`

## token 校验

- 中间件：`authMiddleware`（`backend/src/config/jwt.js`）
- 从 `Authorization` 头提取 Bearer token
- `jwt.verify` 验签
- 验签通过后将用户信息写入 `req.user`

## 哪些接口需要鉴权

- `song.js`：除了 `GET /` 与 `GET /:id` 外，其他都需要
- `user.js`：全部都需要

## 权限不足处理

- 未携带 token 或 token 无效：401
- 操作非本人资源（如编辑/删除他人歌曲）：403

## 6. 错误处理机制

## 当前实现

- 控制器内 `try/catch`，失败时调用 `sendError`
- `app.js` 末尾提供全局错误中间件（兜底返回 500）
- 404 路由中间件统一处理未知路径

## 错误响应格式

```json
{
  "success": false,
  "code": 400,
  "data": null,
  "message": "错误信息"
}
```

## 常见错误码

- 400：参数错误
- 401：未认证或 token 无效
- 403：无权限
- 404：资源不存在
- 409：资源冲突（如重复收藏/重复用户名）
- 500：服务端异常

## 参数校验

- 主要在 Controller 中手写校验（字符串、数字、空值、长度）
- `express-validator` 已安装，但当前代码未发现实际使用

## 7. 日志机制

## 已实现

- 应用日志：`console.log` / `console.error`
- Docker/Compose 日志轮转：`json-file` + `max-size/max-file`
- 健康检查日志与错误堆栈输出

## 未实现

- 未发现结构化日志（如 JSON logger）
- 未发现日志分级配置（trace/debug/info/warn/error 的统一管理）
- 未发现集中式日志平台接入（ELK/Loki/Sentry）

## 8. 数据流与调用链（重点 5 条）

### 8.1 注册调用链

```text
POST /api/auth/register
  ↓ routes/auth.js -> authController.register
  ↓ 校验 email/password/username
  ↓ SELECT users 检查冲突
  ↓ bcrypt hash
  ↓ INSERT users
  ↓ sendSuccess(201)
```

### 8.2 登录调用链

```text
POST /api/auth/login
  ↓ routes/auth.js -> authController.login
  ↓ SELECT users by email
  ↓ bcrypt compare
  ↓ generateToken
  ↓ sendSuccess(token + user)
```

### 8.3 上传歌曲调用链

```text
POST /api/songs (multipart)
  ↓ routes/song.js
  ↓ authMiddleware（解析 JWT -> req.user）
  ↓ upload.fields（multer 落盘并校验）
  ↓ songController.upload
  ↓ INSERT songs
  ↓ sendSuccess(201)
```

### 8.4 收藏歌曲调用链

```text
POST /api/user/favorites
  ↓ authMiddleware
  ↓ userController.addFavorite
  ↓ SELECT songs（确认歌曲存在）
  ↓ INSERT favorites
  ↓ sendSuccess(201)
```

### 8.5 获取歌单歌曲调用链

```text
GET /api/user/playlists/:playlistId/songs
  ↓ authMiddleware
  ↓ userController.getPlaylistSongs
  ↓ SELECT playlists（校验归属）
  ↓ JOIN playlist_songs + songs
  ↓ sendSuccess({ playlist, songs })
```

## 9. 测试说明

测试文件：
- `backend/tests/jwt.test.js`
- `backend/tests/api.test.js`
- `backend/tests/e2e.flow.e2e.test.js`

### 使用框架
- Vitest（测试运行器）
- Supertest（HTTP 接口测试）

### 如何运行
- 单元/集成：`npm test`
- e2e：`npm run test:e2e`

### 已覆盖
- `/health`、404 返回
- JWT 生成/校验与中间件行为
- `GET /api/songs` 的 uploaderEmail 过滤（Mock DB）
- 端到端主链路：注册 -> 登录 -> 上传 -> 播放 -> 收藏 -> 清理

### 覆盖不足（按当前代码）
- 用户资料更新分支（冲突/非法参数）覆盖不足
- 播放列表 CRUD 全分支覆盖不足
- 上传失败分支（格式/大小/磁盘异常）覆盖不足

## 10. 部署说明

## Docker 支持
- 已支持，见 `backend/Dockerfile` 与 `docker-compose*.yml`

## CI/CD 支持
- 已发现：`.github/workflows/deploy.yml`
- 包含：后端测试、前端构建、镜像构建推送、安全扫描、可选 SSH 部署、通知

## 生产构建与启动
- 后端镜像通过 Dockerfile 构建
- 生产可通过 compose 启动：
  - `docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d`

## 关键环境变量（生产）
- `DB_HOST/DB_USER/DB_PASSWORD/DB_NAME`
- `JWT_SECRET`（高强度随机）
- `JWT_EXPIRY`
- `NODE_ENV=production`
- `PORT`

## 安全配置注意点
- 必须更换默认 JWT 密钥
- 建议最小权限数据库账号
- 上传目录要有权限控制与备份策略

## 11. 项目中的关键设计点

- 分层设计（Layered Architecture）：路由、控制器、数据访问职责分离。
- 中间件（Middleware）：在请求到业务逻辑前做通用处理（鉴权、上传解析）。
- 参数化查询（Prepared Statement）：用 `?` 占位防 SQL 注入。
- 统一响应封装：降低前端解析复杂度。
- 连接池（Connection Pool）：提升并发性能，减少频繁建连开销。
- 资源归属校验：通过 `uploader_id`/`user_id` 控制越权访问。

### 未发现实现（明确说明）
- DTO（数据传输对象）分层：未发现独立 DTO 文件，主要在 controller 直接处理 req/res。
- DAO/Repository 层：未独立抽象，controller 直接执行 SQL。
- 事务（Transaction）：未发现显式 `BEGIN/COMMIT/ROLLBACK`。
- 缓存/异步任务/消息队列：未发现相关实现。

## 12. 初学者常见疑问解答

### Q1：为什么要分 Route 和 Controller？
A：Route 负责“URL 到函数”的映射，Controller 负责业务处理。分开后结构更清晰，维护成本更低。

### Q2：为什么不直接在路由里写 SQL？
A：会导致路由臃肿、难测试。当前项目已把业务放进 controller，路由保持薄层。

### Q3：为什么密码不能明文存数据库？
A：数据库泄露时明文密码会直接暴露。使用 bcrypt 哈希后，即使泄露也难以逆推出原密码。

### Q4：Token 怎么证明身份？
A：服务端用 `JWT_SECRET` 对 payload 签名。客户端请求时携带 token，服务端验签通过才信任身份。

### Q5：一个请求是怎么找到对应代码的？
A：
- 先到 `app.js`（路由前缀）
- 再到 `routes/*.js`（具体路径）
- 再到 `controllers/*.js`（业务函数）

### Q6：数据库连接在哪里配置？
A：`backend/src/config/database.js`，读取 `.env` 的 `DB_*` 配置创建连接池。

### Q7：为什么有些 409 错误是数据库抛出来的？
A：因为使用了唯一约束（如 `favorites(user_id, song_id)`）。并发场景下由数据库最终保证一致性。

### Q8：README 里说有 `.env.example`，为什么找不到？
A：当前代码库中未发现该文件，属于文档与仓库状态不一致，需要你后续补齐模板文件。
