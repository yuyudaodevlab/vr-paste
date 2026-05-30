'use client';

import { useState, useEffect } from 'react';
import { useClipboardStore } from '@/store/clipboardStore';
import { useClipboard } from '@/hooks/useClipboard';
import { truncateText } from '@/lib/utils';
import toast from 'react-hot-toast';

export function ClipboardPanel() {
  const currentText = useClipboardStore((s) => s.currentText);
  const isExpanded = useClipboardStore((s) => s.isExpanded);
  const setIsExpanded = useClipboardStore((s) => s.setIsExpanded);
  const { writeClipboard } = useClipboard();
  const [isFlashing, setIsFlashing] = useState(false);
  const [lastSource, setLastSource] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const displayText = isExpanded ? currentText : truncateText(currentText, 300);
  const isTruncated = currentText.length > 300;

  // Flash animation on content change
  useEffect(() => {
    if (currentText) {
      setIsFlashing(true);
      const timer = setTimeout(() => setIsFlashing(false), 800);
      return () => clearTimeout(timer);
    }
  }, [currentText]);

  const handleCopy = async () => {
    if (currentText) {
      const success = await writeClipboard(currentText);
      if (success) {
        setIsCopied(true);
        toast.success('クリップボードにコピーしました');
        setTimeout(() => setIsCopied(false), 2000);
      }
    }
  };

  const handleClear = () => {
    // This will be handled by Tauri command
    toast.success('クリップボードをクリアしました');
  };

  return (
    <div 
      className="card transition-all duration-300"
      style={{
        borderColor: isFlashing ? 'var(--accent-cyan)' : undefined,
        boxShadow: isFlashing ? '0 0 16px rgba(0, 212, 255, 0.08)' : undefined,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2
            className="text-sm font-semibold"
            style={{ color: 'var(--text-secondary)' }}
          >
            クリップボード
          </h2>
          {isFlashing && (
            <span 
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ 
                background: 'rgba(0, 212, 255, 0.12)', 
                color: 'var(--accent-cyan)',
                animation: 'fadeIn 200ms ease-out',
              }}
            >
              更新
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={handleCopy} 
            className={`btn text-xs px-2.5 py-1 ${isCopied ? 'btn-ghost' : 'btn-secondary'}`}
            style={isCopied ? { color: 'var(--accent-cyan)' } : undefined}
          >
            {isCopied ? '✓ コピー済' : 'コピー'}
          </button>
          <button onClick={handleClear} className="btn btn-ghost text-xs px-2.5 py-1">
            クリア
          </button>
        </div>
      </div>

      {currentText ? (
        <div>
          <pre
            className="text-sm whitespace-pre-wrap break-all p-3 rounded-md transition-colors duration-300"
            style={{
              backgroundColor: 'var(--bg-base)',
              border: `1px solid ${isFlashing ? 'rgba(0, 212, 255, 0.2)' : 'var(--border)'}`,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              maxHeight: isExpanded ? 'none' : '120px',
              overflow: isExpanded ? 'auto' : 'hidden',
            }}
          >
            {displayText}
          </pre>
          <div className="flex items-center justify-between mt-2">
            {isTruncated && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs transition-colors"
                style={{ color: 'var(--accent-cyan)' }}
              >
                {isExpanded ? '折りたたむ' : '全文表示'}
              </button>
            )}
            <span 
              className="text-xs font-mono ml-auto"
              style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
            >
              {currentText.length.toLocaleString()} 文字
            </span>
          </div>
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
