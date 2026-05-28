// WebSocket message types
export const WS_MESSAGE_TYPES = {
  // Quest → PC
  CLIPBOARD_PUSH: 'CLIPBOARD_PUSH',
  AUTH_CODE_SUBMIT: 'AUTH_CODE_SUBMIT',

  // PC → Quest
  CLIPBOARD_UPDATE: 'CLIPBOARD_UPDATE',
  AUTH_REJECTED: 'AUTH_REJECTED',
  AUTH_CODE_READY: 'AUTH_CODE_READY',
  AUTH_SUCCESS: 'AUTH_SUCCESS',
  AUTH_CODE_INVALID: 'AUTH_CODE_INVALID',
  AUTH_CODE_EXPIRED: 'AUTH_CODE_EXPIRED',
  AUTH_LOCKED: 'AUTH_LOCKED',
  CONNECTION_LIMIT: 'CONNECTION_LIMIT',
  PING: 'PING',
  PONG: 'PONG',
} as const;

// Port range
export const PORT_MIN = 1024;
export const PORT_MAX = 49151;

// Default settings
export const DEFAULT_SETTINGS = {
  backgroundMode: true,
  autoStart: false,
  portMode: 'random' as const, // 'random' | 'manual' | 'range'
  manualPort: 0,
  portRangeStart: 8000,
  portRangeEnd: 9000,
  maxDevices: 1,
  allowExternalAccess: false,
  sessionExpiry: 180, // days
  codeExpiry: 5, // minutes
  codeLockoutTime: 10, // minutes
  maxLogEntries: 15,
  persistLogs: true,
  debounceMs: 300,
  debugMode: false,
};

// Auth states
export const AUTH_STATES = {
  IDLE: 'idle',
  REQUESTING: 'requesting',
  WAITING: 'waiting',
  CODE_ENTRY: 'code_entry',
  SUCCESS: 'success',
  REJECTED: 'rejected',
  LOCKED: 'locked',
  ERROR: 'error',
} as const;

export type AuthState = typeof AUTH_STATES[keyof typeof AUTH_STATES];

// Clipboard entry source
export type ClipboardSource = 'pc' | 'quest';

export interface ClipboardEntry {
  id: string;
  text: string;
  source: ClipboardSource;
  timestamp: number;
}

export interface DeviceInfo {
  id: string;
  ip: string;
  userAgent: string;
  nickname?: string;
  connectedAt: number;
}

export interface AuthRequest {
  id: string;
  ip: string;
  userAgent: string;
  createdAt: number;
  status: 'pending' | 'approved' | 'rejected' | 'timeout';
}

export interface ServerInfo {
  port: number;
  ip: string;
  status: 'running' | 'stopped';
}

export interface Settings {
  background_mode: boolean;
  auto_start: boolean;
  port_mode: 'random' | 'manual' | 'range';
  manual_port: number;
  port_range_start: number;
  port_range_end: number;
  max_devices: number;
  allow_external_access: boolean;
  session_expiry_days: number;
  code_expiry_minutes: number;
  code_lockout_minutes: number;
  max_log_entries: number;
  persist_logs: boolean;
  debounce_ms: number;
  debug_mode: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  source: 'rust' | 'js';
}

// Navigation items
export const NAV_ITEMS = [
  { id: 'main', label: 'メイン', icon: '🖥', path: '/' },
  { id: 'settings', label: '設定', icon: '⚙', path: '/settings' },
  { id: 'debug', label: 'デバッグ', icon: '🐛', path: '/debug', debugOnly: true },
] as const;

// Session expiry options
export const SESSION_EXPIRY_OPTIONS = [
  { value: 30, label: '30日' },
  { value: 90, label: '90日' },
  { value: 180, label: '180日' },
  { value: 0, label: '永続' },
] as const;

// Max devices options
export const MAX_DEVICES_OPTIONS = [
  { value: 1, label: '1台' },
  { value: 2, label: '2台' },
  { value: 5, label: '5台' },
  { value: 0, label: '無制限' },
] as const;

// Port mode options
export const PORT_MODE_OPTIONS = [
  { value: 'random', label: 'ランダム' },
  { value: 'manual', label: '直接指定' },
  { value: 'range', label: '範囲指定' },
] as const;
