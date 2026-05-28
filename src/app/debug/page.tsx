'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/pc/Sidebar';
import { useConnectionStore } from '@/store/connectionStore';
import { useSettingsStore } from '@/store/settingsStore';
import { tauriInvoke, isTauriEnvironment, formatTimestamp } from '@/lib/utils';
import type { LogEntry } from '@/lib/constants';
import toast from 'react-hot-toast';

export default function DebugPage() {
  const [activeTab, setActiveTab] = useState<'ws' | 'app' | 'connections' | 'stats'>('app');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterLevel, setFilterLevel] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  const serverInfo = useConnectionStore((s) => s.serverInfo);
  const connectedDevices = useConnectionStore((s) => s.connectedDevices);
  const debugMode = useSettingsStore((s) => s.settings.debug_mode);

  useEffect(() => {
    // In a real app, we'd listen for log events from Tauri.
    // For now, let's load initial logs.
    const loadLogs = async () => {
      const initialLogs = await tauriInvoke<LogEntry[]>('get_debug_logs');
      if (initialLogs) {
        setLogs(initialLogs);
      }
    };
    if (activeTab === 'app') {
      loadLogs();
    }
  }, [activeTab]);

  const handleClearLogs = () => {
    setLogs([]);
  };

  const handleExportLogs = async () => {
    toast.error('Not implemented yet');
  };

  if (!debugMode) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">デバッグモードがオフです。設定から有効にしてください。</p>
      </div>
    );
  }

  const filteredLogs = logs.filter(log => {
    if (filterLevel && log.level !== filterLevel) return false;
    if (search && !log.message.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      {isTauriEnvironment() && <Sidebar />}
      
      <main
        className="page-enter debug-bg"
        style={{
          marginLeft: isTauriEnvironment() ? 'var(--sidebar-collapsed)' : '0',
          padding: 'var(--content-padding)',
          height: '100vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <TabButton active={activeTab === 'app'} onClick={() => setActiveTab('app')}>アプリログ</TabButton>
            <TabButton active={activeTab === 'ws'} onClick={() => setActiveTab('ws')}>通信ログ</TabButton>
            <TabButton active={activeTab === 'connections'} onClick={() => setActiveTab('connections')}>接続履歴</TabButton>
            <TabButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')}>サーバー状態</TabButton>
          </div>
          <div className="flex gap-2">
            <button onClick={handleClearLogs} className="btn btn-secondary text-xs px-3 py-1">ログをクリア</button>
            <button onClick={handleExportLogs} className="btn btn-primary text-xs px-3 py-1">ログをファイルに保存</button>
          </div>
        </div>

        <div className="flex-1 overflow-auto rounded-lg border border-gray-800 bg-black p-4">
          {activeTab === 'app' && (
            <div className="flex flex-col h-full">
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="検索..."
                  className="input input-mono w-64 text-xs"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <select 
                  className="select text-xs" 
                  value={filterLevel || ''} 
                  onChange={e => setFilterLevel(e.target.value || null)}
                >
                  <option value="">すべてのレベル</option>
                  <option value="DEBUG">DEBUG</option>
                  <option value="INFO">INFO</option>
                  <option value="WARN">WARN</option>
                  <option value="ERROR">ERROR</option>
                </select>
              </div>
              <div className="flex-1 overflow-auto font-mono text-xs">
                {filteredLogs.map(log => (
                  <div key={log.id} className={`py-1 ${log.level === 'ERROR' ? 'text-red-400' : log.level === 'WARN' ? 'text-yellow-400' : 'text-gray-300'}`}>
                    <span className="text-gray-500 mr-2">[{formatTimestamp(log.timestamp)}]</span>
                    <span className={`log-${log.level.toLowerCase()} mr-2`}>{log.level}</span>
                    <span className="text-gray-400 mr-2">[{log.source}]</span>
                    {log.message}
                  </div>
                ))}
                {filteredLogs.length === 0 && <div className="text-gray-600">ログがありません</div>}
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="text-sm font-mono space-y-4 text-gray-300">
              <div>アップタイム: <span className="text-cyan-400">---</span></div>
              <div>アクティブ接続数: <span className="text-cyan-400">{connectedDevices.length}</span></div>
              <div>現在のポート: <span className="text-cyan-400">{serverInfo.port}</span></div>
              <div>サーバー状態: <span className={serverInfo.status === 'running' ? 'text-cyan-400' : 'text-red-400'}>{serverInfo.status}</span></div>
            </div>
          )}
          
          {(activeTab === 'ws' || activeTab === 'connections') && (
            <div className="text-gray-500 text-sm flex items-center justify-center h-full">
              まだ実装されていません
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function TabButton({ active, onClick, children }: { active: boolean, onClick: () => void, children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
        active 
          ? 'border-cyan-400 text-cyan-400 bg-gray-900/50' 
          : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-900/30'
      }`}
    >
      {children}
    </button>
  );
}
