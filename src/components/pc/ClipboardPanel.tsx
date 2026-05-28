'use client';

import { useState } from 'react';
import { useClipboardStore } from '@/store/clipboardStore';
import { useClipboard } from '@/hooks/useClipboard';
import { truncateText } from '@/lib/utils';
import toast from 'react-hot-toast';

export function ClipboardPanel() {
  const currentText = useClipboardStore((s) => s.currentText);
  const isExpanded = useClipboardStore((s) => s.isExpanded);
  const setIsExpanded = useClipboardStore((s) => s.setIsExpanded);
  const { writeClipboard } = useClipboard();

  const displayText = isExpanded ? currentText : truncateText(currentText, 300);
  const isTruncated = currentText.length > 300;

  const handleCopy = async () => {
    if (currentText) {
      const success = await writeClipboard(currentText);
      if (success) toast.success('クリップボードにコピーしました');
    }
  };

  const handleClear = () => {
    // This will be handled by Tauri command
    toast.success('クリップボードをクリアしました');
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2
          className="text-sm font-semibold"
          style={{ color: 'var(--text-secondary)' }}
        >
          クリップボード
        </h2>
        <div className="flex items-center gap-1.5">
          <button onClick={handleCopy} className="btn btn-secondary text-xs px-2.5 py-1">
            コピー
          </button>
          <button onClick={handleClear} className="btn btn-ghost text-xs px-2.5 py-1">
            クリア
          </button>
        </div>
      </div>

      {currentText ? (
        <div>
          <pre
            className="text-sm whitespace-pre-wrap break-all p-3 rounded-md"
            style={{
              backgroundColor: 'var(--bg-base)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              maxHeight: isExpanded ? 'none' : '120px',
              overflow: isExpanded ? 'auto' : 'hidden',
            }}
          >
            {displayText}
          </pre>
          {isTruncated && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs mt-2 transition-colors"
              style={{ color: 'var(--accent-cyan)' }}
            >
              {isExpanded ? '折りたたむ' : '全文表示'}
            </button>
          )}
        </div>
      ) : (
        <div
          className="text-center py-6 text-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          クリップボードは空です
        </div>
      )}
    </div>
  );
}
