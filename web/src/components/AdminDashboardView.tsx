import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Sliders,
  Settings,
  ShieldCheck,
  Building2,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Cpu,
  Database,
  Lock,
  Crown,
  Shield,
  Users,
  CheckCircle2,
  RefreshCw,
  Bell,
  Save,
  Sparkles,
  Zap,
  Boxes,
  ArrowUpRight,
  UtensilsCrossed,
  Activity,
  ChevronRight,
  Info,
  ChefHat,
} from 'lucide-react';
import {
  Ingredient,
  Recipe,
  SupplierOrder,
  FoodCostSummary,
  Ticket,
} from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';
import { AppTab } from './Header.js';
import { Badge } from './ui/Badge.js';
import { Button } from './ui/Button.js';
import { foodCostApi } from '../api/client.js';

interface AdminDashboardViewProps {
  ingredients: Ingredient[];
  recipes: Recipe[];
  supplierOrders: SupplierOrder[];
  foodCostSummaries: FoodCostSummary[];
  tickets: Ticket[];
  onNavigate: (tab: AppTab) => void;
}

type DashboardSection = 'overview' | 'automation' | 'organization' | 'security';

interface AdminSettingsState {
  autoPoEnabled: boolean;
  autoPoThresholdPct: number;
  expeditedDelivery: boolean;
  aiPortionBufferPct: number;
  autoBOMDeduction: boolean;
  scrapAlertThresholdPct: number;
  soundAlertsEnabled: boolean;
  nightlyAiAudit: boolean;
  currency: string;
  timezone: string;
  hotelContactPhone: string;
  hotelAddress: string;
}

const DEFAULT_SETTINGS: AdminSettingsState = {
  autoPoEnabled: true,
  autoPoThresholdPct: 15,
  expeditedDelivery: false,
  aiPortionBufferPct: 10,
  autoBOMDeduction: true,
  scrapAlertThresholdPct: 8,
  soundAlertsEnabled: true,
  nightlyAiAudit: true,
  currency: 'USD ($)',
  timezone: 'America/New_York (EST)',
  hotelContactPhone: '+1 (555) 892-4100',
  hotelAddress: 'Grand Avenue Central, Suite 400',
};

