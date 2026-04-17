# OpenClaw 部署指南

## 项目概述

X Media Downloader 包含两个服务：
- **Backend**: Express API 服务 (Node.js) - 端口 3001
- **WebUI**: React 管理后台 (Vite) - 端口 3000

---

## 目录结构

```
x-media-downloader/
├── backend/              # 后端服务
│   ├── src/
│   │   ├── index.ts      # 入口
│   │   ├── routes/api.ts
│   │   └── services/storage.ts
│   ├── data/             # JSON 数据存储
│   ├── package.json
│   └── tsconfig.json
├── webui/                # 前端服务
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── ...
├── extension/            # Chrome 扩展（本地安装）
└── shared/
    └── types.ts
```

---

## 部署步骤

### 1. 环境要求

- Node.js 20+
- npm 9+

### 2. 克隆代码

```bash
git clone https://github.com/heizi918/x-media-downloader.git
cd x-media-downloader
```

### 3. 部署后端服务

```bash
cd backend

# 安装依赖
npm install

# 构建 TypeScript
npm run build

# 启动服务
npm start
# 或开发模式
npm run dev
```

后端 API 运行在 `http://0.0.0.0:3001`

### 4. 部署前端服务

```bash
cd webui

# 安装依赖
npm install

# 构建生产版本
npm run build
```

构建产物在 `webui/dist/`，可使用任意静态文件服务器托管。

### 5. 生产环境推荐：使用 PM2 管理后端

```bash
# 安装 PM2
npm install -g pm2

# 启动后端服务
cd backend
pm2 start npm --name "xmd-backend" -- start

# 保存 PM2 进程列表
pm2 save

# 设置开机自启
pm2 startup
```

### 6. 生产环境推荐：Nginx 配置

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # WebUI 静态文件
    location / {
        root /path/to/x-media-downloader/webui/dist;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | `3001` | 后端服务端口 |
| `NODE_ENV` | `development` | 运行环境 |

---

## OpenClaw 特定配置

### config.yaml 示例

```yaml
services:
  - name: xmd-backend
    type: nodejs
    path: ./backend
    port: 3001
    start: npm start
    env:
      NODE_ENV: production
      PORT: 3001

  - name: xmd-webui
    type: static
    path: ./webui/dist
    port: 3000

environment:
  NODE_ENV: production
```

---

## 扩展安装（本地）

Chrome 扩展无法通过服务器部署，需要在每个用户的浏览器中安装：

1. 打开 `chrome://extensions/`
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择项目中的 `extension/` 目录

---

## 验证部署

```bash
# 检查后端 API
curl http://localhost:3001/health

# 预期返回
{"status":"ok","timestamp":"2026-04-18T00:00:00.000Z"}
```

```bash
# 检查 API 统计接口
curl http://localhost:3001/api/stats

# 预期返回
{"totalDownloads":0,"totalSize":0,"byUsername":{}}
```

---

## 数据存储

JSON 数据文件位于 `backend/data/`：
- `history.json` - 下载历史记录
- `stats.json` - 下载统计数据
- `settings.json` - 用户设置

**重要**: 这些文件需要持久化存储，确保 `backend/data/` 目录被正确挂载。

---

## 故障排查

### 后端无法启动
```bash
# 检查端口占用
lsof -i :3001

# 检查 Node 版本
node --version  # 需要 20+
```

### 前端构建失败
```bash
cd webui
rm -rf node_modules package-lock.json
npm install
npm run build
```

### 扩展无法连接后端
检查 `extension/background.ts` 中的 `BACKEND_URL` 是否指向正确的服务器地址。
