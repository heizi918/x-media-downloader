# X Media Downloader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome extension that downloads media from X.com, with a local backend for metadata tracking and a React webui for history/stats management.

**Architecture:** Extension uses chrome.downloads API directly (lightweight), backend stores metadata only. Communication: Extension → backend via HTTP POST after each download completes.

**Tech Stack:** Manifest V3, TypeScript, Express, React, TailwindCSS, JSON file storage.

---

## File Structure

```
x/
├── extension/
│   ├── manifest.json              # MV3 extension manifest
│   ├── content.ts                 # Content script (inject buttons, sniff media)
│   ├── background.ts              # Background script (handle messages, downloads)
│   ├── popup.tsx                  # Popup UI
│   └── styles/
│       └── content.css            # Download button styles
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts               # Express server entry
│   │   ├── routes/
│   │   │   └── api.ts             # API routes
│   │   ├── services/
│   │   │   └── storage.ts         # JSON file read/write
│   │   └── types/
│   │       └── index.ts           # TypeScript types
│   └── data/                      # JSON storage (gitignored)
│       ├── history.json
│       ├── stats.json
│       └── settings.json
├── webui/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── pages/
│       │   ├── History.tsx
│       │   ├── Stats.tsx
│       │   └── Settings.tsx
│       └── components/
│           └── Layout.tsx
├── shared/
│   └── types.ts                   # Shared types between ext/backend/webui
└── docs/
    └── specs/
        └── 2026-04-17-x-media-downloader-design.md
```

---

## Task 1: Initialize Project Structure

**Files:**
- Create: `extension/manifest.json`
- Create: `backend/package.json`, `backend/tsconfig.json`
- Create: `webui/package.json`, `webui/tsconfig.json`, `webui/vite.config.ts`
- Create: `webui/index.html`
- Create: `shared/types.ts`
- Create: `backend/data/history.json` (empty structure)
- Create: `backend/data/stats.json` (empty structure)
- Create: `backend/data/settings.json` (default values)

- [ ] **Step 1: Create extension/manifest.json**

```json
{
  "manifest_version": 3,
  "name": "X Media Downloader",
  "version": "1.0.0",
  "description": "Download images and videos from X.com",
  "permissions": ["downloads", "notifications", "storage", "activeTab"],
  "host_permissions": ["https://x.com/*", "https://cdn.syndication.twimg.com/*", "https://api.x.com/*"],
  "content_scripts": [
    {
      "matches": ["https://x.com/*", "https://www.x.com/*"],
      "js": ["content.js"],
      "css": ["styles/content.css"],
      "run_at": "document_idle"
    }
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

- [ ] **Step 2: Create shared/types.ts**

```typescript
// Shared types for extension, backend, and webui

export interface DownloadRecord {
  id: string;
  filename: string;
  tweetUrl: string;
  username: string;
  mediaType: 'image' | 'video';
  size: number;
  downloadedAt: string;
}

export interface DownloadStats {
  totalDownloads: number;
  totalSize: number;
  byUsername: Record<string, number>;
}

export interface AppSettings {
  downloadPath: string;
  maxConcurrent: number;
  backendUrl: string;
}

export interface DownloadMessage {
  type: 'DOWNLOAD_SINGLE';
  payload: {
    url: string;
    filename: string;
    username: string;
    tweetUrl: string;
    mediaType: 'image' | 'video';
    size?: number;
  };
}

export interface BatchDownloadMessage {
  type: 'DOWNLOAD_BATCH';
  payload: {
    items: Array<{
      url: string;
      filename: string;
      username: string;
      tweetUrl: string;
      mediaType: 'image' | 'video';
    }>;
    username: string;
  };
}

export type ChromeMessage = DownloadMessage | BatchDownloadMessage;
```

- [ ] **Step 3: Create backend/data/*.json**

```json
// history.json
{ "records": [] }

// stats.json
{ "totalDownloads": 0, "totalSize": 0, "byUsername": {} }

