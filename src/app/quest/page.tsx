'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCookie, setCookie } from '@/lib/utils';
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

  const ws = useWebSocket({
    url: wsUrl,
    onAuthCodeReady: () => {
      setAuthState(AUTH_STATES.CODE_ENTRY);
    },
    onAuthRejected: (reason) => {
      setAuthState(AUTH_STATES.REJECTED);
    },
    onAuthSuccess: (token, expiresAt) => {
      // Save token as cookie so clipboard page can use it
      const daysUntilExpiry = Math.max(1, Math.ceil((expiresAt - Date.now()) / 86400000));
      setCookie('crossclip_token', token, daysUntilExpiry);
      
      // Small delay to ensure cookie is set before navigation
      setTimeout(() => {
        router.push('/quest/clipboard');
      }, 100);
    },
    onAuthCodeInvalid: (attempts) => {
      setCodeError('コードが正しくありません');
      setAttemptsRemaining(attempts);
    },
    onAuthLocked: (unlockTime) => {
      setLockedUntil(unlockTime);
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
        setAuthState(AUTH_STATES.ERROR); // e.g. Limit reached
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

  const handleCodeSubmit = (code: string) => {
    if (requestId) {
      ws.submitAuthCode(code, requestId);
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
