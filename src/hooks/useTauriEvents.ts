'use client';

import { useEffect, useRef, useCallback } from 'react';
import { tauriListen, tauriInvoke } from '@/lib/utils';
import { useConnectionStore } from '@/store/connectionStore';
import { useClipboardStore } from '@/store/clipboardStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { ServerInfo, DeviceInfo, AuthRequest, ClipboardEntry, Settings } from '@/lib/constants';

export function useTauriEvents() {
  const unlisteners = useRef<((() => void) | null)[]>([]);

  const setServerInfo = useConnectionStore((s) => s.setServerInfo);
  const setConnectedDevices = useConnectionStore((s) => s.setConnectedDevices);
  const addDevice = useConnectionStore((s) => s.addDevice);
  const removeDevice = useConnectionStore((s) => s.removeDevice);
  const addAuthRequest = useConnectionStore((s) => s.addAuthRequest);
  const removeAuthRequest = useConnectionStore((s) => s.removeAuthRequest);
  const setApprovalCode = useConnectionStore((s) => s.setApprovalCode);
  const setCurrentText = useClipboardStore((s) => s.setCurrentText);
  const addLogEntry = useClipboardStore((s) => s.addLogEntry);
  const setLog = useClipboardStore((s) => s.setLog);
  const setSettings = useSettingsStore((s) => s.setSettings);
  const setIsFirstLaunch = useSettingsStore((s) => s.setIsFirstLaunch);

  // Load initial data from Tauri backend
  const loadInitialData = useCallback(async () => {
    const serverInfo = await tauriInvoke<ServerInfo>('get_server_info');
    if (serverInfo) setServerInfo(serverInfo);

    const devices = await tauriInvoke<DeviceInfo[]>('get_connected_devices');
    if (devices) setConnectedDevices(devices);

    const log = await tauriInvoke<ClipboardEntry[]>('get_clipboard_log');
    if (log) setLog(log);

    const settings = await tauriInvoke<Settings>('get_settings');
    if (settings) setSettings(settings);

    const isFirst = await tauriInvoke<boolean>('is_first_launch');
    if (isFirst !== null) setIsFirstLaunch(isFirst);
  }, []);

  useEffect(() => {
    loadInitialData();

    // Listen for Tauri events
    const setupListeners = async () => {
      const u1 = await tauriListen('server-status-changed', (payload: ServerInfo) => {
        setServerInfo(payload);
      });

      const u2 = await tauriListen('device-connected', (payload: DeviceInfo) => {
        addDevice(payload);
      });

      const u3 = await tauriListen('device-disconnected', (payload: { id: string }) => {
        removeDevice(payload.id);
      });

      const u4 = await tauriListen('auth-request', (payload: AuthRequest) => {
        addAuthRequest(payload);
      });

      const u5 = await tauriListen('auth-request-resolved', (payload: { id: string }) => {
        removeAuthRequest(payload.id);
      });

      const u6 = await tauriListen('approval-code-generated', (payload: { code: string; expiry: number; requestId: string }) => {
        setApprovalCode(payload.code, payload.expiry, payload.requestId);
      });

      const u7 = await tauriListen('clipboard-updated', (payload: { text: string; entry: ClipboardEntry }) => {
        setCurrentText(payload.text);
        addLogEntry(payload.entry);
      });

      const u8 = await tauriListen('settings-changed', (payload: Settings) => {
        setSettings(payload);
      });

      unlisteners.current = [u1, u2, u3, u4, u5, u6, u7, u8];
    };

    setupListeners();

    return () => {
      unlisteners.current.forEach((u) => u?.());
      unlisteners.current = [];
    };
  }, []);

  return { loadInitialData };
}
