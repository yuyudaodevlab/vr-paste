'use client';

import { useConnectionStore } from '@/store/connectionStore';

export function ConnectionStatusPanel() {
  const serverInfo = useConnectionStore((s) => s.serverInfo);

  const isRunning = serverInfo.status === 'running';

  return (
    <div className="card">
      <h2
        className="text-sm font-semibold mb-3"
        style={{ color: 'var(--text-secondary)' }}
      >
        接続状況
      </h2>

      <div className="flex items-center gap-3 mb-4">
        {/* Status dot */}
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{
              backgroundColor: isRunning ? 'var(--accent-cyan)' : 'var(--accent-red)',
              animation: isRunning ? 'pulseDot 2s ease-in-out infinite' : 'none',
              boxShadow: isRunning ? '0 0 8px rgba(0, 212, 255, 0.4)' : 'none',
            }}
          />
          <span
            className="text-sm font-medium"
            style={{ color: isRunning ? 'var(--accent-cyan)' : 'var(--accent-red)' }}
          >
            {isRunning ? 'サーバー稼働中' : 'サーバー停止中'}
          </span>
        </div>
      </div>

      {/* Server address */}
      {isRunning && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-md"
          style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--border)' }}
        >
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            アドレス:
          </span>
          <code
            className="text-sm font-mono font-medium"
            style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}
          >
            {serverInfo.ip}:{serverInfo.port}
          </code>
        </div>
      )}
    </div>
  );
}
