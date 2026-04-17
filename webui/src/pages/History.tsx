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
