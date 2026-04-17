// Background script for X Media Downloader
// Handles: message routing, download execution, notifications

import type { ChromeMessage, DownloadRecord } from '../shared/types';

const BACKEND_URL = 'http://192.168.1.22:3001';

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