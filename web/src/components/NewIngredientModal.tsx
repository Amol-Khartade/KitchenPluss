import React, { useState } from 'react';
import { X, PackagePlus, DollarSign, Scale, ShieldAlert } from 'lucide-react';

interface NewIngredientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    unit: string;
    current_stock: number;
    minimum_threshold: number;
    cost_per_unit: number;
  }) => Promise<void>;
}

const COMMON_UNITS = [
  'kg',
  'g',
  'liters',
  'ml',
  'pcs',
  'oz',
  'lb',
  'bottle',
  'can',
  'pack',
];

export const NewIngredientModal: React.FC<NewIngredientModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('kg');
  const [currentStock, setCurrentStock] = useState('10');
  const [minThreshold, setMinThreshold] = useState('5');
  const [costPerUnit, setCostPerUnit] = useState('0.00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const stockNum = parseFloat(currentStock);
    const thresholdNum = parseFloat(minThreshold);
    const costNum = parseFloat(costPerUnit);

    if (!name.trim()) {
      setError('Please provide an ingredient name');
      return;
    }

    if (isNaN(stockNum) || stockNum < 0) {
      setError('Current stock must be a non-negative number');
      return;
    }

    if (isNaN(thresholdNum) || thresholdNum < 0) {
      setError('Safety threshold must be a non-negative number');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        unit: unit.trim(),
        current_stock: stockNum,
        minimum_threshold: thresholdNum,
        cost_per_unit: isNaN(costNum) ? 0 : Math.max(0, costNum),
      });
      setName('');
      setCurrentStock('10');
      setMinThreshold('5');
      setCostPerUnit('0.00');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create ingredient');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="bg-neu-surface w-full max-w-lg rounded-2xl border border-neu-border p-6 shadow-neu-raised-lg relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neu-borderSubtle">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-500 shadow-sm">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Add New Stock / Ingredient</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Track pantry items, units, costs, and safety lines</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Ingredient Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bourbon, Truffle Oil, Fresh Basil, Calamari"
              className="w-full px-3.5 py-2.5 rounded-xl bg-neu-sunken border border-neu-borderSubtle shadow-neu-inset-sm text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <Scale className="w-3.5 h-3.5 text-sky-500" />
                <span>Unit of Measure *</span>
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neu-sunken border border-neu-borderSubtle shadow-neu-inset-sm text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all cursor-pointer"
              >
                {COMMON_UNITS.map((u) => (
                  <option key={u} value={u} className="bg-neu-surface text-slate-900 dark:text-white">
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                <span>Cost Per Unit ($)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costPerUnit}
                onChange={(e) => setCostPerUnit(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neu-sunken border border-neu-borderSubtle shadow-neu-inset-sm text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Initial Stock Qty *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                required
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neu-sunken border border-neu-borderSubtle shadow-neu-inset-sm text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Min Safety Threshold *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                required
                value={minThreshold}
                onChange={(e) => setMinThreshold(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neu-sunken border border-neu-borderSubtle shadow-neu-inset-sm text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all font-mono"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-neu-borderSubtle">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-neu-surface hover:bg-neu-hover border border-neu-border text-slate-700 dark:text-slate-300 shadow-neu-raised-sm hover:shadow-neu-raised text-sm font-medium transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-sm font-semibold shadow-glow-sky flex items-center space-x-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Adding...</span>
              ) : (
                <>
                  <PackagePlus className="w-4 h-4" />
                  <span>Save Stock Item</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
