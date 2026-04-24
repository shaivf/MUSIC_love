# 🎵 音乐展示平台（Music Showcase）

一个前后端分离的音乐展示项目：支持注册登录、歌曲上传与播放、收藏、播放历史、播放列表等功能。

## 技术栈
- 前端：Vue 3 + Vite + Pinia + Vue Router + Element Plus + Axios
- 后端：Node.js + Express + MySQL + JWT + Multer
- 测试：Vitest + Supertest（后端）

## 当前实现状态（2026-04-09）
- ✅ 已完成：
  - 用户注册/登录/JWT 鉴权
  - 歌曲上传、列表、详情、编辑、删除
  - 歌曲搜索、分页、按上传者邮箱筛选
  - 播放历史记录
  - 收藏（增删查）
  - 播放列表（增删改查、增删歌曲）
  - 前端搜索防抖、上传进度显示、全局错误边界
  - **完整的 Docker 部署方案** ✨
  - **GitHub Actions CI/CD 工作流** ✨
  
- 📚 文档完善：
  - 部署指南（多环境部署方案）
  - 配置管理指南（环境变量详细说明）
  - API 文档
  - 数据库设计文档

## 目录结构
```text
music_project/
├─ backend/
│  ├─ database/init.sql
│  ├─ src/
│  │  ├─ config/
│  │  ├─ controllers/
│  │  ├─ middleware/
│  │  ├─ routes/
│  │  └─ uploads/
│  └─ tests/
├─ frontend/
│  ├─ src/
│  └─ public/
├─ docs/
└─ README.md
```

## 快速启动

### 1. 初始化数据库
```bash
# 在 MySQL 中执行
mysql -u root -p < backend/database/init.sql
```

### 2. 启动后端
```bash
cd backend
npm install
cp .env.example .env   # Windows 可手动复制
npm run dev
```

后端默认地址：`http://localhost:3000`

### 3. 启动前端
```bash
cd frontend
npm install
cp .env.example .env   # Windows 可手动复制
npm run dev
```

前端默认地址：`http://localhost:5173`

## 环境变量

> 📖 详细的环境变量说明请查看 [配置管理指南](./docs/配置管理指南.md)

### backend/.env
```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=music_db
JWT_SECRET=please_change_this_to_a_strong_secret_min_32_chars
JWT_EXPIRY=7d
```

### frontend/.env.local（开发环境）
```env
VITE_API_BASE_URL=/api
```

### frontend/.env.production（生产环境）
```env
VITE_API_BASE_URL=https://api.yourdomain.com
```

**说明**：
- 开发环境：Vite 已配置 `/api` 和 `/uploads` 代理到后端 `http://localhost:3000`
- 生产环境：请修改 `VITE_API_BASE_URL` 为实际的 API 服务器地址
- 所有敏感信息（密码、密钥）请根据实际环境修改
- `.env` 文件已添加到 `.gitignore`，不会提交到 Git

## 常用命令

### 后端
```bash
npm run dev
npm test
npm run test:e2e
```

### 前端
```bash
npm run dev
npm run build
```

## 接口文档
- API 文档：`docs/API文档.md`
- 数据库创建指南：`docs/数据库创建指南.md`
- 数据库设计：`docs/数据库设计.md`
- 分步实现指南：`docs/分步实现指南.md`

## 说明
- 兼容旧路由：后端同时支持带 `/api` 与不带 `/api` 的路径。
- 默认封面：
  - 后端上传无封面时返回 `/uploads/default-cover.jpg`
  - 前端兜底使用 `/default-cover.jpg`
