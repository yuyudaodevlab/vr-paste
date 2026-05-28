'use client';

import type { AuthState } from '@/lib/constants';
import { AUTH_STATES } from '@/lib/constants';

interface AuthRequestProps {
  onRequestSent: () => void;
  status: AuthState;
  onRetry: () => void;
  ip: string;
  port: number;
}

export function AuthRequest({ onRequestSent, status, onRetry, ip, port }: AuthRequestProps) {
  return (
    <div className="card-elevated text-center max-w-md w-full mx-auto" style={{ padding: '32px' }}>
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>PCに接続</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          以下のPCに接続リクエストを送信します。
        </p>
        <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--border)' }}>
          <span className="font-mono text-lg" style={{ color: 'var(--accent-cyan)' }}>
            {ip}:{port}
          </span>
        </div>
      </div>

      {status === AUTH_STATES.IDLE && (
        <button
          onClick={onRequestSent}
          className="btn btn-primary w-full text-lg font-bold"
          style={{ minHeight: '56px' }}
        >
          PCに接続リクエストを送る
        </button>
      )}

      {status === AUTH_STATES.WAITING && (
        <div className="flex flex-col items-center justify-center space-y-4" style={{ minHeight: '56px' }}>
          <div className="w-8 h-8 rounded-full border-4 border-cyan-400/30 border-t-cyan-400 animate-[spin_1s_linear_infinite]" />
          <p className="text-sm font-bold" style={{ color: 'var(--accent-cyan)' }}>
            PC側で承認をお待ちください...
          </p>
        </div>
      )}

      {status === AUTH_STATES.REJECTED && (
        <div className="space-y-4">
          <p className="text-sm font-bold" style={{ color: 'var(--accent-red)' }}>
            接続が拒否されました
          </p>
          <button
            onClick={onRetry}
            className="btn btn-secondary w-full text-lg"
            style={{ minHeight: '56px' }}
          >
            再試行
          </button>
        </div>
      )}

      {status === AUTH_STATES.ERROR && (
        <div className="space-y-4">
          <p className="text-sm font-bold leading-relaxed" style={{ color: 'var(--accent-amber)' }}>
            別のデバイスが接続中です。<br/>PCの設定から同時接続数を変更できます。
          </p>
          <button
            onClick={onRetry}
            className="btn btn-secondary w-full text-lg"
            style={{ minHeight: '56px' }}
          >
            再試行
          </button>
        </div>
      )}
    </div>
  );
}
