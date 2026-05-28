'use client';

import { useConnectionStore } from '@/store/connectionStore';
import { tauriInvoke } from '@/lib/utils';
import toast from 'react-hot-toast';

export function DeviceList() {
  const connectedDevices = useConnectionStore((s) => s.connectedDevices);

  const handleDisconnect = async (deviceId: string) => {
    await tauriInvoke('disconnect_device', { deviceId });
    toast.success('デバイスを切断しました');
  };

  const handleRevoke = async (deviceId: string) => {
    await tauriInvoke('revoke_device_session', { deviceId });
    toast.success('認証を取り消しました');
  };

  return (
    <div className="card">
      <h2
        className="text-sm font-semibold mb-3"
        style={{ color: 'var(--text-secondary)' }}
      >
        接続デバイス一覧
      </h2>

      {connectedDevices.length === 0 ? (
        <div
          className="text-center py-6 text-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          接続中のデバイスはありません
        </div>
      ) : (
        <div className="space-y-2">
          {connectedDevices.map((device) => (
            <div
              key={device.id}
              className="flex items-center justify-between px-3 py-2.5 rounded-md"
              style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--border)' }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: 'var(--accent-cyan)',
                      animation: 'pulseDot 2s ease-in-out infinite',
                    }}
                  />
                  <span
                    className="text-sm font-mono truncate"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}
                  >
                    {device.ip}
                  </span>
                  {device.nickname && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                    >
                      {device.nickname}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                <button
                  onClick={() => handleDisconnect(device.id)}
                  className="btn btn-ghost text-xs px-2 py-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  切断
                </button>
                <button
                  onClick={() => handleRevoke(device.id)}
                  className="btn btn-ghost text-xs px-2 py-1"
                  style={{ color: 'var(--accent-red)' }}
                >
                  認証取消
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
