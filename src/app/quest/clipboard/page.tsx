'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCookie } from '@/lib/utils';
import { useWebSocket } from '@/hooks/useWebSocket';
import { ClipboardInput } from '@/components/quest/ClipboardInput';
import { PCClipboardDisplay } from '@/components/quest/PCClipboardDisplay';
import { ClipboardHistory } from '@/components/quest/ClipboardHistory';
import { StatusBadge } from '@/components/quest/StatusBadge';
import { Toaster } from 'react-hot-toast';
import type { ClipboardEntry } from '@/lib/constants';

export default function QuestClipboardPage() {
  const router = useRouter();
  const [wsUrl, setWsUrl] = useState('');
  const [pcText, setPcText] = useState('');
  const [history, setHistory] = useState<ClipboardEntry[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = getCookie('crossclip_token');
      if (!token) {
        // Redirect to auth if no token
        router.push('/quest');
        return;
      }
      setWsUrl(`ws://${window.location.host}/ws`);
    }
  }, [router]);

  const addHistoryEntry = useCallback((text: string, source: 'pc' | 'quest') => {
    const entry: ClipboardEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      source,
      timestamp: Date.now(),
    };
    setHistory(prev => [entry, ...prev].slice(0, 50));
    setLastSyncTime(Date.now());
  }, []);

  const { isConnected, pushClipboard } = useWebSocket({
    url: wsUrl,
    token: typeof window !== 'undefined' ? getCookie('crossclip_token') : null,
    onClipboardUpdate: (text, source) => {
      setPcText(text);
      addHistoryEntry(text, source as 'pc' | 'quest');
    },
    onAuthRejected: (reason) => {
      if (reason === 'invalid_token') {
        document.cookie = 'crossclip_token=; Max-Age=0; path=/';
      }
      // Token invalid
      router.push('/quest');
    }
  });

  const handleSync = useCallback((text: string) => {
    pushClipboard(text);
    addHistoryEntry(text, 'quest');
  }, [pushClipboard, addHistoryEntry]);

  if (!wsUrl) return null;

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] pt-2">
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            fontSize: '16px',
            padding: '14px 20px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
          }
        }} 
      />
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-lg text-sm font-bold"
            style={{ background: 'var(--accent-cyan)', color: '#000' }}
          >
            C
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>CrossClip</h1>
            {lastSyncTime && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                最終同期: {new Date(lastSyncTime).toLocaleTimeString('ja-JP')}
              </p>
            )}
          </div>
        </div>
        <StatusBadge isConnected={isConnected} />
      </div>

      {/* Sync indicator bar */}
      {isConnected && (
        <div 
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg mb-5"
          style={{ 
            background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.08), rgba(0, 212, 255, 0.03))',
            border: '1px solid rgba(0, 212, 255, 0.15)',
          }}
        >
          <div className="sync-pulse-dot" />
          <span className="text-xs font-medium" style={{ color: 'var(--accent-cyan)' }}>
            リアルタイム同期が有効です
          </span>
          <div className="flex-1" />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Quest ↔ PC
          </span>
        </div>
      )}

      {/* Main clipboard area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <ClipboardInput onSync={handleSync} debounceMs={300} />
        <PCClipboardDisplay text={pcText} />
      </div>

      {/* History */}
      <ClipboardHistory entries={history} />
    </div>
  );
}
