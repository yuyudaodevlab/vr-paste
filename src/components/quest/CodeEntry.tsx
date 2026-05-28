'use client';

import { useState, useRef, useEffect } from 'react';
import { formatDuration } from '@/lib/utils';

interface CodeEntryProps {
  onSubmit: (code: string) => void;
  error: string | null;
  attemptsRemaining: number | null;
  lockedUntil: number | null;
}

export function CodeEntry({ onSubmit, error, attemptsRemaining, lockedUntil }: CodeEntryProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [lockRemaining, setLockRemaining] = useState(0);

  useEffect(() => {
    if (!lockedUntil) return;
    
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
      setLockRemaining(remaining);
    };
    
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [lockedUntil]);

  const handleChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleSubmit = () => {
    const fullCode = code.join('');
    if (fullCode.length === 6) {
      onSubmit(fullCode);
    }
  };

  if (lockedUntil && lockRemaining > 0) {
    return (
      <div className="card-elevated text-center max-w-md w-full mx-auto" style={{ padding: '32px' }}>
        <p className="text-lg font-bold mb-4" style={{ color: 'var(--accent-red)' }}>
          試行回数が上限に達しました。
        </p>
        <p className="text-xl font-mono mb-4" style={{ color: 'var(--accent-amber)' }}>
          {formatDuration(lockRemaining)}
        </p>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          後に再試行してください。
        </p>
      </div>
    );
  }

  return (
    <div className="card-elevated text-center max-w-md w-full mx-auto" style={{ padding: '32px' }}>
      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        承認コードの入力
      </h2>
      <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
        PCに表示された6桁のコードを入力してください
      </p>

      <div className="flex justify-center gap-2 sm:gap-4 mb-8">
        {code.map((digit, i) => (
          <input
            key={i}
            ref={el => { inputsRef.current[i] = el; }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="code-digit-input"
          />
        ))}
      </div>

      {error && (
        <div className="mb-6 text-sm">
          <p style={{ color: 'var(--accent-red)' }} className="font-bold mb-1">{error}</p>
          {attemptsRemaining !== null && (
            <p style={{ color: 'var(--text-secondary)' }}>残り試行回数: {attemptsRemaining}回</p>
          )}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={code.join('').length !== 6}
        className="btn btn-primary w-full text-lg font-bold"
        style={{ minHeight: '56px' }}
      >
        確認
      </button>
    </div>
  );
}
