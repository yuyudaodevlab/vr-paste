'use client';

import { useState } from 'react';
import { useClipboard } from '@/hooks/useClipboard';
import { truncateText } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { ClipboardEntry } from '@/lib/constants';

interface ClipboardHistoryProps {
  entries: ClipboardEntry[];
}

export function ClipboardHistory({ entries }: ClipboardHistoryProps) {
  const { writeClipboard } = useClipboard();
  const [isExpanded, setIsExpanded] = useState(false);

  const displayEntries = isExpanded ? entries : entries.slice(0, 5);

  const handleCopy = async (text: string) => {
    const success = await writeClipboard(text);
    if (success) {
      toast.success('コピーしました', { icon: '✅' });
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (entries.length === 0) return null;

  return (
    <div className="card-elevated" style={{ marginBottom: '16px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="12 8 12 12 14 14" />
            <circle cx="12" cy="12" r="10" />
          </svg>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            同期履歴
          </h3>
          <span 
            className="text-xs px-1.5 py-0.5 rounded-full font-mono"
            style={{ 
              background: 'var(--bg-base)', 
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {entries.length}
          </span>
        </div>
        {entries.length > 5 && (
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="btn btn-ghost text-xs px-2 py-1"
            style={{ color: 'var(--accent-cyan)' }}
          >
            {isExpanded ? '折りたたむ' : `すべて表示 (${entries.length})`}
          </button>
        )}
      </div>

      {/* Entries list */}
      <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight: isExpanded ? '400px' : '250px' }}>
        {displayEntries.map((entry, index) => (
          <div
            key={entry.id}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm group transition-colors duration-150"
            style={{ 
              backgroundColor: 'var(--bg-base)', 
              border: '1px solid var(--border)',
              animation: index === 0 ? 'fadeIn 300ms ease-out' : undefined,
            }}
          >
            {/* Direction indicator */}
            <div 
              className="flex-shrink-0 w-1.5 h-8 rounded-full"
              style={{ 
                background: entry.source === 'quest' 
                  ? 'var(--accent-cyan)' 
                  : 'var(--accent-amber)',
              }}
            />

            {/* Source badge */}
            <span
              className={`badge flex-shrink-0 text-xs ${
                entry.source === 'pc' ? 'badge-quest' : 'badge-pc'
              }`}
            >
              {entry.source === 'quest' ? 'Q→P' : 'P→Q'}
            </span>

            {/* Time */}
            <span
              className="flex-shrink-0 text-xs font-mono"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
            >
              {formatTime(entry.timestamp)}
            </span>

            {/* Content preview */}
            <span
              className="flex-1 truncate text-xs"
              style={{ color: 'var(--text-primary)' }}
            >
              {truncateText(entry.text, 80)}
            </span>

            {/* Copy button */}
            <button
              onClick={() => handleCopy(entry.text)}
              className="btn btn-ghost text-xs px-2 py-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: 'var(--accent-cyan)' }}
            >
              コピー
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
