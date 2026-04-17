import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import type { DownloadRecord, AppSettings, HistoryData, StatsData, SettingsData } from '../types/index.js';

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
