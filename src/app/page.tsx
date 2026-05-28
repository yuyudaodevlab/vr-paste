'use client';

import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Sidebar } from '@/components/pc/Sidebar';
import { ConnectionStatusPanel } from '@/components/pc/ConnectionStatusPanel';
import { DeviceList } from '@/components/pc/DeviceList';
import { ClipboardPanel } from '@/components/pc/ClipboardPanel';
import { ClipboardLog } from '@/components/pc/ClipboardLog';
import { ApprovalModal } from '@/components/pc/ApprovalModal';
import { OnboardingScreen } from '@/components/pc/OnboardingScreen';
import { useTauriEvents } from '@/hooks/useTauriEvents';
import { useSettingsStore } from '@/store/settingsStore';
import { isTauriEnvironment } from '@/lib/utils';

export default function MainPage() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  // Defer Tauri environment check to avoid hydration mismatch:
  // SSR has no `window`, so isTauriEnvironment() returns false during SSR.
  // If we call it directly in render, the server HTML won't include <Sidebar>
  // but the Tauri client render will, causing a hydration error.
  const [isTauri, setIsTauri] = useState(false);
  const isFirstLaunch = useSettingsStore((s) => s.isFirstLaunch);
  const isLoaded = useSettingsStore((s) => s.isLoaded);

  // Initialize Tauri event listeners and load data
  useTauriEvents();

  useEffect(() => {
    setIsTauri(isTauriEnvironment());
  }, []);

  useEffect(() => {
    if (isLoaded && isFirstLaunch) {
      setShowOnboarding(true);
    }
  }, [isLoaded, isFirstLaunch]);

  const handleDismissOnboarding = () => {
    setShowOnboarding(false);
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

      {isTauri && <Sidebar />}

      <main
        className="page-enter"
        style={{
          marginLeft: isTauri ? 'var(--sidebar-collapsed)' : '0',
          padding: 'var(--content-padding)',
          height: '100vh',
          overflow: 'auto',
        }}
      >
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1
              className="text-xl font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              メイン
            </h1>
            <p
              className="text-sm mt-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              クリップボード同期とデバイス管理
            </p>
          </div>

          {/* Grid layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <ConnectionStatusPanel />
            <DeviceList />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <ClipboardPanel />
            <ClipboardLog />
          </div>
        </div>
      </main>

      {/* Modals */}
      <ApprovalModal />
      {showOnboarding && (
        <OnboardingScreen onDismiss={handleDismissOnboarding} />
      )}
    </>
  );
}

