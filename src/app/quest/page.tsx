'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCookie } from '@/lib/utils';
import { AUTH_STATES, type AuthState } from '@/lib/constants';
import { AuthRequest } from '@/components/quest/AuthRequest';
import { CodeEntry } from '@/components/quest/CodeEntry';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function QuestPage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>(AUTH_STATES.IDLE);
  const [wsUrl, setWsUrl] = useState('');
  const [ip, setIp] = useState('');
  const [port, setPort] = useState(0);
  const [requestId, setRequestId] = useState<string | null>(null);
  
  const [codeError, setCodeError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  useEffect(() => {
    // Basic init
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      const portVal = parseInt(window.location.port) || (window.location.protocol === 'https:' ? 443 : 80);
      setIp(host);
      setPort(portVal);
      setWsUrl(`ws://${window.location.host}/ws`);

      // If token exists, just redirect to clipboard
      const token = getCookie('crossclip_token');
      if (token) {
        router.push('/quest/clipboard');
      }
    }
  }, [router]);

  useWebSocket({
    url: wsUrl,
    onAuthCodeReady: () => {
      setAuthState(AUTH_STATES.CODE_ENTRY);
    },
    onAuthRejected: () => {
      setAuthState(AUTH_STATES.REJECTED);
    },
    onConnectionLimit: () => {
      setAuthState(AUTH_STATES.ERROR);
    }
  });

  const handleAuthRequest = async () => {
    setAuthState(AUTH_STATES.WAITING);
    try {
      const res = await fetch('/api/auth/request', {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setRequestId(data.requestId);
      } else if (res.status === 403) {
        const data = await res.json().catch(() => null);
        if (data?.error === 'CONNECTION_LIMIT') {
          setAuthState(AUTH_STATES.ERROR);
        } else {
          setAuthState(AUTH_STATES.ERROR);
        }
      } else {
        setAuthState(AUTH_STATES.REJECTED);
      }
    } catch (e) {
      setAuthState(AUTH_STATES.REJECTED);
    }
  };

  const handleRetry = () => {
    setAuthState(AUTH_STATES.IDLE);
  };

  const handleCodeSubmit = async (code: string) => {
    if (!requestId) return;
    try {
      const res = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, requestId }),
        credentials: 'same-origin',
      });
      if (res.ok) {
        // Cookie is set by the server via Set-Cookie header
        // Redirect to clipboard page
        router.push('/quest/clipboard');
      } else {
        const data = await res.json();
        if (data.error === 'LOCKED') {
          const lockout = (await res.json().catch(() => null));
          setLockedUntil(Date.now() + 10 * 60 * 1000); // 10 min lockout
          setAuthState(AUTH_STATES.LOCKED);
        } else if (data.error === 'EXPIRED') {
          setCodeError('承認コードの有効期限が切れました');
        } else {
          setCodeError('コードが正しくありません');
          setAttemptsRemaining(data.attemptsRemaining ?? null);
          if (data.attemptsRemaining === 0) {
            setLockedUntil(Date.now() + 10 * 60 * 1000);
          }
        }
      }
    } catch (e) {
      setCodeError('通信エラーが発生しました');
    }
  };

  if (authState === AUTH_STATES.CODE_ENTRY || lockedUntil) {
    return (
      <div className="flex items-center justify-center h-full">
        <CodeEntry 
          onSubmit={handleCodeSubmit}
          error={codeError}
          attemptsRemaining={attemptsRemaining}
          lockedUntil={lockedUntil}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <AuthRequest 
        onRequestSent={handleAuthRequest}
        status={authState}
        onRetry={handleRetry}
        ip={ip}
        port={port}
      />
    </div>
  );
}
