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
