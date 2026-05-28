'use client';

import { useConnectionStore } from '@/store/connectionStore';
import { useSettingsStore } from '@/store/settingsStore';

interface OnboardingScreenProps {
  onDismiss: () => void;
}

export function OnboardingScreen({ onDismiss }: OnboardingScreenProps) {
  const serverInfo = useConnectionStore((s) => s.serverInfo);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl text-2xl font-bold mb-4"
            style={{ background: 'var(--accent-cyan)', color: '#000' }}
          >
            C
          </div>
          <h2
            className="text-xl font-bold mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            CrossClipへようこそ
          </h2>
          <p
            className="text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            QuestとPC間でクリップボードを共有できます
          </p>
        </div>

        {/* Connection info */}
        <div
          className="rounded-lg p-4 mb-6"
          style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--border)' }}
        >
          <h3
            className="text-sm font-semibold mb-3"
            style={{ color: 'var(--text-secondary)' }}
          >
            Questからの接続方法
          </h3>
          <ol className="space-y-3 text-sm" style={{ color: 'var(--text-primary)' }}>
            <li className="flex gap-2">
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'var(--accent-cyan)', color: '#000' }}
              >
                1
              </span>
              <span>Questのブラウザを開きます</span>
            </li>
            <li className="flex gap-2">
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'var(--accent-cyan)', color: '#000' }}
              >
                2
              </span>
              <span>以下のアドレスにアクセスします:</span>
            </li>
          </ol>

          <div
            className="mt-3 px-4 py-3 rounded-md text-center"
            style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          >
            <code
              className="text-lg font-mono font-semibold"
              style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}
            >
              http://{serverInfo.ip}:{serverInfo.port}
            </code>
          </div>

          <ol start={3} className="mt-3 space-y-3 text-sm" style={{ color: 'var(--text-primary)' }}>
            <li className="flex gap-2">
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'var(--accent-cyan)', color: '#000' }}
              >
                3
              </span>
              <span>PCに表示される接続リクエストを承認します</span>
            </li>
            <li className="flex gap-2">
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'var(--accent-cyan)', color: '#000' }}
              >
                4
              </span>
              <span>6桁の承認コードをQuestに入力します</span>
            </li>
          </ol>
        </div>

        <button
          onClick={onDismiss}
          className="btn btn-primary w-full py-3"
        >
          はじめる
        </button>
      </div>
    </div>
  );
}