// settings.json
{ "downloadPath": "Downloads", "maxConcurrent": 3, "backendUrl": "http://localhost:3001" }
```

- [ ] **Step 4: Create backend/package.json**

```json
{
  "name": "x-media-downloader-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.12",
    "@types/express": "^4.17.17",
    "@types/node": "^20.0.0",
    "@types/uuid": "^9.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 5: Create backend/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 6: Create webui/package.json**

```json
{
  "name": "x-media-downloader-webui",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.3.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

- [ ] **Step 7: Create webui/vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 8: Create webui/index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>X Media Downloader - 管理后台</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: initial project structure"
```

---

## Task 2: Chrome Extension - Content Script

**Files:**
- Create: `extension/content.ts`
- Create: `extension/styles/content.css`

- [ ] **Step 1: Create extension/styles/content.css**

```css
/* Download button styles */
.xmd-download-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  background-color: rgba(0, 0, 0, 0.6);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease, background-color 0.2s ease;
  z-index: 1000;
}

.xmd-download-btn:hover {
  background-color: #1DA1F2;
  opacity: 1;
}

.xmd-download-btn.visible {
  opacity: 1;
}

.xmd-download-btn svg {
  width: 18px;
  height: 18px;
  fill: white;
}

/* Media container needs relative positioning */
.xmd-media-container {
  position: relative;
}

.xmd-media-container:hover .xmd-download-btn {
  opacity: 1;
}

/* Batch download button */
.xmd-batch-btn {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 12px 24px;
  background-color: #1DA1F2;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 9999;
  transition: background-color 0.2s ease;
}

.xmd-batch-btn:hover {
  background-color: #1a91da;
}

.xmd-batch-btn:disabled {
  background-color: #657786;
  cursor: not-allowed;
}
```

- [ ] **Step 2: Create extension/content.ts (Part 1 - Button Injection)**

```typescript
// Content script for X Media Downloader
// Handles: button injection, media URL sniffing, download triggers

const XMD_CONFIG = {
  // API patterns to intercept
  apiPatterns: [
    'https://api.x.com/graphql/*',
    'https://cdn.syndication.twimg.com/*',
  ],
  // Media container selectors
  mediaSelectors: [
    'article [data-testid="tweetPhoto"] img',
    'article [data-testid="tweetPhoto"] video',
    '[data-testid="card.layoutSmall.media"] img',
    '[data-testid="card.layoutLarge.media"] img',
  ],
  // Tweet article selectors
  tweetSelectors: [
    'article[data-testid="tweet"]',
    'div[data-testid="tweet"]',
  ],
};

// Inject download button into a media element
function injectDownloadButton(mediaEl: HTMLElement, mediaUrl: string, mediaType: 'image' | 'video') {
  // Skip if already injected
  if (mediaEl.closest('.xmd-media-container')) return;

  const container = document.createElement('div');
  container.className = 'xmd-media-container';

  const button = document.createElement('button');
  button.className = 'xmd-download-btn';
  button.innerHTML = `
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
    </svg>
  `;

  button.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await triggerDownload(mediaUrl, mediaType, mediaEl);
  });

  // Wrap the media element
  mediaEl.parentNode?.insertBefore(container, mediaEl);
  container.appendChild(mediaEl);
  container.appendChild(button);
}

// Get tweet info from article element
function getTweetInfo(article: Element): { username: string; tweetUrl: string } | null {
  const authorLink = article.querySelector('a[href*="/"]') as HTMLAnchorElement;
  const timeElement = article.querySelector('time');
  const articleLink = article.querySelector('a[href*="/status/"]') as HTMLAnchorElement;

  if (!articleLink) return null;

  const href = articleLink.href;
  const match = href.match(/x\.com\/([^/]+)\/status\/(\d+)/i) ||
                href.match(/twitter\.com\/([^/]+)\/status\/(\d+)/i);

  if (!match) return null;

  return {
    username: match[1],
    tweetUrl: href,
  };
}

// Extract media URL from img/video element
function getMediaUrl(el: HTMLElement): string | null {
  if (el.tagName === 'IMG') {
    // Try various attributes for original image
    return (el as HTMLImageElement).src ||
           (el as HTMLImageElement).getAttribute('data-src') ||
           el.getAttribute('srcset')?.split(',').pop()?.trim().split(' ')[0] ||
           null;
  }
  if (el.tagName === 'VIDEO') {
    return (el as HTMLVideoElement).src ||
           (el as HTMLVideoElement).currentSrc ||
           null;
  }
  return null;
}

// Determine media type
function getMediaType(el: HTMLElement): 'image' | 'video' {
  return el.tagName === 'VIDEO' ? 'video' : 'image';
}

// Generate filename for download
function generateFilename(username: string, mediaType: 'image' | 'video', index: number = 0): string {
  const ext = mediaType === 'image' ? 'jpg' : 'mp4';
  const timestamp = Date.now();
  return `${username}_${timestamp}_${index}.${ext}`;
}

// Trigger download via background script
async function triggerDownload(url: string, mediaType: 'image' | 'video', el: HTMLElement) {
  const article = el.closest('article');
  const tweetInfo = article ? getTweetInfo(article) : null;

  const message = {
    type: 'DOWNLOAD_SINGLE',
    payload: {
      url,
      filename: generateFilename(tweetInfo?.username || 'unknown', mediaType),
      username: tweetInfo?.username || 'unknown',
      tweetUrl: tweetInfo?.tweetUrl || '',
      mediaType,
    },
  };

  chrome.runtime.sendMessage(message);
}
```

- [ ] **Step 3: Create extension/content.ts (Part 2 - Main Logic)**

```typescript
// Main initialization and observation logic

let isInitialized = false;

async function init() {
  if (isInitialized) return;
  isInitialized = true;

  console.log('[XMD] Content script initialized');

  // Initial scan
  scanAndInjectButtons();

  // Set up mutation observer for dynamic content
  setupObserver();
}

function setupObserver() {
  const observer = new MutationObserver((mutations) => {
    let shouldScan = false;

    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        shouldScan = true;
        break;
      }
    }

    if (shouldScan) {
      // Debounce scan
      clearTimeout((window as any)._xmdScanTimeout);
      (window as any)._xmdScanTimeout = setTimeout(scanAndInjectButtons, 500);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function scanAndInjectButtons() {
  // Find all media elements
  const mediaElements = document.querySelectorAll<HTMLElement>(
    'article [data-testid="tweetPhoto"] img, ' +
    'article [data-testid="tweetPhoto"] video, ' +
    '[data-testid="card.layoutSmall.media"] img, ' +
    '[data-testid="card.layoutLarge.media"] img, ' +
    'video[src*="twimg"]'
  );

  mediaElements.forEach((el) => {
    const url = getMediaUrl(el);
    if (url && url.startsWith('http')) {
      injectDownloadButton(el, url, getMediaType(el));
    }
  });
}

// Check if we're on a profile media tab
function isProfileMediaTab(): boolean {
  return window.location.pathname.match(/^\/[^/]+\/media$/i) !== null;
}

// Add batch download button on profile media pages
function addBatchDownloadButton() {
  if (!isProfileMediaTab()) return;
  if (document.querySelector('.xmd-batch-btn')) return;

  const button = document.createElement('button');
  button.className = 'xmd-batch-btn';
  button.textContent = '批量下载本页媒体';

  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = '收集中...';

    const mediaItems = collectVisibleMedia();

    if (mediaItems.length === 0) {
      button.textContent = '未找到媒体';
      setTimeout(() => {
        button.disabled = false;
        button.textContent = '批量下载本页媒体';
      }, 2000);
      return;
    }

    const username = window.location.pathname.split('/')[1];

    chrome.runtime.sendMessage({
      type: 'DOWNLOAD_BATCH',
      payload: {
        items: mediaItems,
        username,
      },
    });

    button.textContent = `已添加 ${mediaItems.length} 个下载任务`;
  });

  document.body.appendChild(button);
}

function collectVisibleMedia(): Array<{
  url: string;
  filename: string;
  username: string;
  tweetUrl: string;
  mediaType: 'image' | 'video';
}> {
  const items: Array<{
    url: string;
    filename: string;
    username: string;
    tweetUrl: string;
    mediaType: 'image' | 'video';
  }> = [];

  const mediaElements = document.querySelectorAll<HTMLElement>(
    'article [data-testid="tweetPhoto"] img, ' +
    'article [data-testid="tweetPhoto"] video'
  );

  const username = window.location.pathname.split('/')[1];

  mediaElements.forEach((el, index) => {
    const url = getMediaUrl(el);
    if (url && url.startsWith('http')) {
      const article = el.closest('article');
      const tweetInfo = article ? getTweetInfo(article) : null;

      items.push({
        url,
        filename: generateFilename(username, getMediaType(el), index),
        username,
        tweetUrl: tweetInfo?.tweetUrl || window.location.href,
        mediaType: getMediaType(el),
      });
    }
  });

  return items;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Re-check for batch button on navigation
let lastPath = window.location.pathname;
setInterval(() => {
  if (window.location.pathname !== lastPath) {
    lastPath = window.location.pathname;
    if (isProfileMediaTab()) {
      addBatchDownloadButton();
    }
  }
}, 1000);
```

- [ ] **Step 4: Commit**

```bash
git add extension/
git commit -m "feat: add content script with download button injection"
```

---

## Task 3: Chrome Extension - Background Script

**Files:**
- Create: `extension/background.ts`
- Create: `extension/popup.tsx`

- [ ] **Step 1: Create extension/background.ts**

```typescript
// Background script for X Media Downloader
// Handles: message routing, download execution, notifications

import type { ChromeMessage, DownloadRecord } from '../shared/types';

const BACKEND_URL = 'http://localhost:3001';

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
  if (message.type === 'DOWNLOAD_SINGLE') {
    handleSingleDownload(message.payload)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // async response
  }

  if (message.type === 'DOWNLOAD_BATCH') {
    handleBatchDownload(message.payload)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function handleSingleDownload(payload: {
  url: string;
  filename: string;
  username: string;
  tweetUrl: string;
  mediaType: 'image' | 'video';
}) {
  const { url, filename, username, tweetUrl, mediaType } = payload;

  try {
    // Execute download
    const downloadId = await chrome.downloads.download({
      url,
      filename: `${username}/${filename}`,
      conflictAction: 'uniquify',
    });

    // Wait for download to complete to get size
    const downloadItem = await waitForDownloadComplete(downloadId);

    // Send metadata to backend
    await reportToBackend({
      id: generateId(),
      filename,
      tweetUrl,
      username,
      mediaType,
      size: downloadItem?.fileSize || 0,
      downloadedAt: new Date().toISOString(),
    });

    // Show notification
    showNotification('下载完成', `${filename} 已保存到 ${username}/`);
  } catch (error) {
    console.error('[XMD] Download failed:', error);
    showNotification('下载失败', `${filename} 下载失败`);
    throw error;
  }
}

async function handleBatchDownload(payload: {
  items: Array<{
    url: string;
    filename: string;
    username: string;
    tweetUrl: string;
    mediaType: 'image' | 'video';
  }>;
  username: string;
}) {
  const { items, username } = payload;

  showNotification('批量下载开始', `正在下载 ${items.length} 个文件...`);

  let successCount = 0;
  let failCount = 0;

  for (const item of items) {
    try {
      const downloadId = await chrome.downloads.download({
        url: item.url,
        filename: `${username}/${item.filename}`,
        conflictAction: 'uniquify',
      });

      const downloadItem = await waitForDownloadComplete(downloadId);

      await reportToBackend({
        id: generateId(),
        filename: item.filename,
        tweetUrl: item.tweetUrl,
        username: item.username,
        mediaType: item.mediaType,
        size: downloadItem?.fileSize || 0,
        downloadedAt: new Date().toISOString(),
      });

      successCount++;
    } catch {
      failCount++;
    }
  }

  showNotification(
    '批量下载完成',
    `成功 ${successCount} 个，失败 ${failCount} 个`
  );
}

function waitForDownloadComplete(downloadId: number): Promise<chrome.downloads.DownloadItem | null> {
  return new Promise((resolve) => {
    const check = (downloadItem: chrome.downloads.DownloadItem) => {
      if (downloadItem.id === downloadId) {
        if (downloadItem.state?.state === 'complete') {
          chrome.downloads.onChanged.removeListener(check);
          resolve(downloadItem);
        } else if (downloadItem.state?.state === 'interrupted') {
          chrome.downloads.onChanged.removeListener(check);
          resolve(downloadItem);
        }
      }
    };

    chrome.downloads.onChanged.addListener(check);

    // Timeout after 5 minutes
    setTimeout(() => {
      chrome.downloads.onChanged.removeListener(check);
      resolve(null);
    }, 5 * 60 * 1000);
  });
}

async function reportToBackend(record: DownloadRecord): Promise<void> {
  try {
    await fetch(`${BACKEND_URL}/api/download/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
  } catch (error) {
    console.error('[XMD] Failed to report to backend:', error);
    // Store in localStorage for retry
    storeFailedReport(record);
  }
}

