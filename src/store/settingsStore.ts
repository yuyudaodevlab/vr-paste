import { create } from 'zustand';
import type { Settings } from '@/lib/constants';

const defaultSettings: Settings = {
  background_mode: true,
  auto_start: false,
  port_mode: 'random',
  manual_port: 0,
  port_range_start: 8000,
  port_range_end: 9000,
  max_devices: 1,
  allow_external_access: false,
  session_expiry_days: 180,
  code_expiry_minutes: 5,
  code_lockout_minutes: 10,
  max_log_entries: 15,
  persist_logs: true,
  debounce_ms: 300,
  debug_mode: false,
};

interface SettingsState {
  settings: Settings;
  isLoaded: boolean;
  isFirstLaunch: boolean;
  setSettings: (settings: Settings) => void;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  setIsLoaded: (loaded: boolean) => void;
  setIsFirstLaunch: (firstLaunch: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: defaultSettings,
  isLoaded: false,
  isFirstLaunch: false,

  setSettings: (settings) => set({ settings, isLoaded: true }),

  updateSetting: (key, value) =>
    set((state) => ({
      settings: { ...state.settings, [key]: value },
    })),

  setIsLoaded: (isLoaded) => set({ isLoaded }),
  setIsFirstLaunch: (isFirstLaunch) => set({ isFirstLaunch }),
}));

export { defaultSettings };
