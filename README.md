# X Media Downloader

一款用于下载 X 平台（x.com）图片和视频的 Chrome 浏览器扩展。

## 功能特性

- **单文件下载**: 点击推文中的图片或视频即可下载
- **批量下载**: 在用户主页媒体标签页一键下载该用户所有媒体
- **自动归类**: 文件自动保存到以用户名命名的文件夹
- **下载通知**: 下载完成后发送桌面通知
- **历史记录**: Web 管理后台查看所有下载记录
- **统计面板**: 查看下载统计和用户分布

## 项目结构

```
x/
├── extension/          # Chrome 扩展 (Manifest V3)
├── backend/            # Express 后端服务
├── webui/              # React 管理后台
└── shared/             # 共享类型定义
```

## 安装和使用

### 1. 安装扩展

1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启右上角的"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `extension/` 文件夹

### 2. 启动后端服务

```bash
cd backend
npm install
npm run dev
```

后端服务运行在 `http://localhost:3001`

### 3. 启动 Web 管理后台

```bash
cd webui
npm install
npm run dev
```

管理后台运行在 `http://localhost:3000`

### 4. 使用扩展

1. 打开 X 平台 (x.com)
2. 浏览包含图片或视频的推文
3. 鼠标悬停在媒体上，点击右上角的下载按钮
4. 在用户主页的"媒体"标签页，点击"批量下载本页媒体"按钮

## 技术栈

- **扩展**: Manifest V3, TypeScript
- **后端**: Node.js, Express, TypeScript
- **前端**: React, TypeScript, TailwindCSS
- **存储**: JSON 文件

## API 接口

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/download/complete` | POST | 记录下载完成 |
| `/api/history` | GET | 获取下载历史 |
| `/api/stats` | GET | 获取统计数据 |
| `/api/settings` | GET/POST | 获取/更新设置 |

## 隐私说明

- 所有数据存储在本地，不向第三方服务器发送任何数据
- 扩展仅与本地后端服务通信

## License

MIT
