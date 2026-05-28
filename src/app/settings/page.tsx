'use client';

import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Sidebar } from '@/components/pc/Sidebar';
import { useTauriEvents } from '@/hooks/useTauriEvents';
import { useSettings } from '@/hooks/useSettings';
import { useConnectionStore } from '@/store/connectionStore';
import { tauriInvoke, isTauriEnvironment } from '@/lib/utils';
import {
  PORT_MODE_OPTIONS,
  MAX_DEVICES_OPTIONS,
  SESSION_EXPIRY_OPTIONS,
  type Settings,
} from '@/lib/constants';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { settings, saveSingleSetting } = useSettings();
  const [showExternalWarning, setShowExternalWarning] = useState(false);
  const [showRevokeAllConfirm, setShowRevokeAllConfirm] = useState(false);

  useTauriEvents();

  const handleExternalAccessToggle = (value: boolean) => {
    if (value) {
      setShowExternalWarning(true);
    } else {
      saveSingleSetting('allow_external_access', false);
    }
  };

  const confirmExternalAccess = () => {
    saveSingleSetting('allow_external_access', true);
    setShowExternalWarning(false);
    toast.success('外部アクセスを有効にしました');
  };

  const handleRevokeAll = async () => {
    await tauriInvoke('revoke_all_sessions');
    setShowRevokeAllConfirm(false);
    toast.success('すべての認証情報を削除しました');
  };

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            fontFamily: 'var(--font-sans)',
            fontSize: '14px',
          },
        }}
      />

      {isTauriEnvironment() && <Sidebar />}

      <main
        className="page-enter"
        style={{
          marginLeft: isTauriEnvironment() ? 'var(--sidebar-collapsed)' : '0',
          padding: 'var(--content-padding)',
          height: '100vh',
          overflow: 'auto',
        }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>設定</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>アプリケーションの設定を管理</p>
          </div>

          {/* === サーバー設定 === */}
          <section className="card mb-4">
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--accent-cyan)' }}>サーバー設定</h2>
            <div className="space-y-4">
              {/* バックグラウンド処理 */}
              <SettingRow label="バックグラウンド処理" description="ウィンドウを閉じてもサーバーを継続">
                <Toggle checked={settings.background_mode} onChange={(v) => saveSingleSetting('background_mode', v)} />
              </SettingRow>

              {/* 自動起動 */}
              <SettingRow label="システム起動時に自動起動">
                <Toggle checked={settings.auto_start} onChange={(v) => saveSingleSetting('auto_start', v)} />
              </SettingRow>

              {/* ポート指定モード */}
              <SettingRow label="ポート指定モード">
                <select
                  className="select"
                  value={settings.port_mode}
                  onChange={(e) => saveSingleSetting('port_mode', e.target.value as Settings['port_mode'])}
                >
                  {PORT_MODE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </SettingRow>

              {/* 直接指定時のポート番号 */}
              {settings.port_mode === 'manual' && (
                <SettingRow label="ポート番号">
                  <input
                    type="number"
                    className="input input-mono w-28"
                    min={1024}
                    max={49151}
                    value={settings.manual_port || ''}
                    onChange={(e) => saveSingleSetting('manual_port', parseInt(e.target.value) || 0)}
                  />
                </SettingRow>
              )}

              {/* 範囲指定 */}
              {settings.port_mode === 'range' && (
                <SettingRow label="ポート範囲">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className="input input-mono w-24"
                      min={1024}
                      max={49151}
                      value={settings.port_range_start}
                      onChange={(e) => saveSingleSetting('port_range_start', parseInt(e.target.value) || 1024)}
                    />
                    <span style={{ color: 'var(--text-muted)' }}>〜</span>
                    <input
                      type="number"
                      className="input input-mono w-24"
                      min={1024}
                      max={49151}
                      value={settings.port_range_end}
                      onChange={(e) => saveSingleSetting('port_range_end', parseInt(e.target.value) || 49151)}
                    />
                  </div>
                </SettingRow>
              )}

              {/* 同時接続数 */}
              <SettingRow label="同時接続デバイス数上限">
                <select
                  className="select"
                  value={settings.max_devices}
                  onChange={(e) => saveSingleSetting('max_devices', parseInt(e.target.value))}
                >
                  {MAX_DEVICES_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </SettingRow>

              {/* 外部アクセス */}
              <SettingRow label="プライベートネットワーク外アクセスを許可" description="セキュリティリスクあり">
                <Toggle
                  checked={settings.allow_external_access}
                  onChange={handleExternalAccessToggle}
                  danger
                />
              </SettingRow>
            </div>
          </section>

          {/* === セキュリティ設定 === */}
          <section className="card mb-4">
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--accent-cyan)' }}>セキュリティ設定</h2>
            <div className="space-y-4">
              <SettingRow label="セッション有効期限">
                <select
                  className="select"
                  value={settings.session_expiry_days}
                  onChange={(e) => saveSingleSetting('session_expiry_days', parseInt(e.target.value))}
                >
                  {SESSION_EXPIRY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </SettingRow>

              <SettingRow label="承認コード有効期限">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    className="slider flex-1"
                    min={1}
                    max={30}
                    value={settings.code_expiry_minutes}
                    onChange={(e) => saveSingleSetting('code_expiry_minutes', parseInt(e.target.value))}
                  />
                  <span className="text-sm font-mono w-12 text-right" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    {settings.code_expiry_minutes}分
                  </span>
                </div>
              </SettingRow>

              <SettingRow label="承認コード誤入力ロック時間">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="input input-mono w-20"
                    min={1}
                    value={settings.code_lockout_minutes}
                    onChange={(e) => saveSingleSetting('code_lockout_minutes', parseInt(e.target.value) || 10)}
                  />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>分</span>
                </div>
              </SettingRow>

              <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={() => setShowRevokeAllConfirm(true)}
                  className="btn btn-danger text-sm"
                >
                  すべての認証情報を削除
                </button>
              </div>
            </div>
          </section>

          {/* === クリップボード設定 === */}
          <section className="card mb-4">
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--accent-cyan)' }}>クリップボード設定</h2>
            <div className="space-y-4">
              <SettingRow label="ログの最大保持件数">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    className="slider flex-1"
                    min={5}
                    max={500}
                    step={5}
                    value={settings.max_log_entries}
                    onChange={(e) => saveSingleSetting('max_log_entries', parseInt(e.target.value))}
                  />
                  <span className="text-sm font-mono w-12 text-right" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    {settings.max_log_entries}件
                  </span>
                </div>
              </SettingRow>

              <SettingRow label="アプリ終了時にログを保持">
                <Toggle checked={settings.persist_logs} onChange={(v) => saveSingleSetting('persist_logs', v)} />
              </SettingRow>

              <SettingRow label="クリップボード同期デバウンス時間">
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    className="slider flex-1"
                    min={100}
                    max={2000}
                    step={50}
                    value={settings.debounce_ms}
                    onChange={(e) => saveSingleSetting('debounce_ms', parseInt(e.target.value))}
                  />
                  <span className="text-sm font-mono w-16 text-right" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    {settings.debounce_ms}ms
                  </span>
                </div>
              </SettingRow>
            </div>
          </section>

          {/* === デバッグ設定 === */}
          <section className="card mb-8">
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--accent-cyan)' }}>デバッグ設定</h2>
            <SettingRow label="デバッグメニューを表示">
              <Toggle checked={settings.debug_mode} onChange={(v) => saveSingleSetting('debug_mode', v)} />
            </SettingRow>
          </section>
        </div>
      </main>

      {/* === 外部アクセス警告ダイアログ === */}
      {showExternalWarning && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="flex items-start gap-3 mb-4">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="text-base font-bold mb-1" style={{ color: 'var(--accent-amber)' }}>
                  セキュリティ警告
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  プライベートネットワーク外からの接続を許可しようとしています。
                  信頼できないネットワーク（公共Wi-Fiなど）での使用は、第三者があなたのクリップボード内容にアクセスできる可能性があります。
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExternalWarning(false)}
                className="btn btn-secondary flex-1"
              >
                キャンセル
              </button>
              <button
                onClick={confirmExternalAccess}
                className="btn btn-danger flex-1"
              >
                はい、リスクを理解した上で有効にする
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === 全認証削除確認 === */}
      {showRevokeAllConfirm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <h3 className="text-base font-bold mb-3" style={{ color: 'var(--accent-red)' }}>
              確認
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              すべてのデバイスの認証情報を削除しますか？接続中のデバイスは全て切断されます。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRevokeAllConfirm(false)}
                className="btn btn-secondary flex-1"
              >
                キャンセル
              </button>
              <button
                onClick={handleRevokeAll}
                className="btn btn-danger flex-1"
              >
                すべて削除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// === Helper Components ===

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</div>
        {description && (
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</div>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  danger,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  danger?: boolean;
}) {
  return (
    <button
      className="toggle"
      data-checked={checked}
      onClick={() => onChange(!checked)}
      style={checked && danger ? { background: 'var(--accent-red)' } : undefined}
    >
      <span className="toggle-dot" />
    </button>
  );
}
