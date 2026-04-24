# PROJECT_OVERVIEW

## 1. 项目简介

这个后端项目是一个音乐平台 API 服务，负责给前端提供“用户认证 + 歌曲管理 + 互动数据”的接口能力。

- 面向用户/场景：
  - 普通用户注册、登录后浏览与播放歌曲
  - 已登录用户上传歌曲、管理自己上传的歌曲
  - 用户维护收藏、播放历史、播放列表
- 解决的问题：
  - 统一存储用户与音乐数据（MySQL）
  - 通过 JWT（JSON Web Token，携带身份信息的签名令牌）识别登录用户
  - 对文件上传（音频/封面）进行类型与大小限制
- 核心功能：
  - 认证：注册、登录、退出
  - 歌曲：上传、列表、详情、编辑、删除、我的歌曲
  - 用户：个人资料、播放历史、收藏、播放列表

## 2. 技术栈总览

### 已使用

- 编程语言：JavaScript（Node.js 运行时）
- 后端框架：Express（Web 服务框架）
- 数据库：MySQL（关系型数据库）
- 数据访问层：`mysql2/promise` 直接写 SQL（无 ORM）
- 鉴权认证：JWT（`jsonwebtoken`）+ `Authorization: Bearer <token>`
- 密码加密：`bcryptjs`（哈希算法库）
- 文件上传：`multer`（multipart/form-data 解析与落盘）
- 跨域：`cors`
- 配置管理：`.env` + `dotenv`
- 测试：Vitest + Supertest
- 容器化：Dockerfile + docker-compose（含生产扩展 compose 文件）
- CI/CD：GitHub Actions（`.github/workflows/deploy.yml`）

### 未发现相关实现（按源码判断）

- ORM（对象关系映射）：未发现 Prisma/Sequelize/TypeORM 等
- 缓存：未发现 Redis/Memcached
- 消息队列：未发现 Kafka/RabbitMQ/Redis Stream
- 定时任务框架：未发现 node-cron / bull / agenda
- 专门日志库：未发现 Winston/Pino（当前主要是 `console.log/error`）
- 数据库迁移框架：未发现 Flyway/Knex migration（当前以 SQL 初始化脚本 + 启动时建表为主）

## 3. 项目目录结构说明

```text
backend/
├── server.js                    # 服务启动入口（监听端口、优雅关闭）
├── package.json                 # 依赖与脚本
├── .env                         # 环境变量（本地）
├── Dockerfile                   # 后端镜像构建
├── database/
│   └── init.sql                 # 数据库初始化 SQL
├── src/
│   ├── app.js                   # Express 应用装配（中间件、路由、错误处理）
│   ├── config/
│   │   ├── database.js          # MySQL 连接池 + 启动时建表
│   │   └── jwt.js               # JWT 生成、校验、中间件
│   ├── routes/
│   │   ├── auth.js              # 认证路由
│   │   ├── song.js              # 歌曲路由
│   │   └── user.js              # 用户路由
│   ├── controllers/
│   │   ├── authController.js    # 认证业务
│   │   ├── songController.js    # 歌曲业务
│   │   └── userController.js    # 用户相关业务
│   ├── middleware/
│   │   └── upload.js            # 文件上传中间件配置
│   ├── utils/
│   │   ├── helpers.js           # 参数/文本/分页工具
│   │   └── response.js          # 统一响应格式
│   └── uploads/                 # 上传文件目录（songs/covers/default-cover）
└── tests/
    ├── api.test.js              # API 级单元/集成测试（Mock DB）
    ├── jwt.test.js              # JWT 逻辑测试
    └── e2e.flow.e2e.test.js     # 端到端流程测试
```

## 4. 项目整体架构

### 架构风格

- 单体应用（Monolith，所有模块在一个进程内运行）
- 分层 + MVC 思想（Route -> Controller -> DB）
- REST API 风格（资源路径 + HTTP 方法）

### 请求处理流程

