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
