import React, { useState, useEffect, useRef } from 'react';
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
  LogIn,
  LogOut,
  ChevronDown,
  Shield,
  Building2,
  Users,
  Crown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

export type AppTab = 'kds' | 'inventory' | 'ai-prep' | 'waste-log' | 'team';

interface HeaderProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, organization, isAuthenticated, hasAdminAccess, isOwner, isAdmin, logout, openAuthModal } = useAuth();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          {/* Brand & Client Hotel Organization */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-sky-600 via-indigo-600 to-amber-500 p-0.5 flex items-center justify-center shadow-lg shadow-sky-950/50">
                <div className="w-full h-full bg-bg-surface rounded-[7px] flex items-center justify-center">
                  <Flame className="w-5 h-5 text-amber-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-base sm:text-lg tracking-tight text-white">
                    Kitchen<span className="text-sky-400">Pulse</span>
                  </span>
                  {/* Client / Hotel Name Badge */}
                  {organization && (
                    <span className="hidden sm:inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-950/90 text-sky-300 border border-sky-800/80 shadow-sm">
                      <Building2 className="w-3 h-3 text-sky-400 flex-shrink-0" />
                      <span className="truncate max-w-[140px] md:max-w-[180px]">{organization.name}</span>
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 font-mono">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span className="tabular-numbers">{time || '--:--:--'}</span>
                </div>
              </div>
            </div>

            {/* Connection badge */}
            <div
              className={`hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
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
                  <span className="hidden lg:inline">LIVE WS</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">OFFLINE</span>
                </>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 bg-bg-primary p-1 rounded-xl border border-bg-border overflow-x-auto">
            <button
              onClick={() => setActiveTab('kds')}
              className={`flex items-center space-x-1.5 sm:space-x-2 px-3 py-1.5 sm:py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'kds'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-600/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-bg-hover'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>KDS</span>
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
              className={`flex items-center space-x-1.5 sm:space-x-2 px-3 py-1.5 sm:py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'inventory'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-700/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-bg-hover'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Stock</span>
              {ticketCounts && ticketCounts.lowStock > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800/80 animate-pulse">
                  {ticketCounts.lowStock}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('ai-prep')}
              className={`flex items-center space-x-1.5 sm:space-x-2 px-3 py-1.5 sm:py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'ai-prep'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-amber-600/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-bg-hover'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Prep AI</span>
            </button>

            <button
              onClick={() => setActiveTab('waste-log')}
              className={`flex items-center space-x-1.5 sm:space-x-2 px-3 py-1.5 sm:py-2 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'waste-log'
                  ? 'bg-slate-700 text-white shadow-md shadow-slate-800/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-bg-hover'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Scrap Log</span>
            </button>

            {/* Team Tab — Visible exclusively to Owner and Admin */}
            {hasAdminAccess && (
              <button
                onClick={() => setActiveTab('team')}
                className={`flex items-center space-x-1.5 sm:space-x-2 px-3 py-1.5 sm:py-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === 'team'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-700/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-bg-hover'
                }`}
              >
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Team & Roles</span>
              </button>
            )}
          </nav>

          {/* Action Area: New Ticket + User Profile */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={onOpenNewTicket}
              className="flex items-center space-x-1.5 px-3 py-1.5 sm:py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-sky-900/40 hover:shadow-sky-800/60 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Ticket</span>
            </button>

            {/* User Profile Dropdown */}
            {isAuthenticated && user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-bg-card hover:bg-bg-hover border border-slate-700/80 transition-all text-xs"
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name}
                      className="w-6 h-6 rounded-md object-cover ring-1 ring-sky-500/50"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center font-bold text-white text-[11px] shadow-sm">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="hidden md:flex flex-col text-left">
                    <span className="font-semibold text-white truncate max-w-[110px] leading-tight">
                      {user.name}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1">
                      {isOwner ? (
                        <Crown className="w-2.5 h-2.5 text-amber-400 inline" />
                      ) : isAdmin ? (
                        <Shield className="w-2.5 h-2.5 text-sky-400 inline" />
                      ) : null}
                      {user.role}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl bg-bg-surface border border-slate-700 shadow-2xl shadow-black/80 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="p-2.5 border-b border-bg-border mb-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white truncate">{user.name}</span>
                        <span
                          className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-mono font-bold ${
                            isOwner
                              ? 'bg-amber-950/70 text-amber-300 border border-amber-800/60'
                              : isAdmin
                              ? 'bg-sky-950/70 text-sky-300 border border-sky-800/60'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {user.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{user.email}</div>

                      {/* Organization Info in menu */}
                      {organization && (
                        <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                          <span className="text-slate-400">Client:</span>
                          <span className="font-semibold text-sky-300 truncate max-w-[150px]">
                            {organization.name}
                          </span>
                        </div>
                      )}
                    </div>

                    {hasAdminAccess && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setActiveTab('team');
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-bg-hover rounded-lg transition-colors"
                      >
                        <Users className="w-4 h-4 text-emerald-400" />
                        <span>Manage Team & Roles</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="flex items-center space-x-1.5 px-3 py-2 bg-bg-card hover:bg-bg-hover text-slate-200 hover:text-white border border-slate-700/80 rounded-lg text-xs font-semibold transition-all active:scale-95 shadow-sm"
              >
                <LogIn className="w-4 h-4 text-sky-400" />
                <span>Sign In</span>
              </button>
            )}
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
