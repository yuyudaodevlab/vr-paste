'use client';

import { useCallback } from 'react';
import { isTauriEnvironment } from '@/lib/utils';

export function useClipboard() {
  const readClipboard = useCallback(async (): Promise<string | null> => {
    if (isTauriEnvironment()) {
      try {
        const { readText } = await import('@tauri-apps/plugin-clipboard-manager');
        return await readText();
      } catch (e) {
        console.error('Failed to read clipboard via Tauri:', e);
        return null;
      }
    } else {
      // Quest browser
      try {
        return await navigator.clipboard.readText();
      } catch (e) {
        console.error('Failed to read clipboard via browser:', e);
        return null;
      }
    }
  }, []);

  const writeClipboard = useCallback(async (text: string): Promise<boolean> => {
    if (isTauriEnvironment()) {
      try {
        const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
        await writeText(text);
        return true;
      } catch (e) {
        console.error('Failed to write clipboard via Tauri:', e);
        return false;
      }
    } else {
      // Quest browser
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {
        console.error('Failed to write clipboard via browser:', e);
        return false;
      }
    }
  }, []);

  return { readClipboard, writeClipboard };
}
