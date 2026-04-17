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