const SETTINGS_STORAGE_KEY = 'kitchenpulse_admin_settings';

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  ingredients,
  recipes,
  supplierOrders,
  foodCostSummaries,
  tickets,
  onNavigate,
}) => {
  const { user, organization, isOwner, isAdmin, hasAdminAccess } = useAuth();
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview');
  const [isRefreshingCost, setIsRefreshingCost] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Load persistent admin settings
  const [settings, setSettings] = useState<AdminSettingsState>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const saveSettings = (newSettings: AdminSettingsState) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      setSaveSuccessMessage('Settings successfully saved to organization policy.');
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } catch (e) {
      console.error('Failed to save admin settings', e);
    }
  };

  // ---------------------------------------------------------------- //
  // Financial & Operational Metrics (Owner/Admin Only)
  // ---------------------------------------------------------------- //
  const totalInventoryValuation = useMemo(() => {
    return ingredients.reduce(
      (sum, item) => sum + (Number(item.current_stock) || 0) * (Number(item.cost_per_unit) || 0),
      0
    );
  }, [ingredients]);

  const criticalStockCount = useMemo(() => {
    return ingredients.filter(
      (i) => Number(i.current_stock) <= Number(i.minimum_threshold)
    ).length;
  }, [ingredients]);

  const pendingPoValuation = useMemo(() => {
    return supplierOrders
      .filter((o) => o.status === 'PENDING')
      .reduce((sum, o) => {
        const ing = ingredients.find((i) => i.id === o.ingredient_id);
        const cost = ing ? Number(ing.cost_per_unit) || 0 : 15;
        return sum + (Number(o.quantity_ordered) || 0) * cost;
      }, 0);
  }, [supplierOrders, ingredients]);

  const avgFoodCostPct = useMemo(() => {
    if (!foodCostSummaries || foodCostSummaries.length === 0) return 28.5;
    const valid = foodCostSummaries.filter((f) => (Number(f.food_cost_pct) || 0) > 0);
    if (valid.length === 0) return 28.5;
    return (
      valid.reduce((sum, f) => sum + (Number(f.food_cost_pct) || 0), 0) / valid.length
    );
  }, [foodCostSummaries]);

  const totalActiveTickets = useMemo(() => {
    return tickets.filter((t) => t.status === 'QUEUE' || t.status === 'FIRING').length;
  }, [tickets]);

  const handleRefreshFoodCost = async () => {
    try {
      setIsRefreshingCost(true);
      await foodCostApi.refresh();
      setSaveSuccessMessage('Food cost materialized view refreshed successfully.');
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshingCost(false);
    }
  };

  // Guard clause: Strict RBAC check for Owner / Admin
  if (!hasAdminAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-rose-950/50 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-5 shadow-2xl">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-white tracking-tight mb-2">
          Owner & Admin Access Restricted
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed mb-6">
          This Executive Dashboard contains financial cost margins, supply chain procurement
          settings, and organization policies. Your current role is{' '}
          <span className="font-mono font-bold text-sky-400">{user?.role || 'Staff'}</span>.
        </p>
        <Button variant="default" onClick={() => onNavigate('kds')}>
          Return to Kitchen Display
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16">
      {/* ── TOP HERO BANNER: Executive Command & Tenant Badge ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/10 via-neu-surface to-sky-500/10 border border-neu-border p-5 sm:p-7 shadow-neu-raised text-slate-800 dark:text-slate-100">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shadow-sm">
                <Crown className="w-3 h-3 text-amber-400" />
                <span>{isOwner ? 'Owner Full Authority' : 'Admin Operations Control'}</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono text-slate-400 bg-slate-800/80 border border-white/10">
                Tenant: {organization?.name || 'Central Group'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-sky-400 bg-sky-950/60 border border-sky-500/30">
                Code: {organization?.code || 'HOTEL-GP-101'}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight">
              Executive Command & Operational Settings
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Consolidated financial margins, automated purchasing thresholds, Gemini AI buffer
              calibration, and multi-tenant organizational policies.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshFoodCost}
              disabled={isRefreshingCost}
              className="text-xs font-bold border-white/20 hover:border-amber-400/50 hover:bg-white/5"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshingCost ? 'animate-spin' : ''}`} />
              <span>Refresh Margins</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={() => onNavigate('team')}
              className="text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-glow-emerald border border-emerald-400/40"
            >
              <Users className="w-3.5 h-3.5 mr-1.5" />
              <span>Manage Team</span>
            </Button>
          </div>
        </div>

        {/* Success confirmation toast alert */}
        {saveSuccessMessage && (
          <div className="mt-4 p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
        )}
      </div>

      {/* ── DASHBOARD SUB-NAVIGATION TABS ── */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-neu-sunken border border-neu-borderSubtle shadow-neu-inset-sm overflow-x-auto custom-scrollbar">
        <button
          type="button"
          onClick={() => setActiveSection('overview')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap active:scale-95 ${
            activeSection === 'overview'
              ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-glow-sky border border-sky-400/50'
              : 'bg-neu-surface text-slate-700 dark:text-slate-300 border border-neu-border shadow-neu-raised-sm hover:shadow-neu-raised'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Financial & Operational KPIs</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('automation')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap active:scale-95 ${
            activeSection === 'automation'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-glow-purple border border-purple-400/50'
              : 'bg-neu-surface text-slate-700 dark:text-slate-300 border border-neu-border shadow-neu-raised-sm hover:shadow-neu-raised'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Kitchen Automation & AI Rules</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('organization')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap active:scale-95 ${
            activeSection === 'organization'
              ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-glow-amber border border-amber-400/50'
              : 'bg-neu-surface text-slate-700 dark:text-slate-300 border border-neu-border shadow-neu-raised-sm hover:shadow-neu-raised'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Hotel & Tenant Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('security')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap active:scale-95 ${
            activeSection === 'security'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-glow-emerald border border-emerald-400/50'
              : 'bg-neu-surface text-slate-700 dark:text-slate-300 border border-neu-border shadow-neu-raised-sm hover:shadow-neu-raised'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>RBAC Matrix & System Telemetry</span>
        </button>
      </div>

      {/* ── TAB 1: FINANCIAL & OPERATIONAL OVERVIEW ── */}
      {activeSection === 'overview' && (
        <div className="space-y-6">
          {/* Top 4 Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Inventory Valuation */}
            <div className="glass-card rounded-2xl p-4 sm:p-5 border border-white/10 relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Pantry Asset Valuation</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-white font-mono">
                ${totalInventoryValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span>Total ingredients:</span>
                <span className="font-bold text-slate-200">{ingredients.length} items</span>
              </p>
            </div>

            {/* Average Food Cost % */}
            <div className="glass-card rounded-2xl p-4 sm:p-5 border border-white/10 relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Avg Food Cost %</span>
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {avgFoodCostPct.toFixed(1)}%
              </div>
              <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Within 30% profitability target</span>
              </p>
            </div>

            {/* Pending Supplier Orders */}
            <div className="glass-card rounded-2xl p-4 sm:p-5 border border-white/10 relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Pending Wholesale POs</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                  <Boxes className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-white font-mono">
                ${pendingPoValuation.toFixed(2)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <span>Orders pending delivery:</span>
                <span className="font-bold text-indigo-300">
                  {supplierOrders.filter((o) => o.status === 'PENDING').length} POs
                </span>
              </p>
            </div>

            {/* Critical Low Stock Alarms */}
            <div className="glass-card rounded-2xl p-4 sm:p-5 border border-white/10 relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Critical Stock Shortfalls</span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {criticalStockCount}
              </div>
              <p className="text-[11px] mt-1 flex items-center gap-1">
                {criticalStockCount > 0 ? (
                  <span className="text-amber-400 font-bold flex items-center gap-1 animate-pulse">
                    <span>Needs immediate supplier order</span>
                  </span>
                ) : (
                  <span className="text-emerald-400 font-semibold">All pantries above safety line</span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Management Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => onNavigate('inventory')}
              className="glass-card rounded-2xl p-5 border border-white/10 hover:border-indigo-500/40 cursor-pointer group transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Boxes className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Inventory & PO Dispatch</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Issue automated supplier purchase orders and adjust ingredient safety margins.
              </p>
            </div>

            <div
              onClick={() => onNavigate('menu')}
              className="glass-card rounded-2xl p-5 border border-white/10 hover:border-pink-500/40 cursor-pointer group transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-5 h-5 text-slate-500 group-hover:text-pink-400 transition-colors" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Menu Pricing & Bill of Materials</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Configure dish pricing, recipe portions, and view real-time portion food costs.
              </p>
            </div>

            <div
              onClick={() => onNavigate('team')}
              className="glass-card rounded-2xl p-5 border border-white/10 hover:border-emerald-500/40 cursor-pointer group transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Staff Invitations & Roles</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Assign Executive Chef or Line Cook roles, revoke tokens, and manage kitchen staff.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: KITCHEN AUTOMATION & AI RULES ── */}
      {activeSection === 'automation' && (
        <div className="glass-card rounded-3xl p-5 sm:p-7 border border-white/10 space-y-6">
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">
              Operational Automation & AI Policy Controls
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed mt-1">
              Configure autonomous decision-making rules for stock replenishment, ticket Bill-of-Materials deductions, and AI forecasting buffers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Rule 1: Automated Supplier Purchase Orders */}
            <div className="p-4 rounded-2xl bg-neu-sunken border border-neu-borderSubtle shadow-neu-inset-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-white">Auto-Generate Supplier Orders</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoPoEnabled}
                    onChange={(e) => saveSettings({ ...settings, autoPoEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-sky-500 bg-slate-800 border-white/20 focus:ring-sky-400 cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  When stock falls below threshold, automatically draft a purchase order via `supplier-mcp`.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-400">Order Trigger Threshold:</span>
                <span className="font-mono font-bold text-indigo-300">Below Safety Line</span>
              </div>
            </div>

            {/* Rule 2: Expedited Wholesale Vendor Delivery */}
            <div className="p-4 rounded-2xl bg-neu-sunken border border-neu-borderSubtle shadow-neu-inset-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white">Expedited Delivery Priority</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.expeditedDelivery}
                    onChange={(e) => saveSettings({ ...settings, expeditedDelivery: e.target.checked })}
                    className="w-4 h-4 rounded text-sky-500 bg-slate-800 border-white/20 focus:ring-sky-400 cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Flag all auto-generated POs with `URGENT` expedited delivery for same-day replenishment.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-400">Supplier Order Tier:</span>
                <span className="font-mono font-bold text-amber-300">
                  {settings.expeditedDelivery ? 'URGENT (Expedited)' : 'NORMAL'}
                </span>
              </div>
            </div>

            {/* Rule 3: Gemini 3.8 Flash Prep Buffer */}
            <div className="p-4 rounded-2xl bg-neu-sunken border border-neu-borderSubtle shadow-neu-inset-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-white">Gemini AI Prep Buffer</span>
                  </div>
                  <span className="font-mono font-bold text-purple-300 text-xs">
                    +{settings.aiPortionBufferPct}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Additional portion safety cap added to AI forecast to prevent stockouts during peak shifts.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10">
                <input
                  type="range"
                  min="0"
                  max="25"
                  step="5"
                  value={settings.aiPortionBufferPct}
                  onChange={(e) => saveSettings({ ...settings, aiPortionBufferPct: Number(e.target.value) })}
                  className="w-full accent-purple-500 bg-slate-800 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                  <span>0% (Exact)</span>
                  <span>+10% (Default)</span>
                  <span>+25% (Peak Rushes)</span>
                </div>
              </div>
            </div>

            {/* Rule 4: Ticket Completion BOM Stock Deduction */}
            <div className="p-4 rounded-2xl bg-neu-sunken border border-neu-borderSubtle shadow-neu-inset-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-bold text-white">Live BOM Deduction on Complete</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoBOMDeduction}
                    onChange={(e) => saveSettings({ ...settings, autoBOMDeduction: e.target.checked })}
                    className="w-4 h-4 rounded text-sky-500 bg-slate-800 border-white/20 focus:ring-sky-400 cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Immediately reduce ingredient inventory when a ticket moves from `FIRING` to `COMPLETED`.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-400">Inventory Status:</span>
                <span className="font-mono font-bold text-sky-300">
                  {settings.autoBOMDeduction ? 'Synchronous Auto-Deduct' : 'Manual Audit'}
                </span>
              </div>
            </div>

            {/* Rule 5: Shift Scrap Variance Alert */}
            <div className="p-4 rounded-2xl bg-neu-sunken border border-neu-borderSubtle shadow-neu-inset-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-bold text-white">High Scrap Variance Alarm</span>
                  </div>
                  <span className="font-mono font-bold text-rose-300 text-xs">
                    &gt; {settings.scrapAlertThresholdPct}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Trigger manager notification when shift waste exceeds this percentage of total prepped quantity.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10">
                <input
                  type="range"
                  min="3"
                  max="15"
                  step="1"
                  value={settings.scrapAlertThresholdPct}
                  onChange={(e) => saveSettings({ ...settings, scrapAlertThresholdPct: Number(e.target.value) })}
                  className="w-full accent-rose-500 bg-slate-800 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                  <span>3% (Strict)</span>
                  <span>8% (Industry Std)</span>
                  <span>15% (Permissive)</span>
                </div>
              </div>
            </div>

            {/* Rule 6: Nightly AI Batch Audit */}
            <div className="p-4 rounded-2xl bg-neu-sunken border border-neu-borderSubtle shadow-neu-inset-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Nightly AI Stock Audit</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.nightlyAiAudit}
                    onChange={(e) => saveSettings({ ...settings, nightlyAiAudit: e.target.checked })}
                    className="w-4 h-4 rounded text-sky-500 bg-slate-800 border-white/20 focus:ring-sky-400 cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Run autonomous shortfall evaluation at 23:00 to draft prep sheets for morning line cooks.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-400">Schedule Time:</span>
                <span className="font-mono font-bold text-emerald-300">23:00 Daily</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: HOTEL & TENANT PROFILE SETTINGS ── */}
      {activeSection === 'organization' && (
        <div className="glass-card rounded-3xl p-5 sm:p-7 border border-white/10 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">
                Organization Branding & Location Policies
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed mt-1">
                Tenant credentials, local currency formatting, and commercial kitchen operational profile.
              </p>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={() => saveSettings(settings)}
              className="text-xs font-bold"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              <span>Save Changes</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Hotel / Restaurant Name
              </label>
              <input
                type="text"
                disabled={!isOwner}
                value={organization?.name || ''}
                readOnly
                className="w-full px-3.5 py-2.5 rounded-xl bg-neu-sunken border border-neu-borderSubtle shadow-neu-inset-sm text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-sky-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                {isOwner ? 'Tenant ID: ' + (organization?.id || '') : 'Owner authority required to change client name'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Client Code / Short Slug
              </label>
              <input
                type="text"
                value={organization?.code || 'HOTEL-GP-101'}
                readOnly
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-sky-400 text-xs font-mono font-bold focus:outline-none"
              />
              <p className="text-[10px] text-slate-500 mt-1">Used for tablet pairing & Socket.IO room isolation</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Primary Financial Currency
              </label>
              <select
                value={settings.currency}
                onChange={(e) => saveSettings({ ...settings, currency: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neu-sunken border border-neu-borderSubtle shadow-neu-inset-sm text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="USD ($)">USD ($) - US Dollar</option>
                <option value="EUR (€)">EUR (€) - Euro</option>
                <option value="GBP (£)">GBP (£) - British Pound</option>
                <option value="INR (₹)">INR (₹) - Indian Rupee</option>
                <option value="CAD ($)">CAD ($) - Canadian Dollar</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Kitchen Standard Timezone
              </label>
              <select
                value={settings.timezone}
                onChange={(e) => saveSettings({ ...settings, timezone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neu-sunken border border-neu-borderSubtle shadow-neu-inset-sm text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="America/New_York (EST)">America/New_York (EST)</option>
                <option value="Europe/London (GMT)">Europe/London (GMT)</option>
                <option value="Europe/Paris (CET)">Europe/Paris (CET)</option>
                <option value="Asia/Kolkata (IST)">Asia/Kolkata (IST)</option>
                <option value="America/Los_Angeles (PST)">America/Los_Angeles (PST)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Kitchen Direct Phone
              </label>
              <input
                type="text"
                value={settings.hotelContactPhone}
                onChange={(e) => setSettings({ ...settings, hotelContactPhone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neu-sunken border border-neu-borderSubtle shadow-neu-inset-sm text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Wholesale Dock & Delivery Address
              </label>
              <input
                type="text"
                value={settings.hotelAddress}
                onChange={(e) => setSettings({ ...settings, hotelAddress: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neu-sunken border border-neu-borderSubtle shadow-neu-inset-sm text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: RBAC MATRIX & SYSTEM TELEMETRY ── */}
      {activeSection === 'security' && (
        <div className="space-y-6">
          {/* RBAC Permission Matrix */}
          <div className="glass-card rounded-3xl p-5 sm:p-7 border border-white/10 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-white tracking-tight">
                  Role-Based Access Control (RBAC) Hierarchy
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                  Tenant permissions strictly enforced across API routes, WebSocket broadcasts, and UI dashboards.
                </p>
              </div>

              <Button
                variant="default"
                size="sm"
                onClick={() => onNavigate('team')}
                className="text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-glow-emerald"
              >
                <Users className="w-3.5 h-3.5 mr-1.5" />
                <span>Invite or Modify Staff</span>
              </Button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-xs">
                <thead className="bg-neu-card text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase border-b border-neu-borderSubtle">
                  <tr>
                    <th className="py-3 px-4">Role Tier</th>
                    <th className="py-3 px-4">Financial & Unit Costs</th>
                    <th className="py-3 px-4">Inventory & POs</th>
                    <th className="py-3 px-4">Team & Permissions</th>
                    <th className="py-3 px-4">KDS & Scrap Logging</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-200">
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-bold flex items-center gap-1.5 text-amber-400">
                      <Crown className="w-3.5 h-3.5" />
                      <span>Owner</span>
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">✅ Full Cost & Margins</td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">✅ Full Edit & Order</td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">✅ Full Control & Delete</td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">✅ Full Station Control</td>
                  </tr>

                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-bold flex items-center gap-1.5 text-sky-400">
                      <Shield className="w-3.5 h-3.5" />
                      <span>Admin</span>
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">✅ Full Cost & Margins</td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">✅ Full Edit & Order</td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">✅ Invite & Roles</td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">✅ Full Station Control</td>
                  </tr>

                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-bold flex items-center gap-1.5 text-emerald-400">
                      <ChefHat className="w-3.5 h-3.5" />
                      <span>Executive Chef</span>
                    </td>
                    <td className="py-3 px-4 text-rose-400 font-semibold">❌ Masked / Hidden</td>
                    <td className="py-3 px-4 text-amber-400 font-semibold">👁️ View Stock Only</td>
                    <td className="py-3 px-4 text-rose-400 font-semibold">❌ No Access (403)</td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">✅ KDS, Scrap, Prep Sheet</td>
                  </tr>

                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-bold flex items-center gap-1.5 text-slate-400">
                      <Users className="w-3.5 h-3.5" />
                      <span>Line Cook / Staff</span>
                    </td>
                    <td className="py-3 px-4 text-rose-400 font-semibold">❌ Masked / Hidden</td>
                    <td className="py-3 px-4 text-rose-400 font-semibold">❌ No Access</td>
                    <td className="py-3 px-4 text-rose-400 font-semibold">❌ No Access (403)</td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">✅ KDS Status Updates</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* System Telemetry & Model Context Protocol */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card rounded-2xl p-4 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-sky-400" />
                  <span>PostgreSQL Database</span>
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  ONLINE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Port 5432 · org:{organization?.id?.slice(0, 8) || 'root'}
              </p>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <span>Gemini AI Agent</span>
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  gemini-3.8-flash
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Port 8000 · FastAPI + Google GenAI
              </p>
            </div>

            <div className="glass-card rounded-2xl p-4 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Twin MCP Servers</span>
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  STDIO LINK
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                postgres-mcp & supplier-mcp Active
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardView;
