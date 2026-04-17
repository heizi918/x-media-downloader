import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

function Popup() {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    checkBackendStatus();
  }, []);

  async function checkBackendStatus() {
    try {
      const res = await fetch('http://192.168.1.22:3001/api/stats');
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