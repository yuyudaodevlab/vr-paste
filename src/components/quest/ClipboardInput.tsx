'use client';

import { useState, useCallback, useEffect } from 'react';
import { debounce } from '@/lib/utils';

interface ClipboardInputProps {
  onSync: (text: string) => void;
  debounceMs?: number;
}

export function ClipboardInput({ onSync, debounceMs = 300 }: ClipboardInputProps) {
  const [text, setText] = useState('');

  // Use useCallback to memoize the debounced function
  const debouncedSync = useCallback(
    debounce((newText: string) => {
      onSync(newText);
    }, debounceMs),
    [onSync, debounceMs]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    debouncedSync(newText);
  };

  const handleClear = () => {
    setText('');
    // We don't push empty text on clear according to spec, or maybe we do?
    // "クリア button to clear the input area without pushing to PC."
  };

  return (
    <div className="card-elevated flex flex-col h-full min-h-[300px]">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>送信するテキスト</h2>
        <button 
          onClick={handleClear}
          className="btn btn-secondary"
          style={{ minHeight: '48px', padding: '0 24px' }}
        >
          クリア
        </button>
      </div>
      <textarea
        className="input flex-1 w-full text-lg resize-none"
        style={{ padding: '16px', lineHeight: '1.5' }}
        value={text}
        onChange={handleChange}
        placeholder="ここに入力したテキストがPCに同期されます..."
      />
    </div>
  );
}
