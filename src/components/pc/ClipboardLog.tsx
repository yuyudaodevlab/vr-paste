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
      const timer = setTimeout(() => setFlashId(null), 600);
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
        <div className="flex items-center gap-2">
          <h2
            className="text-sm font-semibold"
            style={{ color: 'var(--text-secondary)' }}
          >
            クリップボードログ
          </h2>
          {log.length > 0 && (
            <span 
              className="text-xs px-1.5 py-0.5 rounded-full font-mono"
              style={{ 
                background: 'var(--bg-base)', 
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {log.length}
            </span>
          )}
        </div>
        {log.length > 0 && (
          <button onClick={handleClearLog} className="btn btn-ghost text-xs px-2.5 py-1">
            ログをクリア
          </button>
        )}
      </div>

      {log.length === 0 ? (
        <div
          className="flex-1 flex flex-col items-center justify-center text-sm gap-2"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          ログはまだありません
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-1" style={{ maxHeight: '400px' }}>
          {log.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-300 group"
              style={{
                backgroundColor: flashId === entry.id ? 'rgba(0, 212, 255, 0.08)' : 'var(--bg-base)',
                border: `1px solid ${flashId === entry.id ? 'rgba(0, 212, 255, 0.2)' : 'var(--border)'}`,
                animation: flashId === entry.id ? 'flashHighlight 600ms ease-out' : 'none',
              }}
            >
              {/* Direction indicator */}
              <div 
                className="flex-shrink-0 w-1 h-6 rounded-full"
                style={{ 
                  background: entry.source === 'pc' 
                    ? 'var(--accent-cyan)' 
                    : 'var(--accent-amber)',
                }}
              />

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
                className="btn btn-ghost text-xs px-2 py-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
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
