import React, { useState, useEffect, useMemo } from 'react';
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
  ChevronRight,
  Shield,
  Building2,
  Users,
  Crown,
  Activity,
  CheckCircle2,
  AlertTriangle,
  UtensilsCrossed,
  Menu,
  ChefHat,
  Sparkle,
  LayoutDashboard,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { ThemeToggle } from './ThemeToggle.js';
import { Button } from './ui/Button.js';
import { Badge } from './ui/Badge.js';
import * as Popover from '@radix-ui/react-popover';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';

export type AppTab = 'kds' | 'inventory' | 'menu' | 'ai-prep' | 'waste-log' | 'team' | 'dashboard';

export interface HeaderProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  isConnected: boolean;
  onOpenNewTicket: () => void;
  alerts: Array<{ id: string; message: string; timestamp: Date; type: string }>;
  onDismissAlert: (id: string) => void;
  ticketCounts?: { queue: number; firing: number; lowStock: number };
}

interface NavItem {
  id: AppTab;
  label: string;
  shortLabel: string;
  badge?: number;
  badgeVariant?: 'primary' | 'warning' | 'firing';
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  category: 'core' | 'intelligence' | 'management';
  accentGradient: string;
  accentColor: string;
  activeBorder: string;
  adminOnly?: boolean;
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
  const [pulseLiveUpdate, setPulseLiveUpdate] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const {
    user,
    organization,
    isAuthenticated,
    hasAdminAccess,
    isOwner,
    isAdmin,
    logout,
    openAuthModal,
  } = useAuth();

  const { theme, resolvedTheme } = useTheme();

  // 24-Hour Kitchen Time Standard
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Visual pulse on live socket updates
  useEffect(() => {
    setPulseLiveUpdate(true);
    const timer = setTimeout(() => setPulseLiveUpdate(false), 800);
    return () => clearTimeout(timer);
  }, [ticketCounts?.queue, ticketCounts?.firing, ticketCounts?.lowStock, alerts.length]);

  const totalActiveTickets = (ticketCounts?.queue ?? 0) + (ticketCounts?.firing ?? 0);

  // Complete catalog of operational options for the Hamburger Menu
  const navItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [
      {
        id: 'kds',
        label: 'Kitchen Display (KDS)',
        shortLabel: 'KDS',
        badge: totalActiveTickets > 0 ? totalActiveTickets : undefined,
        badgeVariant: (ticketCounts?.firing ?? 0) > 0 ? 'firing' : 'primary',
        icon: Flame,
        description: 'Live multi-station kanban, fire timers & auto BOM deduction',
        category: 'core',
        accentGradient: 'from-amber-500 to-orange-600',
        accentColor: 'text-amber-500 dark:text-amber-400',
        activeBorder: 'border-amber-500/50',
      },
      {
        id: 'inventory',
        label: 'Inventory & Stock Control',
        shortLabel: 'Stock',
        badge: ticketCounts && ticketCounts.lowStock > 0 ? ticketCounts.lowStock : undefined,
        badgeVariant: 'warning',
        icon: Layers,
        description: 'Real-time pantry counts, minimum safety lines & PO creation',
        category: 'core',
        accentGradient: 'from-sky-500 to-indigo-600',
        accentColor: 'text-sky-500 dark:text-sky-400',
        activeBorder: 'border-sky-500/50',
      },
      {
        id: 'menu',
        label: 'Dishes, Drinks & BOM Recipes',
        shortLabel: 'Dishes',
        icon: UtensilsCrossed,
        description: 'Menu item formulas, station mapping & ingredient portion costs',
        category: 'core',
        accentGradient: 'from-pink-500 to-rose-600',
        accentColor: 'text-pink-500 dark:text-pink-400',
        activeBorder: 'border-pink-500/50',
      },
      {
        id: 'ai-prep',
        label: 'Gemini AI Prep Sheet',
        shortLabel: 'AI Prep',
        icon: Sparkles,
        description: 'Shift demand forecasting, scrap mitigation & batch prep plans',
        category: 'intelligence',
        accentGradient: 'from-purple-500 to-indigo-600',
        accentColor: 'text-purple-500 dark:text-purple-400',
        activeBorder: 'border-purple-500/50',
      },
      {
        id: 'waste-log',
        label: 'Scrap & Waste Logger',
        shortLabel: 'Waste Log',
        icon: ClipboardList,
        description: 'Record shift trimmings, spoiled prep & auto food-cost calculation',
        category: 'intelligence',
        accentGradient: 'from-rose-500 to-orange-500',
        accentColor: 'text-rose-500 dark:text-rose-400',
        activeBorder: 'border-rose-500/50',
      },
    ];

