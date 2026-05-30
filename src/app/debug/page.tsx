'use client';

import { useState, useEffect, useRef } from 'react';
import { Sidebar } from '@/components/pc/Sidebar';
import { useConnectionStore } from '@/store/connectionStore';
import { useSettingsStore } from '@/store/settingsStore';
import { tauriInvoke, tauriListen, isTauriEnvironment, formatTimestamp, formatFullTimestamp, formatDuration } from '@/lib/utils';
import type { LogEntry } from '@/lib/constants';
import toast from 'react-hot-toast';

interface WsLogEntry {
  id: string;
  timestamp: number;
  direction: string;
  msg_type: string;
  payload: string;
}

interface ConnectionAttempt {
  id: string;
  timestamp: number;
  ip: string;
  userAgent: string;
  result: string;
}

interface ServerStats {
  uptime: number;
  activeConnections: number;
  messagesSent: number;
  messagesReceived: number;
  port: number;
  status: string;
}

export default function DebugPage() {
  const [activeTab, setActiveTab] = useState<'ws' | 'app' | 'connections' | 'stats'>('ws');
  
  // Data state
  const [appLogs, setAppLogs] = useState<LogEntry[]>([]);
  const [wsLogs, setWsLogs] = useState<WsLogEntry[]>([]);
  const [history, setHistory] = useState<ConnectionAttempt[]>([]);
  const [stats, setStats] = useState<ServerStats | null>(null);

  // Filters
  const [appFilterLevel, setAppFilterLevel] = useState<string | null>(null);
  const [appSearch, setAppSearch] = useState('');
  const [autoScrollWs, setAutoScrollWs] = useState(true);
  
  const debugMode = useSettingsStore((s) => s.settings.debug_mode);
  
  const wsEndRef = useRef<HTMLDivElement>(null);
  const appEndRef = useRef<HTMLDivElement>(null);

  // Load initial data and setup listeners
  useEffect(() => {
    if (!isTauriEnvironment() || !debugMode) return;

    let unlistenWs: (() => void) | null = null;

    const init = async () => {
      // Fetch initial data
      const [initialApp, initialWs, initialHist, initialStats] = await Promise.all([
        tauriInvoke<LogEntry[]>('get_debug_logs'),
        tauriInvoke<WsLogEntry[]>('get_ws_logs'),
        tauriInvoke<ConnectionAttempt[]>('get_connection_history'),
        tauriInvoke<ServerStats>('get_server_stats'),
      ]);

      if (initialApp) setAppLogs(initialApp);
      if (initialWs) setWsLogs(initialWs);
      if (initialHist) setHistory(initialHist);
      if (initialStats) setStats(initialStats);

      // Listeners
      unlistenWs = await tauriListen('ws-log', (log: WsLogEntry) => {
        setWsLogs(prev => {
          const next = [log, ...prev];
          if (next.length > 200) next.length = 200;
          return next;
        });
      });
    };

    init();
    
    // Poll stats & history
    const interval = setInterval(async () => {
      const currentStats = await tauriInvoke<ServerStats>('get_server_stats');
      if (currentStats) setStats(currentStats);
      
      if (activeTab === 'connections') {
         const currentHist = await tauriInvoke<ConnectionAttempt[]>('get_connection_history');
         if (currentHist) setHistory(currentHist);
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      if (unlistenWs) unlistenWs();
    };
  }, [debugMode, activeTab]);

  // Auto-scroll logic
  useEffect(() => {
    if (activeTab === 'ws' && autoScrollWs) {
      wsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [wsLogs, activeTab, autoScrollWs]);

  useEffect(() => {
    if (activeTab === 'app') {
      appEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [appLogs, activeTab]);

  const handleClearLogs = async () => {
    await tauriInvoke('clear_all_logs');
    setAppLogs([]);
    setWsLogs([]);
    setHistory([]);
    toast.success('ログをクリアしました');
  };

  const handleExportLogs = async () => {
    try {
      await tauriInvoke('export_logs_to_file');
      toast.success('ログの保存ダイアログを開きました');
    } catch (e) {
      toast.error('保存に失敗しました');
    }
  };

  if (!debugMode) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#060608] font-mono">
        <p className="text-gray-500">デバッグモードがオフです。設定から有効にしてください。</p>
      </div>
    );
  }

  const filteredAppLogs = appLogs.filter(log => {
    if (appFilterLevel && log.level !== appFilterLevel) return false;
    if (appSearch && !log.message.toLowerCase().includes(appSearch.toLowerCase())) return false;
    return true;
  }).reverse(); // Reverse to show chronological order for auto-scrolling

  const reversedWsLogs = [...wsLogs].reverse();

  return (
    <>
      {isTauriEnvironment() && <Sidebar />}
      
      <main
        className="page-enter"
        style={{
          marginLeft: isTauriEnvironment() ? 'var(--sidebar-collapsed)' : '0',
          padding: 'var(--content-padding)',
          height: '100vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#060608', // Terminal aesthetic
          color: '#e8e8ea',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1">
            <TabButton active={activeTab === 'ws'} onClick={() => setActiveTab('ws')}>通信ログ</TabButton>
            <TabButton active={activeTab === 'app'} onClick={() => setActiveTab('app')}>アプリログ</TabButton>
            <TabButton active={activeTab === 'connections'} onClick={() => setActiveTab('connections')}>接続履歴</TabButton>
            <TabButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')}>サーバー状態</TabButton>
          </div>
          <div className="flex gap-2">
            <button onClick={handleClearLogs} className="btn btn-secondary text-xs px-3 py-1 font-mono">ログをクリア</button>
            <button onClick={handleExportLogs} className="btn btn-primary text-xs px-3 py-1 font-mono">ログをファイルに保存</button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden rounded-lg border border-gray-800 bg-black flex flex-col font-mono text-sm shadow-2xl relative">
          
          {/* WS LOGS TAB */}
          {activeTab === 'ws' && (
            <div className="flex flex-col h-full">
               <div className="flex items-center justify-between p-2 border-b border-gray-800 bg-[#0a0a0c]">
                 <div className="flex gap-4 text-xs text-gray-500">
                    <span>カラム: タイムスタンプ | 方向 | タイプ | ペイロード</span>
                 </div>
                 <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                    <input type="checkbox" checked={autoScrollWs} onChange={e => setAutoScrollWs(e.target.checked)} className="rounded bg-gray-800 border-gray-700 text-cyan-500" />
                    Auto-scroll
                 </label>
               </div>
               <div className="flex-1 overflow-auto p-4 space-y-1">
                 {reversedWsLogs.map(log => (
                   <div key={log.id} className="flex gap-4 hover:bg-white/5 p-1 rounded transition-colors whitespace-nowrap">
                     <span className="text-gray-500 w-24 flex-shrink-0">[{formatTimestamp(log.timestamp)}]</span>
                     <span className={`w-12 flex-shrink-0 font-bold ${log.direction === 'OUT' ? 'text-cyan-400' : 'text-white'}`}>
                       {log.direction === 'OUT' ? 'OUT↑' : 'IN↓'}
                     </span>
                     <span className="w-40 flex-shrink-0 text-yellow-300 truncate" title={log.msg_type}>{log.msg_type}</span>
                     <span className="text-gray-400 truncate overflow-hidden text-ellipsis" title={log.payload}>{log.payload}</span>
                   </div>
                 ))}
                 {wsLogs.length === 0 && <div className="text-gray-600 mt-4 text-center">ログがありません</div>}
                 <div ref={wsEndRef} />
               </div>
            </div>
          )}

          {/* APP LOGS TAB */}
          {activeTab === 'app' && (
            <div className="flex flex-col h-full">
              <div className="flex gap-2 p-2 border-b border-gray-800 bg-[#0a0a0c]">
                <input
                  type="text"
                  placeholder="検索..."
                  className="bg-gray-900 border border-gray-700 rounded px-2 py-1 w-64 text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                  value={appSearch}
                  onChange={e => setAppSearch(e.target.value)}
                />
                <select 
                  className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer" 
                  value={appFilterLevel || ''} 
                  onChange={e => setAppFilterLevel(e.target.value || null)}
                >
                  <option value="">すべてのレベル</option>
                  <option value="DEBUG">DEBUG</option>
                  <option value="INFO">INFO</option>
                  <option value="WARN">WARN</option>
                  <option value="ERROR">ERROR</option>
                </select>
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-1">
                {filteredAppLogs.map(log => {
                  let colorClass = 'text-gray-300';
                  if (log.level === 'ERROR') colorClass = 'text-red-400';
                  else if (log.level === 'WARN') colorClass = 'text-amber-400';
                  else if (log.level === 'DEBUG') colorClass = 'text-gray-500';
                  else if (log.level === 'INFO') colorClass = 'text-cyan-400';

                  return (
                    <div key={log.id} className="flex gap-3 hover:bg-white/5 p-1 rounded transition-colors break-all">
                      <span className="text-gray-600 flex-shrink-0">[{formatTimestamp(log.timestamp)}]</span>
                      <span className={`w-14 flex-shrink-0 font-bold ${colorClass}`}>{log.level}</span>
                      <span className="text-purple-400 flex-shrink-0 w-24 truncate" title={log.source}>[{log.source}]</span>
                      <span className={log.level === 'ERROR' ? 'text-red-300' : 'text-gray-300'}>{log.message}</span>
                    </div>
                  );
                })}
                {filteredAppLogs.length === 0 && <div className="text-gray-600 mt-4 text-center">ログがありません</div>}
                <div ref={appEndRef} />
              </div>
            </div>
          )}

          {/* CONNECTIONS TAB */}
          {activeTab === 'connections' && (
            <div className="flex-1 overflow-auto">
               <table className="w-full text-left border-collapse">
                 <thead className="bg-[#0a0a0c] border-b border-gray-800 text-gray-500 text-xs sticky top-0">
                   <tr>
                     <th className="p-3 font-normal">日時</th>
                     <th className="p-3 font-normal">IPアドレス</th>
                     <th className="p-3 font-normal">ユーザーエージェント</th>
                     <th className="p-3 font-normal">結果</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-800/50">
                    {history.map(entry => (
                      <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 text-gray-400 whitespace-nowrap">{formatFullTimestamp(entry.timestamp)}</td>
                        <td className="p-3 text-cyan-400">{entry.ip}</td>
                        <td className="p-3 text-gray-500 truncate max-w-xs" title={entry.userAgent}>{entry.userAgent}</td>
                        <td className="p-3">
                           <span className={`px-2 py-0.5 rounded text-xs ${
                             entry.result.includes('承認') ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                             entry.result.includes('拒否') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                             'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                           }`}>
                             {entry.result}
                           </span>
                        </td>
                      </tr>
                    ))}
                 </tbody>
               </table>
               {history.length === 0 && <div className="text-gray-600 mt-8 text-center">履歴がありません</div>}
            </div>
          )}

          {/* STATS TAB */}
          {activeTab === 'stats' && (
            <div className="flex-1 p-8">
               <div className="grid grid-cols-2 gap-6 max-w-2xl">
                 
                 <div className="bg-[#0a0a0c] border border-gray-800 rounded-lg p-5 flex flex-col">
                    <span className="text-gray-500 text-xs mb-1">アップタイム</span>
                    <span className="text-2xl text-cyan-400 font-bold">{stats ? formatDuration(Math.floor(stats.uptime / 1000)) : '---'}</span>
                 </div>

                 <div className="bg-[#0a0a0c] border border-gray-800 rounded-lg p-5 flex flex-col">
                    <span className="text-gray-500 text-xs mb-1">現在のポート</span>
                    <span className="text-2xl text-white font-bold">{stats?.port || '---'}</span>
                 </div>

                 <div className="bg-[#0a0a0c] border border-gray-800 rounded-lg p-5 flex flex-col">
                    <span className="text-gray-500 text-xs mb-1">アクティブ接続数</span>
                    <span className="text-2xl text-green-400 font-bold">{stats?.activeConnections ?? '---'}</span>
                 </div>

                 <div className="bg-[#0a0a0c] border border-gray-800 rounded-lg p-5 flex flex-col">
                    <span className="text-gray-500 text-xs mb-1">サーバー状態</span>
                    <span className={`text-xl font-bold ${stats?.status === 'running' ? 'text-green-400' : 'text-red-400'}`}>
                      {stats?.status === 'running' ? 'RUNNING' : (stats?.status?.toUpperCase() || '---')}
                    </span>
                 </div>

                 <div className="bg-[#0a0a0c] border border-gray-800 rounded-lg p-5 flex flex-col">
                    <span className="text-gray-500 text-xs mb-1">送信メッセージ数</span>
                    <span className="text-2xl text-purple-400 font-bold">{stats?.messagesSent ?? '---'}</span>
                 </div>

                 <div className="bg-[#0a0a0c] border border-gray-800 rounded-lg p-5 flex flex-col">
                    <span className="text-gray-500 text-xs mb-1">受信メッセージ数</span>
                    <span className="text-2xl text-yellow-400 font-bold">{stats?.messagesReceived ?? '---'}</span>
                 </div>

               </div>
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
      className={`px-6 py-2 text-sm font-bold font-mono rounded-t-lg transition-all border-t-2 border-x-2 border-b-0 ${
        active 
          ? 'bg-black border-gray-800 border-t-cyan-500 text-cyan-400 z-10 relative shadow-none translate-y-[1px]' 
          : 'bg-[#0a0a0c] border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-900'
      }`}
    >
      {children}
    </button>
  );
}
