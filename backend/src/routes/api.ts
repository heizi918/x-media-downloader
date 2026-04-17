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
