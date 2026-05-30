'use client';

import { useState, useCallback, useRef } from 'react';
import { debounce } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ClipboardInputProps {
  onSync: (text: string) => void;
  debounceMs?: number;
}

export function ClipboardInput({ onSync, debounceMs = 300 }: ClipboardInputProps) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Use useCallback to memoize the debounced function
  const debouncedSync = useCallback(
    debounce((newText: string) => {
      if (newText.trim()) {
        onSync(newText);
        triggerSendFeedback();
      }
    }, debounceMs),
    [onSync, debounceMs]
  );

  const triggerSendFeedback = () => {
    setIsSending(true);
    setTimeout(() => setIsSending(false), 600);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    setCharCount(newText.length);
    debouncedSync(newText);
  };

  const handleSendNow = () => {
    if (!text.trim()) return;
    onSync(text);
    triggerSendFeedback();
    toast.success('PCに送信しました', { icon: '📋' });
  };

  const handleClear = () => {
    setText('');
    setCharCount(0);
    textareaRef.current?.focus();
  };

  const handlePaste = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        setText(clipText);
        setCharCount(clipText.length);
        onSync(clipText);
        triggerSendFeedback();
        toast.success('ペーストして送信しました', { icon: '📋' });
      }
    } catch {
      toast.error('クリップボードの読み取りに失敗しました');
    }
  };

  return (
    <div 
      className="card-elevated flex flex-col h-full min-h-[280px] transition-all duration-300"
      style={{
        borderColor: isSending ? 'var(--accent-cyan)' : undefined,
        boxShadow: isSending ? '0 0 20px rgba(0, 212, 255, 0.1)' : undefined,
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Quest → PC
            </h2>
          </div>
          {isSending && (
            <span 
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ 
                background: 'rgba(0, 212, 255, 0.15)', 
                color: 'var(--accent-cyan)',
                animation: 'fadeIn 200ms ease-out',
              }}
            >
              送信中...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handlePaste}
            className="btn btn-ghost text-sm px-3 py-1.5"
            style={{ color: 'var(--accent-cyan)' }}
            title="クリップボードからペースト"
          >
            📋 ペースト
          </button>
          <button 
            onClick={handleClear}
            className="btn btn-ghost text-sm px-3 py-1.5"
            disabled={!text}
          >
            クリア
          </button>
        </div>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        className="input flex-1 w-full text-base resize-none"
        style={{ 
          padding: '14px', 
          lineHeight: '1.6',
          minHeight: '160px',
        }}
        value={text}
        onChange={handleChange}
        placeholder="ここに入力したテキストがPCに同期されます..."
      />

      {/* Footer */}
      <div className="flex items-center justify-between mt-3">
        <span 
          className="text-xs font-mono"
          style={{ 
            color: charCount > 0 ? 'var(--text-secondary)' : 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {charCount > 0 ? `${charCount.toLocaleString()} 文字` : '入力待ち'}
        </span>
        <button
          onClick={handleSendNow}
          disabled={!text.trim()}
          className="btn btn-primary text-sm font-bold"
          style={{ 
            minHeight: '40px', 
            padding: '0 20px',
            minWidth: '120px',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
          PCに送信
        </button>
      </div>
    </div>
  );
}
