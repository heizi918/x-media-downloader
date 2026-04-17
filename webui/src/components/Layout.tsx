import { Link, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { path: '/history', label: '下载历史' },
    { path: '/stats', label: '统计数据' },
    { path: '/settings', label: '设置' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-[#192734] border-b border-[#38444d] px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">X Media Downloader</h1>
          <span className="text-sm text-[#657786]">管理后台</span>
        </div>

        {/* Navigation */}
        <nav className="flex gap-6 mt-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
                location.pathname === item.path
                  ? 'bg-[#1DA1F2] text-white'
                  : 'text-[#8899a6] hover:text-white hover:bg-[#22303c]'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}
