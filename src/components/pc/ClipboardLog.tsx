'use client';

import { useEffect, useRef, useState } from 'react';
import { useClipboardStore } from '@/store/clipboardStore';
import { useClipboard } from '@/hooks/useClipboard';
import { truncateText, formatTimestamp, tauriInvoke } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { ClipboardEntry } from '@/lib/constants';

export function ClipboardLog() {
  const log = useClipboardStore((s) => s.log);
  const clearLog = useClipboardStore((s) => s.clearLog);
  const { writeClipboard } = useClipboard();
  const [flashId, setFlashId] = useState<string | null>(null);
  const prevLogLength = useRef(log.length);

  // Flash highlight on new entry
  useEffect(() => {
    if (log.length > prevLogLength.current && log.length > 0) {
      setFlashId(log[0].id);
      const timer = setTimeout(() => setFlashId(null), 500);
      return () => clearTimeout(timer);
    }
    prevLogLength.current = log.length;
  }, [log.length]);

  const handleRecopy = async (text: string) => {
    const success = await writeClipboard(text);
    if (success) toast.success('再コピーしました');
  };

  const handleClearLog = async () => {
    await tauriInvoke('clear_clipboard_log');
    clearLog();
    toast.success('ログをクリアしました');
  };

  return (
    <div className="card flex flex-col" style={{ minHeight: '200px' }}>
      <div className="flex items-center justify-between mb-3">
        <h2
          className="text-sm font-semibold"
          style={{ color: 'var(--text-secondary)' }}
        >
          クリップボードログ
        </h2>
        {log.length > 0 && (
          <button onClick={handleClearLog} className="btn btn-ghost text-xs px-2.5 py-1">
            ログをクリア
          </button>
        )}
      </div>

      {log.length === 0 ? (
        <div
          className="flex-1 flex items-center justify-center text-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          ログはまだありません
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-1" style={{ maxHeight: '400px' }}>
          {log.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors"
              style={{
                backgroundColor: flashId === entry.id ? 'rgba(0, 212, 255, 0.1)' : 'var(--bg-base)',
                border: '1px solid var(--border)',
                animation: flashId === entry.id ? 'flashHighlight 500ms ease-out' : 'none',
              }}
            >
              {/* Timestamp */}
              <span
                className="flex-shrink-0 text-xs font-mono"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
              >
                {formatTimestamp(entry.timestamp)}
              </span>

              {/* Source badge */}
              <span
                className={`badge flex-shrink-0 ${
                  entry.source === 'pc' ? 'badge-pc' : 'badge-quest'
                }`}
              >
                {entry.source === 'pc' ? 'PC' : 'Quest'}
              </span>

              {/* Content preview */}
              <span
                className="flex-1 truncate text-xs"
                style={{ color: 'var(--text-primary)' }}
              >
                {truncateText(entry.text, 100)}
              </span>

              {/* Re-copy button */}
              <button
                onClick={() => handleRecopy(entry.text)}
                className="btn btn-ghost text-xs px-2 py-1 flex-shrink-0"
                style={{ color: 'var(--accent-cyan)' }}
              >
                再コピー
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
