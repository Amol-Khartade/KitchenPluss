import React, { useState, useEffect } from 'react';
import {
  Flame,
  Layers,
  Sparkles,
  ClipboardList,
  Plus,
  Wifi,
  WifiOff,
  Bell,
  X,
  Clock,
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'kds' | 'inventory' | 'ai-prep' | 'waste-log';
  setActiveTab: (tab: 'kds' | 'inventory' | 'ai-prep' | 'waste-log') => void;
  isConnected: boolean;
  onOpenNewTicket: () => void;
  alerts: Array<{ id: string; message: string; timestamp: Date; type: string }>;
  onDismissAlert: (id: string) => void;
  ticketCounts?: { queue: number; firing: number; lowStock: number };
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isConnected,
  onOpenNewTicket,
  alerts,
  onDismissAlert,
  ticketCounts,
}) => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-bg-surface border-b border-bg-border sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Connection */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-sky-600 via-indigo-600 to-amber-500 p-0.5 flex items-center justify-center shadow-lg shadow-sky-950/50">
                <div className="w-full h-full bg-bg-surface rounded-[7px] flex items-center justify-center">
                  <Flame className="w-5 h-5 text-amber-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-lg tracking-tight text-white">Kitchen<span className="text-sky-400">Pulse</span></span>
                  <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-sky-950/80 text-sky-400 border border-sky-800/60">
                    Pro Ops
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 font-mono">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span className="tabular-numbers">{time || '--:--:--'}</span>
                </div>
              </div>
            </div>

            {/* Connection badge */}
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                isConnected
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
                  : 'bg-rose-950/40 text-rose-400 border-rose-800/60 animate-pulse'
              }`}
              title={isConnected ? 'Connected to KitchenPulse WebSocket Server' : 'Disconnected, attempting to reconnect...'}
            >
              {isConnected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-75" />
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">LIVE WS</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">OFFLINE</span>
                </>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 bg-bg-primary p-1 rounded-xl border border-bg-border">
            <button
              onClick={() => setActiveTab('kds')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'kds'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-bg-hover'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>Live KDS</span>
              {ticketCounts && (ticketCounts.queue + ticketCounts.firing > 0) && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'kds' ? 'bg-sky-700 text-sky-100' : 'bg-bg-card text-sky-400 border border-sky-800/60'
                }`}>
                  {ticketCounts.queue + ticketCounts.firing}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'inventory'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-700/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-bg-hover'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Inventory & POs</span>
              {ticketCounts && ticketCounts.lowStock > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                  {ticketCounts.lowStock}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('ai-prep')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'ai-prep'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-700/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-bg-hover'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>AI Prep & Cost</span>
            </button>

            <button
              onClick={() => setActiveTab('waste-log')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'waste-log'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-700/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-bg-hover'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Log Shift Scrap</span>
            </button>
          </nav>

          {/* Quick Action */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenNewTicket}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-sky-900/40 hover:shadow-sky-800/60 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Ticket</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating System Alerts Banner */}
      {alerts.length > 0 && (
        <div className="bg-bg-primary/95 border-t border-bg-border px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-amber-300 overflow-hidden">
              <Bell className="w-4 h-4 text-amber-400 flex-shrink-0 animate-bounce" />
              <span className="font-semibold text-amber-400 uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-800/60">
                {alerts[0].type}
              </span>
              <span className="truncate text-slate-200">{alerts[0].message}</span>
            </div>
            <button
              onClick={() => onDismissAlert(alerts[0].id)}
              className="text-slate-400 hover:text-slate-100 p-1 rounded hover:bg-bg-hover ml-2"
              title="Dismiss alert"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
