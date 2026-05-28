'use client';

import { useClipboard } from '@/hooks/useClipboard';
import toast from 'react-hot-toast';

interface PCClipboardDisplayProps {
  text: string;
}

export function PCClipboardDisplay({ text }: PCClipboardDisplayProps) {
  const { writeClipboard } = useClipboard();

  const handleCopy = async () => {
    if (!text) return;
    const success = await writeClipboard(text);
    if (success) {
      toast.success('クリップボードにコピーしました');
    } else {
      toast.error('コピーに失敗しました');
    }
  };

  return (
    <div className="card-elevated flex flex-col h-full min-h-[300px]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>現在のPCクリップボード</h2>
        <button 
          onClick={handleCopy}
          className="btn btn-primary"
          style={{ minHeight: '48px', padding: '0 24px' }}
          disabled={!text}
        >
          クリップボードにコピー
        </button>
      </div>
      <div 
        className="flex-1 w-full rounded-md p-4 overflow-y-auto text-lg whitespace-pre-wrap break-words"
        style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)', lineHeight: '1.5' }}
      >
        {text ? text : <span style={{ color: 'var(--text-muted)' }}>PCのクリップボードは空です</span>}
      </div>
    </div>
  );
}
