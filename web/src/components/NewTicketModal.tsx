import React, { useState } from 'react';
import { Recipe } from '../types/index.js';
import { X, Flame, ChefHat, Hash, FileText } from 'lucide-react';

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipes: Recipe[];
  onSubmit: (data: { recipe_id: string; station?: string; table_number?: number; notes?: string }) => Promise<void>;
}

export const NewTicketModal: React.FC<NewTicketModalProps> = ({
  isOpen,
  onClose,
  recipes,
  onSubmit,
}) => {
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(recipes[0]?.id || '');
  const [tableNumber, setTableNumber] = useState<number>(1);
  const [station, setStation] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Set default station when recipe changes
  const handleRecipeChange = (recipeId: string) => {
    setSelectedRecipeId(recipeId);
    const rec = recipes.find((r) => r.id === recipeId);
    if (rec) {
      setStation(rec.station || 'Main Kitchen');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipeId) return;

    try {
      setIsSubmitting(true);
      await onSubmit({
        recipe_id: selectedRecipeId,
        station: station.trim() || undefined,
        table_number: Number(tableNumber) || 1,
        notes: notes.trim() || undefined,
      });
      onClose();
      setNotes('');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-bg-surface border border-bg-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-bg-border bg-bg-card">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-sky-950 border border-sky-800 flex items-center justify-center text-sky-400">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Create Kitchen Ticket</h3>
              <p className="text-xs text-slate-400">Fire new order directly to station KDS queue</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-bg-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Recipe Select */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Menu Item / Recipe *
            </label>
            <select
              value={selectedRecipeId}
              onChange={(e) => handleRecipeChange(e.target.value)}
              required
              className="w-full bg-bg-card border border-bg-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.menu_item_name} — ${(Number(r.price) || 0).toFixed(2)} ({r.station})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Table Number */}
            <div>
              <label className="flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                <span>Table Number</span>
              </label>
              <input
                type="number"
                min="1"
                max="99"
                value={tableNumber}
                onChange={(e) => setTableNumber(parseInt(e.target.value) || 1)}
                className="w-full bg-bg-card border border-bg-border rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>

            {/* Station */}
            <div>
              <label className="flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                <ChefHat className="w-3.5 h-3.5 text-slate-400" />
                <span>Destination Station</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Grill Station"
                value={station}
                onChange={(e) => setStation(e.target.value)}
                className="w-full bg-bg-card border border-bg-border rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="flex items-center space-x-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Special Instructions / Modifiers</span>
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Medium-Rare, Allergy: gluten, Sauce on the side"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-bg-card border border-bg-border rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-bg-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-bg-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedRecipeId}
              className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-sky-900/50 transition-all disabled:opacity-50"
            >
              <Flame className="w-4 h-4" />
              <span>{isSubmitting ? 'Firing Ticket...' : 'Fire to KDS'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
