# X 平台媒体下载工具 - 设计文档

## 1. 项目概述

**项目名称**: X Media Downloader
**项目类型**: 浏览器扩展 + 本地后端服务
**核心功能**: 监听 X 平台页面，为推文中的图片和视频注入下载按钮，支持单文件和批量下载，后端记录元数据和统计。
**目标用户**: 需要下载 X 平台媒体内容的用户

## 2. 技术栈

- **扩展**: Manifest V3, TypeScript, 内容脚本
- **后端**: Node.js, Express, TypeScript
- **前端**: React, TypeScript, TailwindCSS
- **存储**: JSON 文件 (history.json, stats.json, settings.json)
- **通信**: chrome.runtime API (扩展↔后端 via HTTP)

## 3. 项目结构

```
x/
├── extension/                 # 浏览器扩展
│   ├── manifest.json
│   ├── content.ts             # 内容脚本（注入下载按钮）
│   ├── background.ts          # 后台脚本（消息中转、下载执行）
│   ├── popup.tsx              # 弹出页面
│   └── styles/
│       └── content.css        # 下载按钮样式
├── backend/                   # Express 后端服务
│   ├── src/
│   │   ├── index.ts          # 入口
│   │   ├── routes/
│   │   │   └── api.ts        # API 路由
│   │   ├── services/
│   │   │   └── storage.ts    # JSON 存储服务
│   │   └── types/
│   │       └── index.ts      # 类型定义
│   └── data/                  # JSON 数据目录
│       ├── history.json
│       ├── stats.json
│       └── settings.json
├── webui/                     # React 管理后台
│   └── src/
│       ├── App.tsx
│       ├── pages/
│       │   ├── History.tsx
│       │   ├── Stats.tsx
│       │   └── Settings.tsx
│       └── components/
├── shared/                    # 共享类型
│   └── types.ts
└── docs/
    └── specs/
```

## 4. 扩展功能详细设计

### 4.1 Content Script (content.ts)

**职责**:
- 监听 X 平台页面 DOM 变化
- 为包含图片/视频的推文注入下载按钮
- 拦截 API 请求获取媒体 URL
- 与 background.ts 通信触发下载

**下载按钮样式**:
- 位置: 媒体区域右上角，悬浮显示
- 图标: 下载箭头图标
- 颜色: 黑色半透明背景 (#000, 60% opacity)，白色图标
- 尺寸: 32x32px
- 交互: 鼠标悬停显示背景色 (#1DA1F2)

**媒体嗅探**:
- 拦截 URL 模式: `https://api.x.com/*`, `https://cdn.syndication.twimg.com/*`
- 从响应中提取: 原图 URL、视频最高画质 URL
- 使用 MutationObserver 监听页面变化

**消息格式**:
```typescript
// 发送到 background
{ type: 'DOWNLOAD_SINGLE', payload: { url: string, filename: string, username: string, tweetUrl: string, mediaType: 'image' | 'video' } }
{ type: 'DOWNLOAD_BATCH', payload: { items: Array<{url, filename, username, tweetUrl, mediaType}>, username: string } }
```

### 4.2 Background Script (background.ts)

**职责**:
- 接收 content.ts 消息
- 调用 chrome.downloads API 执行下载
- 发送桌面通知
- 异步上传元数据到后端

**下载配置**:
```typescript
chrome.downloads.download({
  url: mediaUrl,
  filename: `${username}/${filename}`,
  conflictAction: 'uniquify'
})
```

**通知格式**:
```typescript
chrome.notifications.create({
  type: 'basic',
  title: '下载完成',
  message: `${filename} 已保存到 ${username}/`,
  iconUrl: 'icons/download-complete.png'
})
```

### 4.3 Popup (popup.tsx)

**功能**:
- 显示扩展状态
- "打开管理后台" 按钮 (链接到 http://localhost:3000)
- 快速设置入口

## 5. 后端 API 设计

### 5.1 端点

| 端点 | 方法 | 说明 | 请求体 |
|------|------|------|--------|
| `/api/download/complete` | POST | 记录下载完成 | `{ filename, tweetUrl, username, mediaType, size, downloadedAt }` |
| `/api/history` | GET | 获取下载历史 | query: `?page=1&limit=20&username=&startDate=&endDate=` |
| `/api/stats` | GET | 获取统计数据 | - |
| `/api/settings` | GET | 获取设置 | - |
| `/api/settings` | POST | 更新设置 | `{ downloadPath, maxConcurrent }` |

### 5.2 响应格式

```typescript
// GET /api/history
{
  "records": [...],
  "total": 100,
  "page": 1,
  "limit": 20
}

// GET /api/stats
{
  "totalDownloads": 100,
  "totalSize": 1073741824,
  "byUsername": { "@user1": 50, "@user2": 30 }
}
```

### 5.3 JSON 存储格式

```json
// history.json
{
  "records": [
    {
      "id": "uuid-v4",
      "filename": "photo.jpg",
      "tweetUrl": "https://x.com/username/status/123",
      "username": "@username",
      "mediaType": "image",
      "size": 1024000,
      "downloadedAt": "2026-04-17T12:00:00Z"
    }
  ]
}

// stats.json
{
  "totalDownloads": 100,
  "totalSize": 1073741824,
  "byUsername": { "@username": 50 }
}

// settings.json
{
  "downloadPath": "Downloads",
  "maxConcurrent": 3,
  "lastSync": "2026-04-17T12:00:00Z"
}
```

## 6. WebUI 设计

### 6.1 页面结构

- `/` - 重定向到 /history
- `/history` - 下载历史页
- `/stats` - 统计面板
- `/settings` - 设置页

### 6.2 历史页

**功能**:
- 表格展示: 文件名、用户名、推文链接、大小、下载时间
- 搜索框: 按文件名/用户名搜索
- 日期筛选: 开始日期 - 结束日期
- 分页: 每页 20 条

### 6.3 统计页

**展示**:
- 总下载数卡片
- 总文件大小卡片 (格式化显示)
- 用户分布柱状图 (Top 10)

### 6.4 设置页

**配置项**:
- 默认下载路径 (文本输入)
- 最大并发下载数 (数字输入, 1-5)
- 保存按钮

## 7. 错误处理

| 场景 | 处理方式 |
|------|----------|
| 网络中断 | chrome.downloads 自动重试，3次失败后通知用户 |
| 无效媒体URL | 静默跳过，不显示下载按钮 |
| 后端离线 | 扩展本地缓存未上传的元数据，缓存在 localStorage，后续重试 |
| 推文被删除 | 下载失败，通知用户 |
| 磁盘空间不足 | chrome.downloads 返回错误，通知用户 |

## 8. 实现顺序

1. **阶段一**: 扩展核心 (content.ts, background.ts, manifest)
2. **阶段二**: 后端 API 服务
3. **阶段三**: WebUI 管理后台

## 9. 隐私设计

- 所有数据存储在本地
- 不向第三方服务器发送任何数据
- 扩展仅与本地后端通信 (localhost)
