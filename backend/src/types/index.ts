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
