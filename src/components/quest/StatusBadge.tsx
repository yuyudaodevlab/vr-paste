'use client';

export function StatusBadge({ isConnected }: { isConnected: boolean }) {
  return (
    <div
      className="badge text-sm"
      style={{
        backgroundColor: isConnected ? 'rgba(0, 212, 255, 0.15)' : 'rgba(239, 68, 68, 0.15)',
        color: isConnected ? 'var(--accent-cyan)' : 'var(--accent-red)',
      }}
    >
      <div
        className="w-2.5 h-2.5 rounded-full"
        style={{
          backgroundColor: isConnected ? 'var(--accent-cyan)' : 'var(--accent-red)',
          animation: isConnected ? 'pulseDot 2s ease-in-out infinite' : 'none',
        }}
      />
      {isConnected ? '接続中' : '切断'}
    </div>
  );
}
