'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCookie } from '@/lib/utils';
import { useWebSocket } from '@/hooks/useWebSocket';
import { ClipboardInput } from '@/components/quest/ClipboardInput';
import { PCClipboardDisplay } from '@/components/quest/PCClipboardDisplay';
import { StatusBadge } from '@/components/quest/StatusBadge';
import { Toaster } from 'react-hot-toast';

export default function QuestClipboardPage() {
  const router = useRouter();
  const [wsUrl, setWsUrl] = useState('');
  const [pcText, setPcText] = useState('');
  
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

  const { isConnected, pushClipboard } = useWebSocket({
    url: wsUrl,
    token: typeof window !== 'undefined' ? getCookie('crossclip_token') : null,
    onClipboardUpdate: (text) => {
      setPcText(text);
    },
    onAuthRejected: () => {
      // Token invalid
      router.push('/quest');
    }
  });

  const handleSync = (text: string) => {
    pushClipboard(text);
  };

  if (!wsUrl) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] pt-4">
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            fontSize: '18px',
            padding: '16px 24px',
            borderRadius: '12px'
          }
        }} 
      />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>CrossClip</h1>
        <StatusBadge isConnected={isConnected} />
      </div>
      
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ClipboardInput onSync={handleSync} debounceMs={300} />
        <PCClipboardDisplay text={pcText} />
      </div>
    </div>
  );
}
