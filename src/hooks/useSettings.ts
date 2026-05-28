'use client';

import { useCallback } from 'react';
import { isTauriEnvironment, tauriInvoke } from '@/lib/utils';
import type { Settings } from '@/lib/constants';
import { useSettingsStore } from '@/store/settingsStore';

export function useSettings() {
  const { settings, updateSetting, setSettings } = useSettingsStore();

  const saveSettings = useCallback(async (newSettings: Settings) => {
    if (isTauriEnvironment()) {
      await tauriInvoke('save_settings', { settings: newSettings });
    }
    setSettings(newSettings);
  }, [setSettings]);

  const saveSingleSetting = useCallback(
    async <K extends keyof Settings>(key: K, value: Settings[K]) => {
      updateSetting(key, value);
      const updatedSettings = { ...settings, [key]: value };
      if (isTauriEnvironment()) {
        await tauriInvoke('save_settings', { settings: updatedSettings });
      }
    },
    [settings, updateSetting]
  );

  return {
    settings,
    saveSettings,
    saveSingleSetting,
  };
}
