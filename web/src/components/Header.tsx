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
  BellRing,
  X,
  Clock,
  LogIn,
  LogOut,
  ChevronDown,
  Shield,
  Building2,
  Users,
  Crown,
  Activity,
  CheckCircle2,
  AlertTriangle,
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
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [pulseLiveUpdate, setPulseLiveUpdate] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const alertsMenuRef = useRef<HTMLDivElement>(null);

  const { user, organization, isAuthenticated, hasAdminAccess, isOwner, isAdmin, logout, openAuthModal } = useAuth();

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (alertsMenuRef.current && !alertsMenuRef.current.contains(e.target as Node)) {
        setIsAlertsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live real-time clock update
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Trigger brief live update glow whenever ticketCounts or alerts change
  useEffect(() => {
    setPulseLiveUpdate(true);
    const timer = setTimeout(() => setPulseLiveUpdate(false), 800);
    return () => clearTimeout(timer);
  }, [ticketCounts?.queue, ticketCounts?.firing, ticketCounts?.lowStock, alerts.length]);

  const totalActiveTickets = (ticketCounts?.queue ?? 0) + (ticketCounts?.firing ?? 0);

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-950/75 backdrop-blur-2xl border-b border-white/10 transition-all duration-300 shadow-glass">
        {/* Subtle Ambient Top Accent Light */}
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-sky-500/50 via-indigo-500/50 via-amber-500/50 to-transparent" />

        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2 flex-nowrap">
            
            {/* Left Block: Brand Stack + Organization Name & Live WS Badge */}
            <div className="flex items-center space-x-2 sm:space-x-3.5 min-w-0 flex-shrink-0">
              <div className="flex items-center space-x-2.5">
                {/* Brand Glowing Flame Logo */}
                <div className="relative group cursor-pointer flex-shrink-0" onClick={() => setActiveTab('kds')}>
                  <div className="absolute -inset-1 bg-gradient-to-tr from-sky-500 via-indigo-500 to-amber-500 rounded-2xl blur-sm opacity-70 group-hover:opacity-100 transition-all duration-300 group-hover:scale-105" />
                  <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900/90 border border-white/20 flex items-center justify-center shadow-lg group-hover:border-white/40 transition-colors">
                    <Flame className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform animate-pulse" />
                  </div>
                </div>

                {/* Brand Title & Organization.name stacked below */}
                <div className="flex flex-col justify-center min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-black text-base sm:text-lg tracking-tight text-white drop-shadow-sm leading-none whitespace-nowrap">
                      Kitchen<span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-300 to-amber-300">Pulse</span>
                    </span>
                  </div>
                  {/* Organization Name directly below KitchenPulse */}
                  {organization ? (
                    <div className="flex items-center space-x-1 text-[11px] font-bold text-sky-400/95 leading-tight mt-1 max-w-[120px] sm:max-w-[170px] md:max-w-[210px] group cursor-default">
                      <Building2 className="w-3 h-3 text-sky-400 flex-shrink-0" />
                      <span className="truncate">{organization.name}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5 whitespace-nowrap">Kitchen Operations</span>
                  )}
                </div>
              </div>

              {/* Live WS Badge with Time inside + Pulse animation */}
              <div
                className={`flex items-center space-x-1.5 sm:space-x-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs font-medium border backdrop-blur-xl transition-all duration-300 select-none flex-shrink-0 ${
                  isConnected
                    ? `bg-emerald-950/45 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.18)] ${
                        pulseLiveUpdate ? 'ring-2 ring-emerald-400/50 scale-[1.02]' : ''
                      }`
                    : 'bg-rose-950/45 text-rose-300 border-rose-500/40 animate-pulse'
                }`}
                title={isConnected ? 'Real-Time WebSocket Link Active' : 'Disconnected — attempting reconnection...'}
              >
                {isConnected ? (
                  <>
                    <span className="relative flex h-2 w-2 flex-shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                    </span>
                    <Wifi className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
                    <span className="font-extrabold text-[11px] tracking-wider hidden sm:inline">LIVE WS</span>
                    <span className="font-extrabold text-[10px] tracking-wider sm:hidden">LIVE</span>
                    <span className="text-emerald-500/40 font-light">|</span>
                    <div className="flex items-center space-x-1 font-mono text-[11px] text-emerald-200">
                      <Clock className="w-3 h-3 text-emerald-400/80 flex-shrink-0" />
                      <span className="tabular-numbers font-semibold">{time || '--:--:--'}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 flex-shrink-0 text-rose-400" />
                    <span className="font-extrabold text-[11px] tracking-wider hidden sm:inline">OFFLINE</span>
                    <span className="font-extrabold text-[10px] tracking-wider sm:hidden">OFF</span>
                    <span className="text-rose-500/40 font-light">|</span>
                    <div className="flex items-center space-x-1 font-mono text-[11px] text-rose-300">
                      <Clock className="w-3 h-3 text-rose-400/80 flex-shrink-0" />
                      <span className="tabular-numbers font-semibold">{time || '--:--:--'}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Live Workload Indicator on Larger Screens */}
              {ticketCounts && totalActiveTickets > 0 && (
                <div className="hidden xl:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-slate-900/60 border border-white/10 text-xs backdrop-blur-md flex-shrink-0">
                  <Activity className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span className="text-slate-400 text-[11px]">Active:</span>
                  <span className="text-white font-extrabold font-mono text-[11px]">
                    {totalActiveTickets}
                  </span>
                  {ticketCounts.firing > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {ticketCounts.firing} 🔥 firing
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Middle Block: Floating Glass Navigation Tabs — Desktop & Tablet */}
            <nav className="hidden md:flex items-center space-x-1 bg-slate-900/60 p-1.5 rounded-2xl border border-white/10 backdrop-blur-xl shadow-glass flex-shrink-0">
              {/* KDS Tab */}
              <button
                onClick={() => setActiveTab('kds')}
                className={`group relative flex items-center space-x-1.5 sm:space-x-2 px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  activeTab === 'kds'
                    ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-glow-sky border border-sky-400/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Flame className={`w-4 h-4 transition-transform ${activeTab === 'kds' ? 'scale-110 text-amber-300' : 'group-hover:scale-110'}`} />
                <span>KDS</span>
                {totalActiveTickets > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold transition-all duration-200 ${
                      activeTab === 'kds'
                        ? 'bg-sky-800 text-sky-100'
                        : 'bg-slate-800 text-sky-300 border border-sky-500/30'
                    }`}
                  >
                    {totalActiveTickets}
                  </span>
                )}
              </button>

              {/* Stock Tab */}
              <button
                onClick={() => setActiveTab('inventory')}
                className={`group relative flex items-center space-x-1.5 sm:space-x-2 px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  activeTab === 'inventory'
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] border border-indigo-400/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Layers className={`w-4 h-4 transition-transform ${activeTab === 'inventory' ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span>Stock</span>
                {ticketCounts && ticketCounts.lowStock > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-950 text-amber-300 border border-amber-500/40 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                    {ticketCounts.lowStock}
                  </span>
                )}
              </button>

              {/* Prep AI Tab */}
              <button
                onClick={() => setActiveTab('ai-prep')}
                className={`group relative flex items-center space-x-1.5 sm:space-x-2 px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  activeTab === 'ai-prep'
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-glow-purple border border-purple-400/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Sparkles className={`w-4 h-4 text-amber-300 transition-transform ${activeTab === 'ai-prep' ? 'scale-110 animate-pulse' : 'group-hover:scale-110'}`} />
                <span className="hidden lg:inline">Prep AI</span>
                <span className="lg:hidden">Prep</span>
              </button>

              {/* Scrap Log Tab */}
              <button
                onClick={() => setActiveTab('waste-log')}
                className={`group relative flex items-center space-x-1.5 sm:space-x-2 px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  activeTab === 'waste-log'
                    ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-glass border border-white/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <ClipboardList className={`w-4 h-4 transition-transform ${activeTab === 'waste-log' ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span className="hidden lg:inline">Scrap Log</span>
                <span className="lg:hidden">Scrap</span>
              </button>

              {/* Team & Roles Tab (Admin / Owner exclusive) */}
              {hasAdminAccess && (
                <button
                  onClick={() => setActiveTab('team')}
                  className={`group relative flex items-center space-x-1.5 sm:space-x-2 px-2.5 lg:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    activeTab === 'team'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-glow-emerald border border-emerald-400/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <Users className={`w-4 h-4 text-emerald-400 transition-transform ${activeTab === 'team' ? 'scale-110' : 'group-hover:scale-110'}`} />
                  <span className="hidden lg:inline">Team & Roles</span>
                  <span className="lg:hidden">Team</span>
                </button>
              )}
            </nav>

            {/* Right Block: Live Alerts Bell + New Ticket + User Profile */}
            <div className="flex items-center space-x-2 sm:space-x-2.5">
              
              {/* Interactive Live Alerts Center */}
              <div className="relative" ref={alertsMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsAlertsOpen(!isAlertsOpen)}
                  className={`relative p-2 rounded-xl border transition-all duration-200 active:scale-95 ${
                    alerts.length > 0
                      ? 'bg-amber-950/40 text-amber-300 border-amber-500/40 shadow-glow-amber hover:bg-amber-900/50'
                      : 'bg-slate-900/60 text-slate-400 border-white/10 hover:text-slate-200 hover:bg-white/5'
                  }`}
                  title={`${alerts.length} live kitchen alerts`}
                >
                  {alerts.length > 0 ? (
                    <BellRing className="w-4 h-4 text-amber-400 animate-bounce" />
                  ) : (
                    <Bell className="w-4 h-4" />
                  )}
                  {alerts.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-[0_0_8px_#f43f5e]">
                      {alerts.length}
                    </span>
                  )}
                </button>

                {/* Alerts Popover Menu */}
                {isAlertsOpen && (
                  <div className="absolute right-0 mt-2.5 w-80 sm:w-96 rounded-2xl bg-slate-950/95 border border-white/15 shadow-glass-lg p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-2xl">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
                      <div className="flex items-center space-x-1.5">
                        <Bell className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-xs font-bold text-white">Live System Alerts</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-slate-800 text-slate-300">
                          {alerts.length}
                        </span>
                      </div>
                      {alerts.length > 0 && (
                        <span className="text-[10px] text-slate-400">Click × to dismiss</span>
                      )}
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {alerts.length === 0 ? (
                        <div className="py-6 text-center text-slate-400 space-y-1">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                          <div className="text-xs font-semibold text-slate-300">All Systems Clear</div>
                          <div className="text-[10px] text-slate-500">No active stock or operational alerts</div>
                        </div>
                      ) : (
                        alerts.map((alert) => (
                          <div
                            key={alert.id}
                            className="p-2.5 rounded-xl bg-slate-900/80 border border-white/10 hover:border-white/20 flex items-start justify-between space-x-2 transition-colors"
                          >
                            <div className="flex items-start space-x-2 min-w-0">
                              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                              <div className="min-w-0">
                                <div className="flex items-center space-x-1.5 mb-0.5">
                                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    {alert.type}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-200 font-medium break-words leading-tight">{alert.message}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onDismissAlert(alert.id)}
                              className="text-slate-500 hover:text-slate-200 p-1 rounded-lg hover:bg-white/10 transition-colors"
                              title="Dismiss"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button: New Ticket */}
              <button
                onClick={onOpenNewTicket}
                className="group relative flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-gradient-to-r from-sky-500 via-indigo-500 to-sky-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-glow-sky border border-sky-300/30 transition-all duration-200 active:scale-95 hover:shadow-lg"
              >
                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
                <span className="hidden sm:inline font-extrabold tracking-wide">New Ticket</span>
              </button>

              {/* User Profile Dropdown */}
              {isAuthenticated && user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-2 px-2 py-1.5 sm:px-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-white/10 hover:border-white/20 transition-all text-xs active:scale-95 shadow-glass"
                  >
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.name}
                        className="w-6 h-6 rounded-lg object-cover ring-1 ring-sky-500/50"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center font-bold text-white text-[11px] shadow-sm">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="hidden md:flex flex-col text-left">
                      <span className="font-bold text-white truncate max-w-[110px] leading-tight text-[11px]">
                        {user.name}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1 leading-none mt-0.5">
                        {isOwner ? (
                          <Crown className="w-2.5 h-2.5 text-amber-400 inline" />
                        ) : isAdmin ? (
                          <Shield className="w-2.5 h-2.5 text-sky-400 inline" />
                        ) : null}
                        {user.role}
                      </span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180 text-white' : ''}`} />
                  </button>

                  {/* Profile Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2.5 w-64 rounded-2xl bg-slate-950/95 border border-white/15 shadow-glass-lg p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-2xl">
                      <div className="p-2 rounded-xl bg-slate-900/60 border border-white/10 mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-white truncate">{user.name}</span>
                          <span
                            className={`text-[9px] uppercase px-1.5 py-0.5 rounded-md font-mono font-bold ${
                              isOwner
                                ? 'bg-amber-950/70 text-amber-300 border border-amber-500/40 shadow-glow-amber'
                                : isAdmin
                                ? 'bg-sky-950/70 text-sky-300 border border-sky-500/40 shadow-glow-sky'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {user.role}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate font-mono">{user.email}</div>

                        {/* Organization Info in menu */}
                        {organization && (
                          <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[10px]">
                            <span className="text-slate-400">Hotel / Client:</span>
                            <span className="font-bold text-sky-300 truncate max-w-[140px]">
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
                          className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors font-medium mb-1"
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
                        className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl transition-colors font-medium"
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
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900/60 hover:bg-slate-800/80 text-slate-200 hover:text-white border border-white/10 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm"
                >
                  <LogIn className="w-4 h-4 text-sky-400" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Floating Glass Dock Navigation for Mobile Phones (< md) */}
      <nav className="md:hidden fixed bottom-3 inset-x-3 z-50 glass-panel rounded-2xl p-1.5 flex justify-around items-center border border-white/15 shadow-glass-lg backdrop-blur-2xl">
        <button
          onClick={() => setActiveTab('kds')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 active:scale-95 ${
            activeTab === 'kds'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-glow-sky'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Flame className="w-5 h-5" />
            {totalActiveTickets > 0 && (
              <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-sky-500 text-white leading-none shadow-[0_0_6px_#38bdf8]">
                {totalActiveTickets}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold mt-1">KDS</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 active:scale-95 ${
            activeTab === 'inventory'
              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.3)]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Layers className="w-5 h-5" />
            {ticketCounts && ticketCounts.lowStock > 0 && (
              <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-slate-950 leading-none animate-pulse">
                {ticketCounts.lowStock}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold mt-1">Stock</span>
        </button>

        <button
          onClick={() => setActiveTab('ai-prep')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 active:scale-95 ${
            activeTab === 'ai-prep'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-glow-purple'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-5 h-5 text-amber-300" />
          <span className="text-[10px] font-bold mt-1">Prep AI</span>
        </button>

        <button
          onClick={() => setActiveTab('waste-log')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 active:scale-95 ${
            activeTab === 'waste-log'
              ? 'bg-slate-700/40 text-slate-200 border border-white/20 shadow-glass'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ClipboardList className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">Scrap</span>
        </button>

        {hasAdminAccess && (
          <button
            onClick={() => setActiveTab('team')}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 active:scale-95 ${
              activeTab === 'team'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-glow-emerald'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-5 h-5 text-emerald-400" />
            <span className="text-[10px] font-bold mt-1">Team</span>
          </button>
        )}
      </nav>
    </>
  );
};
export default Header;
