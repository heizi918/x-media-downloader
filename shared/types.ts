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