function storeFailedReport(record: DownloadRecord): void {
  const failed = JSON.parse(localStorage.getItem('xmd_failed_reports') || '[]');
  failed.push(record);
  localStorage.setItem('xmd_failed_reports', JSON.stringify(failed));
}

async function retryFailedReports(): Promise<void> {
  const failed = JSON.parse(localStorage.getItem('xmd_failed_reports') || '[]');
  if (failed.length === 0) return;

  const remaining: DownloadRecord[] = [];

  for (const record of failed) {
    try {
      await fetch(`${BACKEND_URL}/api/download/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
    } catch {
      remaining.push(record);
    }
  }

  localStorage.setItem('xmd_failed_reports', JSON.stringify(remaining));
}

function showNotification(title: string, message: string): void {
  chrome.notifications?.create({
    type: 'basic',
    title,
    message,
    iconUrl: 'icons/icon48.png',
  });
}

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Retry failed reports periodically
setInterval(retryFailedReports, 60000); // Every minute
```

- [ ] **Step 2: Create extension/popup.tsx**

```typescript
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

function Popup() {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    checkBackendStatus();
  }, []);

  async function checkBackendStatus() {
    try {
      const res = await fetch('http://localhost:3001/api/stats');
      if (res.ok) {
        setBackendStatus('online');
      } else {
        setBackendStatus('offline');
      }
    } catch {
      setBackendStatus('offline');
    }
  }

  return (
    <div style={{ width: 300, padding: 16, fontFamily: 'system-ui' }}>
      <h2 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600 }}>X Media Downloader</h2>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: backendStatus === 'online' ? '#17bf63' : backendStatus === 'offline' ? '#e0245e' : '#657786',
            }}
          />
          <span style={{ fontSize: 14 }}>
            {backendStatus === 'checking' && '检查中...'}
            {backendStatus === 'online' && '后端服务已连接'}
            {backendStatus === 'offline' && '后端服务未连接'}
          </span>
        </div>
      </div>

      <a
        href="http://localhost:3000"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'block',
          width: '100%',
          padding: '10px 16px',
          backgroundColor: '#1DA1F2',
          color: 'white',
          textAlign: 'center',
          textDecoration: 'none',
          borderRadius: 6,
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        打开管理后台
      </a>

      <p style={{ marginTop: 16, fontSize: 12, color: '#657786' }}>
        在 X 平台浏览时，点击图片或视频上的下载按钮即可下载。
        在用户主页媒体标签页可使用批量下载功能。
      </p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Popup />);
```

- [ ] **Step 3: Create extension/popup.html**

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="popup.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Update manifest.json to include popup**

```json
{
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add extension/
git commit -m "feat: add background script and popup"
```

---

## Task 4: Backend API Service

**Files:**
- Create: `backend/src/types/index.ts`
- Create: `backend/src/services/storage.ts`
- Create: `backend/src/routes/api.ts`
- Create: `backend/src/index.ts`

- [ ] **Step 1: Create backend/src/types/index.ts**

```typescript
export interface DownloadRecord {
  id: string;
  filename: string;
  tweetUrl: string;
  username: string;
  mediaType: 'image' | 'video';
  size: number;
  downloadedAt: string;
}

export interface DownloadStats {
  totalDownloads: number;
  totalSize: number;
  byUsername: Record<string, number>;
}

export interface AppSettings {
  downloadPath: string;
  maxConcurrent: number;
  backendUrl: string;
}

export interface HistoryData {
  records: DownloadRecord[];
}

export interface StatsData {
  totalDownloads: number;
  totalSize: number;
  byUsername: Record<string, number>;
}

export interface SettingsData extends AppSettings {
  lastSync?: string;
}
```

- [ ] **Step 2: Create backend/src/services/storage.ts**

```typescript
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import type { DownloadRecord, DownloadStats, AppSettings, HistoryData, StatsData, SettingsData } from '../types/index.js';

const DATA_DIR = path.join(process.cwd(), 'data');

async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

async function readJsonFile<T>(filename: string, defaultValue: T): Promise<T> {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);

  if (!existsSync(filePath)) {
    return defaultValue;
  }

  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return defaultValue;
  }
}

async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// History operations
export async function getHistory(): Promise<HistoryData> {
  return readJsonFile<HistoryData>('history.json', { records: [] });
}

export async function addHistoryRecord(record: DownloadRecord): Promise<void> {
  const history = await getHistory();
  history.records.unshift(record); // Add to beginning
  // Keep only last 1000 records
  if (history.records.length > 1000) {
    history.records = history.records.slice(0, 1000);
  }
  await writeJsonFile('history.json', history);
}

// Stats operations
export async function getStats(): Promise<StatsData> {
  return readJsonFile<StatsData>('stats.json', {
    totalDownloads: 0,
    totalSize: 0,
    byUsername: {},
  });
}

export async function updateStats(record: DownloadRecord): Promise<void> {
  const stats = await getStats();
  stats.totalDownloads += 1;
  stats.totalSize += record.size;

  const username = record.username;
  stats.byUsername[username] = (stats.byUsername[username] || 0) + 1;

  await writeJsonFile('stats.json', stats);
}

// Settings operations
export async function getSettings(): Promise<SettingsData> {
  const defaultSettings: SettingsData = {
    downloadPath: 'Downloads',
    maxConcurrent: 3,
    backendUrl: 'http://localhost:3001',
  };
  return readJsonFile<SettingsData>('settings.json', defaultSettings);
}

export async function updateSettings(settings: Partial<AppSettings>): Promise<SettingsData> {
  const current = await getSettings();
  const updated = { ...current, ...settings, lastSync: new Date().toISOString() };
  await writeJsonFile('settings.json', updated);
  return updated;
}

// Combined operation: record a completed download
export async function recordDownload(record: DownloadRecord): Promise<void> {
  await Promise.all([
    addHistoryRecord(record),
    updateStats(record),
  ]);
}
```

- [ ] **Step 3: Create backend/src/routes/api.ts**

```typescript
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  getHistory,
  getStats,
  getSettings,
  updateSettings,
  recordDownload,
} from '../services/storage.js';
import type { DownloadRecord } from '../types/index.js';

const router = Router();

// POST /api/download/complete - Record a completed download
router.post('/download/complete', async (req, res) => {
  try {
    const { filename, tweetUrl, username, mediaType, size } = req.body;

    if (!filename || !username || !mediaType) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const record: DownloadRecord = {
      id: uuidv4(),
      filename,
      tweetUrl: tweetUrl || '',
      username,
      mediaType,
      size: size || 0,
      downloadedAt: new Date().toISOString(),
    };

    await recordDownload(record);

    res.json({ success: true, record });
  } catch (error) {
    console.error('Error recording download:', error);
    res.status(500).json({ error: 'Failed to record download' });
  }
});

// GET /api/history - Get download history
router.get('/history', async (req, res) => {
  try {
    const { page = '1', limit = '20', username, startDate, endDate } = req.query;

    const history = await getHistory();
    let records = [...history.records];

    // Filter by username
    if (username) {
      records = records.filter((r) =>
        r.username.toLowerCase().includes(String(username).toLowerCase())
      );
    }

    // Filter by date range
    if (startDate) {
      const start = new Date(String(startDate));
      records = records.filter((r) => new Date(r.downloadedAt) >= start);
    }
    if (endDate) {
      const end = new Date(String(endDate));
      records = records.filter((r) => new Date(r.downloadedAt) <= end);
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(String(page), 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10)));
    const total = records.length;
    const start = (pageNum - 1) * limitNum;
    const paginatedRecords = records.slice(start, start + limitNum);

    res.json({
      records: paginatedRecords,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// GET /api/stats - Get download statistics
router.get('/stats', async (_req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/settings - Get settings
router.get('/settings', async (_req, res) => {
  try {
    const settings = await getSettings();
    // Don't expose backendUrl in response
    const { backendUrl, ...publicSettings } = settings;
    res.json(publicSettings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// POST /api/settings - Update settings
router.post('/settings', async (req, res) => {
  try {
    const { downloadPath, maxConcurrent } = req.body;

    const updates: Record<string, unknown> = {};
    if (downloadPath !== undefined) updates.downloadPath = downloadPath;
    if (maxConcurrent !== undefined) {
      const val = parseInt(String(maxConcurrent), 10);
      if (val >= 1 && val <= 10) {
        updates.maxConcurrent = val;
      }
    }

    const settings = await updateSettings(updates);
    const { backendUrl, ...publicSettings } = settings;
    res.json(publicSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
```

- [ ] **Step 4: Create backend/src/index.ts**

```typescript
import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/api', apiRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`X Media Downloader backend running on http://localhost:${PORT}`);
});
```

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "feat: add backend API service with JSON storage"
```

---

## Task 5: WebUI Admin Dashboard

**Files:**
- Create: `webui/src/main.tsx`
- Create: `webui/src/App.tsx`
- Create: `webui/src/index.css`
- Create: `webui/src/components/Layout.tsx`
- Create: `webui/src/pages/History.tsx`
- Create: `webui/src/pages/Stats.tsx`
- Create: `webui/src/pages/Settings.tsx`
- Create: `webui/tailwind.config.js`
- Create: `webui/postcss.config.js`

- [ ] **Step 1: Create webui/src/main.tsx**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 2: Create webui/src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: #15202b;
  color: #ffffff;
}
```

- [ ] **Step 3: Create webui/tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

- [ ] **Step 4: Create webui/postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 5: Create webui/src/App.tsx**

```typescript
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import History from './pages/History';
import Stats from './pages/Stats';
import Settings from './pages/Settings';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/history" replace />} />
        <Route path="/history" element={<History />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
}

export default App;
```

- [ ] **Step 6: Create webui/src/components/Layout.tsx**

```typescript
import { Link, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { path: '/history', label: '下载历史' },
    { path: '/stats', label: '统计数据' },
    { path: '/settings', label: '设置' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-[#192734] border-b border-[#38444d] px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">X Media Downloader</h1>
          <span className="text-sm text-[#657786]">管理后台</span>
        </div>

        {/* Navigation */}
        <nav className="flex gap-6 mt-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
                location.pathname === item.path
                  ? 'bg-[#1DA1F2] text-white'
                  : 'text-[#8899a6] hover:text-white hover:bg-[#22303c]'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 7: Create webui/src/pages/History.tsx**

```typescript
import { useState, useEffect } from 'react';
import axios from 'axios';

interface DownloadRecord {
  id: string;
  filename: string;
  tweetUrl: string;
  username: string;
  mediaType: 'image' | 'video';
  size: number;
  downloadedAt: string;
}

export default function History() {
  const [records, setRecords] = useState<DownloadRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const limit = 20;

  useEffect(() => {
    fetchHistory();
  }, [page, search]);

  async function fetchHistory() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search && { username: search }),
      });

      const res = await axios.get(`/api/history?${params}`);
      setRecords(res.data.records);
      setTotal(res.data.total);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">下载历史</h2>
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="搜索用户名..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 bg-[#22303c] border border-[#38444d] rounded-lg text-white placeholder-[#657786] focus:outline-none focus:border-[#1DA1F2]"
          />
          <span className="text-[#657786] text-sm">共 {total} 条记录</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#657786]">加载中...</div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 text-[#657786]">暂无下载记录</div>
      ) : (
        <>
          <div className="bg-[#192734] rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#38444d]">
                  <th className="text-left px-4 py-3 text-[#8899a6] font-medium text-sm">文件名</th>
                  <th className="text-left px-4 py-3 text-[#8899a6] font-medium text-sm">用户</th>
                  <th className="text-left px-4 py-3 text-[#8899a6] font-medium text-sm">类型</th>
                  <th className="text-left px-4 py-3 text-[#8899a6] font-medium text-sm">大小</th>
                  <th className="text-left px-4 py-3 text-[#8899a6] font-medium text-sm">时间</th>
                  <th className="text-left px-4 py-3 text-[#8899a6] font-medium text-sm">推文链接</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-b border-[#38444d] hover:bg-[#22303c]">
                    <td className="px-4 py-3 text-white">{record.filename}</td>
                    <td className="px-4 py-3 text-[#1DA1F2]">{record.username}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        record.mediaType === 'image'
                          ? 'bg-[#1DA1F2]/20 text-[#1DA1F2]'
                          : 'bg-[#17bf63]/20 text-[#17bf63]'
                      }`}>
                        {record.mediaType === 'image' ? '图片' : '视频'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#8899a6]">{formatSize(record.size)}</td>
                    <td className="px-4 py-3 text-[#8899a6] text-sm">{formatDate(record.downloadedAt)}</td>
                    <td className="px-4 py-3">
                      {record.tweetUrl && (
                        <a
                          href={record.tweetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#1DA1F2] hover:underline text-sm"
                        >
                          查看
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-[#22303c] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#2f3f4f]"
              >
                上一页
              </button>
              <span className="text-[#8899a6]">
                第 {page} / {Math.ceil(total / limit)} 页
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / limit)}
                className="px-4 py-2 bg-[#22303c] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#2f3f4f]"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Create webui/src/pages/Stats.tsx**

```typescript
import { useState, useEffect } from 'react';
import axios from 'axios';

interface Stats {
  totalDownloads: number;
  totalSize: number;
  byUsername: Record<string, number>;
}

export default function Stats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const res = await axios.get('/api/stats');
      setStats(res.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }

  function formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  if (!stats) {
    return <div className="text-center py-12 text-[#657786]">加载中...</div>;
  }

  // Get top 10 users
  const topUsers = Object.entries(stats.byUsername)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const maxCount = topUsers.length > 0 ? topUsers[0][1] : 1;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">统计数据</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#192734] rounded-lg p-6">
          <div className="text-[#657786] text-sm mb-2">总下载数</div>
          <div className="text-4xl font-bold text-white">{stats.totalDownloads.toLocaleString()}</div>
        </div>
        <div className="bg-[#192734] rounded-lg p-6">
          <div className="text-[#657786] text-sm mb-2">总文件大小</div>
          <div className="text-4xl font-bold text-white">{formatSize(stats.totalSize)}</div>
        </div>
      </div>

      {/* User Distribution */}
      <div className="bg-[#192734] rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">用户下载分布 (Top 10)</h3>
        {topUsers.length === 0 ? (
          <div className="text-center py-8 text-[#657786]">暂无数据</div>
        ) : (
          <div className="space-y-4">
            {topUsers.map(([username, count]) => (
              <div key={username} className="flex items-center gap-4">
                <div className="w-24 text-[#1DA1F2] text-sm truncate">{username}</div>
                <div className="flex-1 bg-[#22303c] rounded-full h-6 relative overflow-hidden">
                  <div
                    className="bg-[#1DA1F2] h-full rounded-full transition-all duration-300"
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-xs text-white">
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Create webui/src/pages/Settings.tsx**

```typescript
import { useState, useEffect } from 'react';
import axios from 'axios';

interface Settings {
  downloadPath: string;
  maxConcurrent: number;
}

export default function Settings() {
  const [settings, setSettings] = useState<Settings>({
    downloadPath: 'Downloads',
    maxConcurrent: 3,
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await axios.get('/api/settings');
      setSettings(res.data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  }

  async function handleSave() {
    setLoading(true);
    setSaved(false);
    try {
      await axios.post('/api/settings', settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">设置</h2>

      <div className="bg-[#192734] rounded-lg p-6 max-w-lg">
        <div className="space-y-6">
          <div>
            <label className="block text-[#8899a6] text-sm mb-2">下载路径</label>
            <input
              type="text"
              value={settings.downloadPath}
              onChange={(e) => setSettings((s) => ({ ...s, downloadPath: e.target.value }))}
              className="w-full px-4 py-2 bg-[#22303c] border border-[#38444d] rounded-lg text-white focus:outline-none focus:border-[#1DA1F2]"
              placeholder="Downloads"
            />
            <p className="text-[#657786] text-xs mt-2">浏览器下载管理中的默认保存目录</p>
          </div>

          <div>
            <label className="block text-[#8899a6] text-sm mb-2">最大并发下载数</label>
            <input
              type="number"
              min="1"
              max="10"
              value={settings.maxConcurrent}
              onChange={(e) =>
                setSettings((s) => ({ ...s, maxConcurrent: parseInt(e.target.value, 10) || 1 }))
              }
              className="w-full px-4 py-2 bg-[#22303c] border border-[#38444d] rounded-lg text-white focus:outline-none focus:border-[#1DA1F2]"
            />
            <p className="text-[#657786] text-xs mt-2">1-10，批量下载时的最大并发数</p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 bg-[#1DA1F2] text-white rounded-lg hover:bg-[#1a91da] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '保存中...' : '保存设置'}
            </button>
            {saved && <span className="text-[#17bf63] text-sm">保存成功</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 10: Commit**

```bash
git add webui/
git commit -m "feat: add webui admin dashboard"
```

---

## Task 6: Create README.md

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README.md**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README.md"
```

---

## Self-Review Checklist

1. **Spec coverage**: All features from design spec have corresponding tasks:
   - ✅ Content script with download button injection
   - ✅ Background script with chrome.downloads API
   - ✅ Batch download on profile media pages
   - ✅ Backend API endpoints (POST /download/complete, GET /history, GET /stats, GET/POST /settings)
   - ✅ JSON file storage for history, stats, settings
   - ✅ WebUI pages (History, Stats, Settings)
   - ✅ Popup with link to admin dashboard
   - ✅ README.md

2. **Placeholder scan**: No TBD, TODO, or vague requirements found

3. **Type consistency**: Types defined in shared/types.ts, used consistently across extension, backend, and webui

4. **File paths**: All paths use forward slashes, are relative to project root
