'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { WS_MESSAGE_TYPES, type ClipboardEntry } from '@/lib/constants';
import { generateId } from '@/lib/utils';

interface WebSocketMessage {
  type: string;
  payload?: any;
  token?: string;
  requestId?: string;
}

interface UseWebSocketOptions {
  url: string;
  token?: string | null;
  onClipboardUpdate?: (text: string, source: string, timestamp: number) => void;
  onAuthCodeReady?: () => void;
  onAuthSuccess?: (token: string, expiresAt: number) => void;
  onAuthRejected?: (reason: string) => void;
  onAuthCodeInvalid?: (attemptsRemaining: number) => void;
  onAuthCodeExpired?: () => void;
  onAuthLocked?: (unlockAt: number) => void;
  onConnectionLimit?: (maxDevices: number) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const pingTimerRef = useRef<ReturnType<typeof setInterval>>();
  const reconnectAttempts = useRef(0);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (!options.url) return;

    try {
      const ws = new WebSocket(options.url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttempts.current = 0;
        options.onConnected?.();

        // Start ping interval
        pingTimerRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: WS_MESSAGE_TYPES.PING }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const msg: WebSocketMessage = JSON.parse(event.data);
          switch (msg.type) {
            case WS_MESSAGE_TYPES.CLIPBOARD_UPDATE:
              options.onClipboardUpdate?.(
                msg.payload.text,
                msg.payload.source,
                msg.payload.timestamp
              );
              break;
            case WS_MESSAGE_TYPES.AUTH_CODE_READY:
              options.onAuthCodeReady?.();
              break;
            case WS_MESSAGE_TYPES.AUTH_SUCCESS:
              options.onAuthSuccess?.(msg.payload.token, msg.payload.expiresAt);
              break;
            case WS_MESSAGE_TYPES.AUTH_REJECTED:
              options.onAuthRejected?.(msg.payload.reason);
              break;
            case WS_MESSAGE_TYPES.AUTH_CODE_INVALID:
              options.onAuthCodeInvalid?.(msg.payload.attemptsRemaining);
              break;
            case WS_MESSAGE_TYPES.AUTH_CODE_EXPIRED:
              options.onAuthCodeExpired?.();
              break;
            case WS_MESSAGE_TYPES.AUTH_LOCKED:
              options.onAuthLocked?.(msg.payload.unlockAt);
              break;
            case WS_MESSAGE_TYPES.CONNECTION_LIMIT:
              options.onConnectionLimit?.(msg.payload.maxDevices);
              break;
            case WS_MESSAGE_TYPES.PONG:
              // Keep-alive response, no action needed
              break;
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        options.onDisconnected?.();
        if (pingTimerRef.current) {
          clearInterval(pingTimerRef.current);
        }

        // Exponential backoff reconnection
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectAttempts.current++;
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      console.error('WebSocket connection failed:', e);
    }
  }, [options.url]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current);
    }
    reconnectAttempts.current = Infinity; // Prevent reconnection
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  }, []);

  const send = useCallback(
    (type: string, payload?: any, extra?: Record<string, any>) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const msg: WebSocketMessage = { type, ...extra };
        if (payload) msg.payload = payload;
        if (options.token) msg.token = options.token;
        wsRef.current.send(JSON.stringify(msg));
      }
    },
    [options.token]
  );

  const pushClipboard = useCallback(
    (text: string) => {
      send(WS_MESSAGE_TYPES.CLIPBOARD_PUSH, { text });
    },
    [send]
  );

  const submitAuthCode = useCallback(
    (code: string, requestId: string) => {
      send(WS_MESSAGE_TYPES.AUTH_CODE_SUBMIT, { code }, { requestId });
    },
    [send]
  );

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [options.url]);

  return {
    isConnected,
    send,
    pushClipboard,
    submitAuthCode,
    connect,
    disconnect,
  };
}