```text
客户端
  ↓ HTTP 请求
server.js（启动的 Node 进程监听端口）
  ↓
app.js（CORS / JSON 解析 / 路由挂载）
  ↓
routes/*.js（路径匹配，必要时先过 authMiddleware/upload）
  ↓
controllers/*.js（参数校验 + SQL 查询/更新）
  ↓
MySQL（database.js 提供 pool）
  ↓
response.js（统一响应结构）
  ↓
客户端
```

### 关键依赖关系

- `controllers/*` 依赖 `config/database.js`（连接池）
- 需要登录的路由依赖 `config/jwt.js` 中 `authMiddleware`
- 上传接口依赖 `middleware/upload.js`
- 响应结构统一依赖 `utils/response.js`

## 5. 核心业务流程概览

### 5.1 用户注册

- 入口接口：`POST /api/auth/register`
- 主要函数：`authController.register`
- 流程：
  - 校验邮箱格式、密码长度
  - 检查 email/username 是否重复
  - `bcryptjs.hash` 加密密码
  - 插入 `users`
- 结果：返回新用户基本信息（不返回明文密码）

### 5.2 用户登录

- 入口接口：`POST /api/auth/login`
- 主要函数：`authController.login`
- 流程：
  - 按 email 查询用户
  - `bcryptjs.compare` 比对密码
  - `generateToken` 生成 JWT
- 结果：返回 token + 用户信息

### 5.3 上传歌曲

- 入口接口：`POST /api/songs`（需鉴权）
- 主要函数：`upload` 中间件 + `songController.upload`
- 流程：
  - `authMiddleware` 解析 token -> `req.user`
  - `multer` 校验并保存 `audio/cover` 文件
  - 控制器组装音频/封面 URL，写入 `songs`
- 结果：返回新歌曲记录

### 5.4 收藏歌曲

- 入口接口：`POST /api/user/favorites`（需鉴权）
- 主要函数：`userController.addFavorite`
- 流程：
  - 检查 `song_id` 合法性与歌曲存在性
  - 插入 `favorites`（利用唯一键防重复）
- 结果：收藏成功，重复收藏返回 409

### 5.5 播放列表管理

- 入口接口：
  - `POST /api/user/playlists`
  - `POST /api/user/playlists/:playlistId/songs`
- 主要函数：`createPlaylist` / `addSongToPlaylist` 等
- 流程：
  - 校验当前用户与资源归属
  - 写入 `playlists`、`playlist_songs`
- 结果：返回歌单或歌单歌曲关系

## 6. 如何运行项目

基于 `backend/package.json`、`backend/database/init.sql`、`Dockerfile`、根目录 `docker-compose*.yml` 总结如下。

### 本地运行（不使用 Docker）

1. 环境要求
   - Node.js（建议 18+）
   - MySQL 8.x
2. 安装依赖
   - `cd backend`
   - `npm install`
3. 准备配置
   - 当前仓库有 `backend/.env`，但**未发现 `backend/.env.example` 文件**
   - 需要至少配置：`PORT, DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET, JWT_EXPIRY`
4. 初始化数据库
   - `mysql -u <user> -p < backend/database/init.sql`
5. 启动
   - 开发：`npm run dev`
   - 生产：`npm start`
6. 健康检查
   - `GET http://localhost:<PORT>/health`

### Docker 运行

- 开发/一体化：`docker-compose up -d`
- 生产扩展：`docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d`

### 常见问题

- `README.md` 中提到 `.env.example`，但代码库未发现该文件，需要手动创建 `.env`。
- 数据库连接失败通常来自 `DB_*` 配置错误或 MySQL 未启动。
- 上传失败常见原因是文件扩展名不被允许或超过大小限制（50MB）。

## 7. 初学者阅读建议

推荐顺序：

1. `backend/package.json`
2. `backend/server.js`
3. `backend/src/app.js`
4. `backend/src/routes/*.js`
5. `backend/src/config/jwt.js`
6. `backend/src/controllers/*.js`
7. `backend/src/config/database.js` + `backend/database/init.sql`
8. `backend/tests/*.js`
9. `Dockerfile` + `docker-compose*.yml`

原因：

- 先看入口和路由，能快速知道“请求去哪了”。
- 再看鉴权与控制器，理解“怎么处理业务”。
- 最后看数据库与部署，建立“从本地开发到上线”的完整链路。
