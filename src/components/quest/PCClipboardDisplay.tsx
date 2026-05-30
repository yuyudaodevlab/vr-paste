'use client';

import { useState, useEffect } from 'react';
import { useClipboard } from '@/hooks/useClipboard';
import { formatTimestamp } from '@/lib/utils';
import toast from 'react-hot-toast';

interface PCClipboardDisplayProps {
  text: string;
}

export function PCClipboardDisplay({ text }: PCClipboardDisplayProps) {
  const { writeClipboard } = useClipboard();
  const [isCopied, setIsCopied] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [updateTime, setUpdateTime] = useState<number | null>(null);

  // Flash animation when new text arrives
  useEffect(() => {
    if (text) {
      setIsFlashing(true);
      setUpdateTime(Date.now());
      const timer = setTimeout(() => setIsFlashing(false), 800);
      return () => clearTimeout(timer);
    }
  }, [text]);

  const handleCopy = async () => {
    if (!text) return;
    const success = await writeClipboard(text);
    if (success) {
      setIsCopied(true);
      toast.success('クリップボードにコピーしました', { icon: '✅' });
      setTimeout(() => setIsCopied(false), 2000);
    } else {
      toast.error('コピーに失敗しました');
    }
  };

  return (
    <div 
      className="card-elevated flex flex-col h-full min-h-[280px] transition-all duration-300"
      style={{
        borderColor: isFlashing ? 'var(--accent-amber)' : undefined,
        boxShadow: isFlashing ? '0 0 20px rgba(245, 158, 11, 0.1)' : undefined,
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              PC → Quest
            </h2>
          </div>
          {isFlashing && (
            <span 
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ 
                background: 'rgba(245, 158, 11, 0.15)', 
                color: 'var(--accent-amber)',
                animation: 'fadeIn 200ms ease-out',
              }}
            >
              更新あり
            </span>
          )}
        </div>
        <button 
          onClick={handleCopy}
          className={`btn text-sm font-bold ${isCopied ? 'btn-secondary' : 'btn-primary'}`}
          style={{ 
            minHeight: '36px', 
            padding: '0 16px',
            transition: 'all 0.2s ease',
          }}
          disabled={!text}
        >
          {isCopied ? '✅ コピー済み' : '📋 コピー'}
        </button>
      </div>

      {/* Content display */}
      <div 
        className="flex-1 w-full rounded-lg p-4 overflow-y-auto text-base whitespace-pre-wrap break-words transition-colors duration-300"
        style={{ 
          backgroundColor: 'var(--bg-base)', 
          border: `1px solid ${isFlashing ? 'rgba(245, 158, 11, 0.3)' : 'var(--border)'}`,
          color: 'var(--text-primary)', 
          lineHeight: '1.6',
          minHeight: '160px',
        }}
      >
        {text ? (
          text
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3" style={{ minHeight: '120px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span style={{ color: 'var(--text-muted)' }}>
              PCのクリップボード内容がここに表示されます
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3">
        <span 
          className="text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          {updateTime ? `更新: ${new Date(updateTime).toLocaleTimeString('ja-JP')}` : '待機中'}
        </span>
        {text && (
          <span 
            className="text-xs font-mono"
            style={{ 
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {text.length.toLocaleString()} 文字
          </span>
        )}
      </div>
    </div>
  );
}
