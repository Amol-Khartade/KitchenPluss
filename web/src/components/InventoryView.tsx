import React, { useState } from 'react';
import { Ingredient, SupplierOrder } from '../types/index.js';
import {
  AlertTriangle,
  Package,
  ShoppingCart,
  Plus,
  Minus,
  Sparkles,
  CheckCircle2,
  Truck,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

interface InventoryViewProps {
  ingredients: Ingredient[];
  supplierOrders: SupplierOrder[];
  onUpdateStock: (id: string, newStock: number) => Promise<void>;
  onCreateOrder: (ingredientId: string, quantity: number) => Promise<void>;
  onReceiveOrder: (orderId: string) => Promise<void>;
  onRunAiAudit: () => Promise<void>;
  isAuditing?: boolean;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  ingredients,
  supplierOrders,
  onUpdateStock,
  onCreateOrder,
  onReceiveOrder,
  onRunAiAudit,
  isAuditing = false,
}) => {
  const [selectedIngredientForOrder, setSelectedIngredientForOrder] = useState<Ingredient | null>(null);
  const [orderQuantity, setOrderQuantity] = useState<number>(10);
  const [filterLowOnly, setFilterLowOnly] = useState<boolean>(false);

  const lowStockItems = ingredients.filter(
    (i) => Number(i.current_stock) <= Number(i.minimum_threshold)
  );

  const displayedIngredients = filterLowOnly ? lowStockItems : ingredients;

  const handleQuickAdjust = (ingredient: Ingredient, delta: number) => {
    const nextVal = Math.max(0, Number(ingredient.current_stock) + delta);
    onUpdateStock(ingredient.id, nextVal);
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredientForOrder || orderQuantity <= 0) return;
    await onCreateOrder(selectedIngredientForOrder.id, orderQuantity);
    setSelectedIngredientForOrder(null);
  };

  return (
    <div className="space-y-8">
      {/* Top Metric Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="glass-panel rounded-2xl p-5 flex items-center space-x-4 border border-white/10 shadow-glass transition-all hover:border-sky-500/30">
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Tracked Ingredients
            </p>
            <h3 className="text-2xl font-bold text-white font-mono">{ingredients.length}</h3>
          </div>
        </div>

        {/* Metric 2 */}
        <div
          onClick={() => setFilterLowOnly(!filterLowOnly)}
          className={`glass-panel rounded-2xl p-5 flex items-center space-x-4 cursor-pointer transition-all border ${
            lowStockItems.length > 0
              ? 'bg-rose-950/25 border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.15)] hover:border-rose-400/60'
              : 'border-white/10 hover:border-white/20'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                Low Stock Thresholds
              </p>
              {filterLowOnly && (
                <span className="text-[10px] bg-rose-900/60 text-rose-300 px-1.5 py-0.5 rounded border border-rose-800">
                  Filtering
                </span>
              )}
            </div>
            <h3 className="text-2xl font-bold text-rose-400 font-mono">
              {lowStockItems.length}
            </h3>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="glass-panel rounded-2xl p-5 flex items-center justify-between border border-white/10 shadow-glass transition-all hover:border-indigo-500/30">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                Supplier POs In-Flight
              </p>
              <h3 className="text-2xl font-bold text-white font-mono">
                {supplierOrders.filter((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length}
              </h3>
            </div>
          </div>

          <button
            onClick={onRunAiAudit}
            disabled={isAuditing}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 text-white text-xs font-semibold shadow-glow-purple border border-purple-400/30 transition-all disabled:opacity-50"
            title="Trigger AI Inventory & Supplier PO evaluation"
          >
            <Sparkles className="w-4 h-4 text-purple-200" />
            <span>{isAuditing ? 'Auditing...' : 'AI Audit'}</span>
          </button>
        </div>
      </div>

      {/* Main Inventory Panel */}
      <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-glass">
        <div className="p-4 sm:px-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/40">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Live Pantry & Walk-In Stock Levels
            </h3>
            <p className="text-xs text-slate-400">
              Stock automatically deducts whenever tickets are marked completed on the KDS
            </p>
          </div>
          {lowStockItems.length > 0 && (
            <button
              onClick={() => setFilterLowOnly(!filterLowOnly)}
              className="text-xs font-semibold text-rose-400 hover:text-rose-300 underline underline-offset-4 self-start sm:self-auto"
            >
              {filterLowOnly ? 'Show All Items' : `Filter to Low Stock (${lowStockItems.length})`}
            </button>
          )}
        </div>

        {/* Responsive Table for Tablet & Desktop (sm:block) */}
        <div className="hidden sm:block divide-y divide-white/5">
          {displayedIngredients.map((item) => {
            const stock = Number(item.current_stock);
            const threshold = Number(item.minimum_threshold);
            const isLow = stock <= threshold;
            const pct = threshold > 0 ? Math.min(100, Math.round((stock / (threshold * 2)) * 100)) : 100;

            return (
              <div
                key={item.id}
                className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-white/[0.03] transition-colors"
              >
                {/* Item Details */}
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white text-sm tracking-tight">{item.name}</span>
                    {isLow && (
                      <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-950/80 text-rose-300 border border-rose-500/40 animate-pulse">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Deficit</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1 font-mono">
                    <span>Unit: <strong className="text-slate-300">{item.unit}</strong></span>
                    <span>Min Safety: <strong className="text-slate-300">{threshold} {item.unit}</strong></span>
                  </div>

                  {/* Stock Bar */}
                  <div className="w-full max-w-xs mt-2 bg-slate-800/80 rounded-full h-1.5 overflow-hidden border border-white/5">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isLow ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : pct < 70 ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${Math.max(5, pct)}%` }}
                    />
                  </div>
                </div>

                {/* Stock Controls */}
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-[11px] uppercase text-slate-400 font-semibold">In Stock</div>
                    <div className={`text-xl font-bold font-mono tabular-numbers ${isLow ? 'text-rose-400 font-black' : 'text-white'}`}>
                      {stock.toFixed(1)} <span className="text-xs font-normal text-slate-400">{item.unit}</span>
                    </div>
                  </div>

                  {/* Increment/Decrement buttons */}
                  <div className="flex items-center space-x-1 bg-slate-900/80 p-1 rounded-xl border border-white/10">
                    <button
                      onClick={() => handleQuickAdjust(item, -1)}
                      className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      title="Deduct 1"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleQuickAdjust(item, 1)}
                      className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      title="Add 1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Reorder Button */}
                  <button
                    onClick={() => {
                      setSelectedIngredientForOrder(item);
                      setOrderQuantity(Math.max(10, threshold * 2));
                    }}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 text-xs font-semibold transition-all shadow-sm active:scale-95"
                  >
                    <ShoppingCart className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Order PO</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile Frosted Stock Cards (sm:hidden) */}
        <div className="sm:hidden p-3 space-y-3">
          {displayedIngredients.map((item) => {
            const stock = Number(item.current_stock);
            const threshold = Number(item.minimum_threshold);
            const isLow = stock <= threshold;
            const pct = threshold > 0 ? Math.min(100, Math.round((stock / (threshold * 2)) * 100)) : 100;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-all ${
                  isLow
                    ? 'bg-rose-950/20 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
                    : 'bg-slate-900/60 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-sm">{item.name}</span>
                  {isLow && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-950 text-rose-300 border border-rose-600/60 animate-pulse">
                      Deficit
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 mb-3 font-mono">
                  <span>Unit: <strong className="text-slate-300">{item.unit}</strong></span>
                  <span>Safety: <strong className="text-slate-300">{threshold} {item.unit}</strong></span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mb-3">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isLow ? 'bg-rose-500' : pct < 70 ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.max(5, pct)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <div className="font-mono">
                    <span className="text-[10px] uppercase text-slate-400 block">Stock</span>
                    <span className={`text-lg font-bold ${isLow ? 'text-rose-400' : 'text-white'}`}>
                      {stock.toFixed(1)} {item.unit}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Stepper buttons with touch targets */}
                    <div className="flex items-center space-x-1 bg-slate-950/80 p-1 rounded-xl border border-white/10">
                      <button
                        onClick={() => handleQuickAdjust(item, -1)}
                        className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-white active:bg-white/10 rounded-lg text-sm font-bold"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleQuickAdjust(item, 1)}
                        className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-white active:bg-white/10 rounded-lg text-sm font-bold"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedIngredientForOrder(item);
                        setOrderQuantity(Math.max(10, threshold * 2));
                      }}
                      className="min-h-[40px] px-3 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-semibold flex items-center space-x-1 active:scale-95"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Order</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>


      {/* Supplier Purchase Orders Section */}
      <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-glass">
        <div className="p-4 sm:px-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/40">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Supplier Replenishment Orders (MCP Supplier Network)
            </h3>
            <p className="text-xs text-slate-400">
              Orders placed manually or automatically drafted by the autonomous AI stock monitor
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 self-start sm:self-auto">
            {supplierOrders.length} Recorded POs
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-white/10">
              <tr>
                <th className="py-3 px-4">PO Ref</th>
                <th className="py-3 px-4">Ingredient</th>
                <th className="py-3 px-4">Qty Ordered</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">QA Inspection</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {supplierOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No supplier purchase orders recorded yet.
                  </td>
                </tr>
              ) : (
                supplierOrders.map((order) => {
                  const isDelivered = order.status === 'DELIVERED';
                  return (
                    <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                        #{order.id.slice(0, 8)}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {order.ingredient_name}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                        {order.quantity_ordered} {order.unit}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isDelivered
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                            : 'bg-amber-950/80 text-amber-300 border border-amber-500/40 animate-pulse'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="flex items-center space-x-1.5 text-slate-300">
                          <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                          <span>{order.quality_flag}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {!isDelivered ? (
                          <button
                            onClick={() => onReceiveOrder(order.id)}
                            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-xs shadow-glow-emerald transition-all active:scale-95"
                            title="Confirm delivery and add inventory to database"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Receive & Stock</span>
                          </button>
                        ) : (
                          <span className="text-emerald-400/80 text-[11px] font-semibold flex items-center justify-end space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Stock Added</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual PO Order Modal */}
      {selectedIngredientForOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
          <div className="glass-panel rounded-2xl w-full max-w-md shadow-2xl p-6 border border-white/15">
            <h3 className="text-base font-bold text-white mb-1">
              Draft Supplier Purchase Order
            </h3>
            <p className="text-xs text-slate-300 mb-4">
              Ordering: <strong className="text-sky-300 font-semibold">{selectedIngredientForOrder.name}</strong> ({selectedIngredientForOrder.unit})
            </p>

            <form onSubmit={handleOrderSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Quantity to Order ({selectedIngredientForOrder.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(parseFloat(e.target.value) || 1)}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedIngredientForOrder(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-950/60 active:scale-95 transition-all"
                >
                  Submit Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