    // Management-tier only operational options
    if (hasAdminAccess) {
      items.push({
        id: 'dashboard',
        label: 'Executive Command & Costs',
        shortLabel: 'Executive',
        icon: LayoutDashboard,
        description: 'Hotel cost metrics, automated PO policies & station telemetry',
        category: 'management',
        accentGradient: 'from-amber-500 via-orange-500 to-yellow-600',
        accentColor: 'text-amber-500 dark:text-amber-400',
        activeBorder: 'border-amber-500/50',
        adminOnly: true,
      });

      items.push({
        id: 'team',
        label: 'Team & RBAC Access',
        shortLabel: 'Team',
        icon: Users,
        description: 'Staff accounts, role assignments (Chef/Admin/Cook) & security',
        category: 'management',
        accentGradient: 'from-emerald-500 to-teal-600',
        accentColor: 'text-emerald-500 dark:text-emerald-400',
        activeBorder: 'border-emerald-400/50',
        adminOnly: true,
      });
    }

    return items;
  }, [totalActiveTickets, ticketCounts?.firing, ticketCounts?.lowStock, hasAdminAccess]);

  const activeItem = useMemo(
    () => navItems.find((item) => item.id === activeTab) || navItems[0],
    [navItems, activeTab]
  );

  const handleTabSelect = (tab: AppTab) => {
    setActiveTab(tab);
    setIsDrawerOpen(false);
  };

  const clearAllAlerts = () => {
    alerts.forEach((alert) => onDismissAlert(alert.id));
  };

  return (
    <>
      {/* ── STICKY NEUMORPHIC HEADER ── */}
      <header className="sticky top-0 z-40 w-full bg-neu-surface/90 backdrop-blur-xl border-b border-neu-border transition-all duration-300 shadow-neu-raised-sm select-none">
        {/* Ambient Top Glow Line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-sky-500/50 via-indigo-500/50 via-amber-500/50 to-transparent" />

        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2 sm:gap-4 w-full">
            
            {/* ── LEFT: Logo, Title, Hotel Badge & Live WebSocket ── */}
            <div className="flex items-center gap-2 sm:gap-3.5 min-w-0 flex-shrink">
              {/* Flame Logo Button */}
              <button
                type="button"
                onClick={() => setActiveTab('kds')}
                className="relative group cursor-pointer flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-xl"
                aria-label="KitchenPulse Home - KDS"
                title="KitchenPulse KDS"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-neu-surface border border-neu-border flex items-center justify-center shadow-neu-raised group-hover:shadow-neu-raised-lg group-active:shadow-neu-inset-sm transition-all duration-200">
                  <Flame className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform animate-pulse" />
                </div>
              </button>

              {/* Brand & Organization */}
              <div className="flex flex-col justify-center min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm sm:text-base lg:text-lg tracking-tight text-slate-900 dark:text-white drop-shadow-sm leading-none whitespace-nowrap">
                    Kitchen<span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 via-indigo-500 to-amber-500 dark:from-sky-400 dark:via-indigo-300 dark:to-amber-300">Pulse</span>
                  </span>
                </div>
                {organization ? (
                  <div
                    className="flex items-center gap-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400 leading-tight mt-0.5 min-w-0 max-w-[90px] sm:max-w-[150px] md:max-w-[200px]"
                    title={organization.name}
                  >
                    <Building2 className="w-3 h-3 text-sky-500 flex-shrink-0" />
                    <span className="truncate">{organization.name}</span>
                  </div>
                ) : (
                  <span className="hidden sm:inline text-[10px] text-slate-500 font-medium leading-tight mt-0.5 whitespace-nowrap">
                    Commercial Operations
                  </span>
                )}
              </div>

              {/* Live WebSocket Link Pill */}
              <div
                className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1 rounded-full text-xs font-medium border transition-all duration-300 flex-shrink-0 shadow-neu-raised-sm ${
                  isConnected
                    ? `bg-emerald-500/10 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-500/30 ${
                        pulseLiveUpdate ? 'ring-2 ring-emerald-400/50 scale-[1.02]' : ''
                      }`
                    : 'bg-rose-500/10 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-500/30 animate-pulse'
                }`}
                title={isConnected ? 'WebSocket Online — Real-Time Synced' : 'Disconnected — Reconnecting...'}
              >
                {isConnected ? (
                  <>
                    <span className="relative flex h-2 w-2 flex-shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <Wifi className="w-3 h-3 flex-shrink-0 text-emerald-500 hidden xl:block" />
                    <span className="font-extrabold text-[10px] tracking-wider hidden xl:inline">LIVE WS</span>
                    <span className="text-emerald-500/40 font-light hidden sm:inline">|</span>
                    <div className="flex items-center gap-1 font-mono text-[11px]">
                      <Clock className="w-3 h-3 text-emerald-500/80 flex-shrink-0 hidden md:block" />
                      <span className="tabular-numbers font-semibold">{time || '--:--:--'}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 flex-shrink-0 text-rose-500" />
                    <span className="font-extrabold text-[10px] tracking-wider hidden sm:inline">OFFLINE</span>
                    <span className="text-rose-500/40 font-light hidden sm:inline">|</span>
                    <span className="tabular-numbers font-mono text-[11px]">{time || '--:--:--'}</span>
                  </>
                )}
              </div>
            </div>

            {/* ── CENTER: Active Module Indicator / Quick Switch Pill ── */}
            <div className="hidden md:flex items-center">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="group flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-neu-surface hover:bg-neu-hover border border-neu-border text-xs font-semibold text-slate-800 dark:text-slate-100 transition-all shadow-neu-raised-sm hover:shadow-neu-raised active:shadow-neu-inset-sm active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 cursor-pointer"
                title="Click to view all kitchen options"
              >
                <div className={`w-5 h-5 rounded-lg flex items-center justify-center bg-gradient-to-tr ${activeItem.accentGradient} text-white shadow-sm`}>
                  <activeItem.icon className="w-3 h-3" />
                </div>
                <span className="font-bold">{activeItem.label}</span>
                {activeItem.badge !== undefined && activeItem.badge > 0 && (
                  <span className="px-1.5 py-0 text-[10px] font-mono font-bold rounded-full bg-sky-500 text-white shadow-sm">
                    {activeItem.badge}
                  </span>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-transform group-hover:translate-y-0.5" />
              </button>
            </div>

            {/* ── RIGHT: Theme Toggle, New Ticket, Alerts, Profile & Hamburger Menu ── */}
            <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
              
              {/* Neumorphic Light / Dark Mode Toggle Switch */}
              <ThemeToggle variant="pill" />

              {/* Primary Action: New Ticket Button */}
              <Button
                variant="default"
                size="sm"
                onClick={onOpenNewTicket}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white shadow-glow-sky border border-sky-400/40 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-200" />
                <span>New Ticket</span>
              </Button>

              {/* Mobile Icon Button for New Ticket (< sm) */}
              <button
                type="button"
                onClick={onOpenNewTicket}
                className="sm:hidden flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-glow-sky border border-sky-400/40 active:scale-95 transition-transform"
                title="Create New Ticket"
                aria-label="Create New Ticket"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* Live Alerts Bell - Radix Popover */}
              <Popover.Root>
                <Popover.Trigger asChild>
                  <button
                    type="button"
                    className={`relative p-2 rounded-xl border border-neu-border transition-all duration-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 cursor-pointer ${
                      alerts.length > 0
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 shadow-glow-amber'
                        : 'bg-neu-surface text-slate-600 dark:text-slate-400 shadow-neu-raised-sm hover:shadow-neu-raised active:shadow-neu-inset-sm'
                    }`}
                    title={`${alerts.length} live kitchen alerts`}
                    aria-label={`Kitchen Alerts (${alerts.length})`}
                  >
                    {alerts.length > 0 ? (
                      <BellRing className="w-4 h-4 text-amber-500 animate-bounce" />
                    ) : (
                      <Bell className="w-4 h-4" />
                    )}
                    {alerts.length > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-sm">
                        {alerts.length}
                      </span>
                    )}
                  </button>
                </Popover.Trigger>

                <Popover.Portal>
                  <Popover.Content
                    className="z-50 w-[calc(100vw-24px)] sm:w-96 rounded-2xl bg-neu-surface border border-neu-border shadow-neu-raised-lg p-3 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
                    sideOffset={10}
                    align="end"
                    collisionPadding={12}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-neu-borderSubtle mb-2">
                      <div className="flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs font-bold text-slate-800 dark:text-white">Live System Alerts</span>
                        <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                          {alerts.length}
                        </Badge>
                      </div>
                      {alerts.length > 0 && (
                        <button
                          type="button"
                          onClick={clearAllAlerts}
                          className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline font-medium transition-colors cursor-pointer"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {alerts.length === 0 ? (
                        <div className="py-6 text-center text-slate-500 dark:text-slate-400 space-y-1">
                          <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">All Systems Clear</div>
                          <div className="text-[10px]">No active stock or operational alerts</div>
                        </div>
                      ) : (
                        <AnimatePresence initial={false}>
                          {alerts.map((alert) => (
                            <motion.div
                              key={alert.id}
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              className="p-2.5 rounded-xl bg-neu-card border border-neu-border flex items-start justify-between gap-2 shadow-neu-raised-sm"
                            >
                              <div className="flex items-start gap-2 min-w-0">
                                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <Badge variant="warning" className="text-[9px] uppercase tracking-wider px-1.5 py-0">
                                      {alert.type}
                                    </Badge>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-700 dark:text-slate-200 font-medium break-words leading-tight">{alert.message}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => onDismissAlert(alert.id)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
                                title="Dismiss"
                                aria-label="Dismiss alert"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      )}
                    </div>
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>

              {/* User Profile Dropdown */}
              {isAuthenticated && user ? (
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-neu-surface hover:bg-neu-hover border border-neu-border text-xs active:scale-95 shadow-neu-raised-sm hover:shadow-neu-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 cursor-pointer"
                      aria-label="User profile menu"
                    >
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.name}
                          className="w-6 h-6 rounded-lg object-cover ring-1 ring-sky-500/50 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white text-[11px] shadow-sm flex-shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="hidden lg:flex flex-col text-left min-w-0">
                        <span className="font-bold text-slate-800 dark:text-white truncate max-w-[85px] leading-tight text-[11px]">
                          {user.name}
                        </span>
                        <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-0.5 leading-none mt-0.5">
                          {isOwner ? (
                            <Crown className="w-2.5 h-2.5 text-amber-500 inline" />
                          ) : isAdmin ? (
                            <Shield className="w-2.5 h-2.5 text-sky-500 inline" />
                          ) : (
                            <ChefHat className="w-2.5 h-2.5 text-emerald-500 inline" />
                          )}
                          {user.role}
                        </span>
                      </div>
                    </button>
                  </DropdownMenu.Trigger>

                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      className="z-50 min-w-[15rem] rounded-2xl bg-neu-surface border border-neu-border shadow-neu-raised-lg p-2.5 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
                      sideOffset={8}
                      align="end"
                      collisionPadding={12}
                    >
                      <div className="p-2.5 rounded-xl bg-neu-sunken border border-neu-borderSubtle mb-2 shadow-neu-inset-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.name}</span>
                          <Badge
                            variant={isOwner ? 'warning' : isAdmin ? 'default' : 'secondary'}
                            className="text-[9px] uppercase px-1.5 py-0.5 rounded-md font-mono font-bold"
                          >
                            {user.role}
                          </Badge>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-mono">{user.email}</div>

                        {organization && (
                          <div className="mt-2 pt-2 border-t border-neu-borderSubtle flex items-center justify-between text-[10px]">
                            <span className="text-slate-500 dark:text-slate-400">Hotel / Client:</span>
                            <span className="font-bold text-sky-600 dark:text-sky-300 truncate max-w-[130px]">
                              {organization.name}
                            </span>
                          </div>
                        )}
                      </div>

                      {hasAdminAccess && (
                        <>
                          <DropdownMenu.Item asChild>
                            <button
                              type="button"
                              onClick={() => handleTabSelect('dashboard')}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-amber-600 dark:text-amber-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors font-semibold mb-1 outline-none cursor-pointer"
                            >
                              <LayoutDashboard className="w-4 h-4 text-amber-500" />
                              <span>Executive Dashboard</span>
                            </button>
                          </DropdownMenu.Item>

                          <DropdownMenu.Item asChild>
                            <button
                              type="button"
                              onClick={() => handleTabSelect('team')}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors font-medium mb-1 outline-none cursor-pointer"
                            >
                              <Users className="w-4 h-4 text-emerald-500" />
                              <span>Manage Team & Roles</span>
                            </button>
                          </DropdownMenu.Item>
                        </>
                      )}

                      <DropdownMenu.Item asChild>
                        <button
                          type="button"
                          onClick={() => logout()}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors font-medium outline-none cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openAuthModal('login')}
                  className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-semibold rounded-xl"
                >
                  <LogIn className="w-3.5 h-3.5 text-sky-500" />
                  <span className="hidden sm:inline">Sign In</span>
                </Button>
              )}

              {/* ── THE PROMINENT HAMBURGER MENU BUTTON ── */}
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="relative flex items-center gap-2 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-neu-surface hover:bg-neu-hover border border-neu-border text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white shadow-neu-raised-sm hover:shadow-neu-raised active:shadow-neu-inset-sm transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 group cursor-pointer"
                title="Open Kitchen Options Menu"
                aria-label="Open Kitchen Options Menu"
              >
                <Menu className="w-5 h-5 text-sky-500 group-hover:scale-110 transition-transform" />
                <span className="font-extrabold text-xs tracking-wide hidden sm:inline">Menu</span>
                {/* Visual live update notification dot */}
                {totalActiveTickets > 0 && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
                  </span>
                )}
              </button>

            </div>
          </div>
        </div>
      </header>

      {/* ── SLIDE-OVER HAMBURGER DRAWER (WITH FULL NEUMORPHIC THEME OPTIONS) ── */}
      <Dialog.Root open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 dark:bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200" />
          <Dialog.Content className="fixed inset-y-0 right-0 z-50 w-full max-w-sm sm:max-w-md bg-neu-surface border-l border-neu-border shadow-2xl p-4 sm:p-6 flex flex-col justify-between overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-250 outline-none text-slate-800 dark:text-slate-100">
            
            <div className="space-y-5">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-neu-borderSubtle">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-neu-surface border border-neu-border flex items-center justify-center shadow-neu-raised-sm">
                    <Flame className="w-5 h-5 text-amber-500 animate-pulse" />
                  </div>
                  <div>
                    <Dialog.Title className="text-base font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                      Kitchen<span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-amber-500">Pulse</span> Options
                    </Dialog.Title>
                    <Dialog.Description className="text-[11px] text-slate-500 dark:text-slate-400 leading-none mt-0.5">
                      {organization ? organization.name : 'Kitchen Operations Command'}
                    </Dialog.Description>
                  </div>
                </div>

                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 cursor-pointer"
                    aria-label="Close options menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </Dialog.Close>
              </div>

              {/* Theme Selector Section inside Drawer */}
              <div className="p-3 rounded-2xl bg-neu-card border border-neu-border shadow-neu-raised-sm space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <div className="flex items-center gap-2">
                    {resolvedTheme === 'dark' ? (
                      <Moon className="w-4 h-4 text-sky-400" />
                    ) : (
                      <Sun className="w-4 h-4 text-amber-500" />
                    )}
                    <span>Theme & Appearance</span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono capitalize">
                    {theme} Mode
                  </span>
                </div>
                <ThemeToggle variant="buttons" className="w-full justify-between" />
              </div>

              {/* Real-Time Live Status Card */}
              <div className="p-3 rounded-2xl bg-neu-sunken border border-neu-borderSubtle flex items-center justify-between text-xs shadow-neu-inset-sm">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900 dark:text-white text-[11px]">
                      {isConnected ? 'Real-Time WebSocket Active' : 'Offline / Reconnecting'}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      {organization?.code ? `Node: ${organization.code}` : 'Central Channel'}
                    </span>
                  </div>
                </div>
                <div className="text-right font-mono text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400 block text-[9px] uppercase tracking-wider">Kitchen Clock</span>
                  <span className="font-bold tabular-numbers text-emerald-600 dark:text-emerald-300">{time || '--:--:--'}</span>
                </div>
              </div>

              {/* Quick Action: Fire New Ticket */}
              <Button
                variant="default"
                size="default"
                onClick={() => {
                  setIsDrawerOpen(false);
                  onOpenNewTicket();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-extrabold text-xs bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white shadow-glow-sky border border-sky-400/40 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Kitchen Ticket</span>
              </Button>

              {/* ── ALL OPERATIONAL MODULES (THE OPTIONS) ── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Kitchen Modules & Workspaces
                  </span>
                  <span className="text-[10px] text-sky-600 dark:text-sky-400 font-mono font-medium">
                    {navItems.length} Options
                  </span>
                </div>

                <div className="space-y-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleTabSelect(item.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 text-left active:scale-[0.98] group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                          isActive
                            ? 'bg-neu-surface border-sky-500/50 shadow-neu-raised ring-1 ring-sky-500/30'
                            : 'bg-neu-card border-neu-border hover:bg-neu-surface hover:shadow-neu-raised-sm'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-tr ${item.accentGradient} text-white shadow-sm group-hover:scale-105 transition-transform`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold leading-tight ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                                {item.label}
                              </span>
                              {isActive && (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-400/40 leading-none">
                                  ACTIVE
                                </span>
                              )}
                              {item.adminOnly && (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 leading-none">
                                  ADMIN
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate leading-tight mt-1">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          {item.badge !== undefined && item.badge > 0 && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                                item.badgeVariant === 'warning'
                                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 animate-pulse'
                                  : item.badgeVariant === 'firing'
                                  ? 'bg-amber-500 text-white font-black'
                                  : 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/40'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                          <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${isActive ? 'text-sky-500' : 'text-slate-400'}`} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Drawer Footer: User Profile & Session */}
            <div className="pt-4 border-t border-neu-borderSubtle mt-6 space-y-3">
              {isAuthenticated && user ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-neu-sunken border border-neu-borderSubtle shadow-neu-inset-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.name}
                        className="w-8 h-8 rounded-xl object-cover ring-1 ring-sky-500/50"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 text-left">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">{user.role}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      logout();
                    }}
                    className="p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Sign Out"
                    aria-label="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Button
                  variant="default"
                  size="default"
                  onClick={() => {
                    setIsDrawerOpen(false);
                    openAuthModal('login');
                  }}
                  className="w-full text-xs font-bold"
                >
                  <LogIn className="w-4 h-4 mr-1.5 text-sky-400" />
                  <span>Sign In to KitchenPulse</span>
                </Button>
              )}
            </div>

          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* ── MOBILE QUICK ACCESS DOCK (< md) ── */}
      <nav
        className="md:hidden fixed bottom-3 inset-x-3 z-30 max-w-lg mx-auto bg-neu-surface/95 rounded-2xl p-1.5 flex justify-around items-center border border-neu-border shadow-neu-raised select-none"
        aria-label="Mobile Navigation Dock"
      >
        {/* KDS */}
        <button
          type="button"
          onClick={() => handleTabSelect('kds')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer ${
            activeTab === 'kds'
              ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 shadow-neu-inset-sm border border-sky-400/30'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          aria-label="KDS Queue"
        >
          <div className="relative">
            <Flame className="w-5 h-5" />
            {totalActiveTickets > 0 && (
              <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-sky-500 text-white leading-none shadow-sm">
                {totalActiveTickets}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold mt-1">KDS</span>
        </button>

        {/* Stock */}
        <button
          type="button"
          onClick={() => handleTabSelect('inventory')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer ${
            activeTab === 'inventory'
              ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 shadow-neu-inset-sm border border-indigo-400/30'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          aria-label="Inventory Stock"
        >
          <div className="relative">
            <Layers className="w-5 h-5" />
            {ticketCounts && ticketCounts.lowStock > 0 && (
              <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-white leading-none animate-pulse">
                {ticketCounts.lowStock}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold mt-1">Stock</span>
        </button>

        {/* Dishes */}
        <button
          type="button"
          onClick={() => handleTabSelect('menu')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer ${
            activeTab === 'menu'
              ? 'bg-pink-500/15 text-pink-600 dark:text-pink-400 shadow-neu-inset-sm border border-pink-400/30'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          aria-label="Recipes & BOM"
        >
          <UtensilsCrossed className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">Dishes</span>
        </button>

        {/* AI Prep */}
        <button
          type="button"
          onClick={() => handleTabSelect('ai-prep')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer ${
            activeTab === 'ai-prep'
              ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 shadow-neu-inset-sm border border-purple-400/30'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          aria-label="AI Prep Sheet"
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">AI Prep</span>
        </button>

        {/* Hamburger Trigger for more */}
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all duration-200 active:scale-95 cursor-pointer"
          aria-label="More Options"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">More</span>
        </button>
      </nav>
    </>
  );
};
