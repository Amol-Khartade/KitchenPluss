import React, { useState } from 'react';
import { Recipe, PrepLog } from '../types/index.js';
import { ClipboardList, CheckCircle2, History, AlertCircle } from 'lucide-react';

interface WasteLogFormProps {
  recipes: Recipe[];
  prepLogs: PrepLog[];
  onSubmit: (data: {
    recipe_id: string;
    day_of_week: string;
    prepped_qty: number;
    waste_qty: number;
    notes?: string;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const WasteLogForm: React.FC<WasteLogFormProps> = ({
  recipes,
  prepLogs,
  onSubmit,
  isSubmitting = false,
}) => {
  const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const [recipeId, setRecipeId] = useState<string>(recipes[0]?.id || '');
  const [dayOfWeek, setDayOfWeek] = useState<string>(currentDay);
  const [preppedQty, setPreppedQty] = useState<number>(20);
  const [wasteQty, setWasteQty] = useState<number>(2);
  const [notes, setNotes] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipeId) return;

    await onSubmit({
      recipe_id: recipeId,
      day_of_week: dayOfWeek,
      prepped_qty: Number(preppedQty) || 0,
      waste_qty: Number(wasteQty) || 0,
      notes: notes.trim() || undefined,
    });

    setFeedback('Scrap waste log recorded successfully! PostgreSQL Materialized View updated.');
    setNotes('');
    setTimeout(() => setFeedback(null), 5000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Waste Submission Form */}
      <div className="lg:col-span-1 bg-bg-surface border border-bg-border rounded-2xl p-6 shadow-xl">
        <div className="flex items-center space-x-2.5 mb-2">
          <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-800 flex items-center justify-center text-amber-400">
            <ClipboardList className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-white tracking-tight">
            Log End-of-Day Scrap
          </h3>
        </div>
        <p className="text-xs text-slate-400 mb-6">
          Record batch prep yields and discarded leftovers to feed the AI demand model.
        </p>

        {feedback && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Menu Item / Recipe *
            </label>
            <select
              value={recipeId}
              onChange={(e) => setRecipeId(e.target.value)}
              required
              className="w-full bg-bg-card border border-bg-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            >
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.menu_item_name} ({r.station})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Day of Week
            </label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(e.target.value)}
              className="w-full bg-bg-card border border-bg-border rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
            >
              {DAYS_OF_WEEK.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Prepped Qty (Portions)
              </label>
              <input
                type="number"
                min="0"
                value={preppedQty}
                onChange={(e) => setPreppedQty(parseInt(e.target.value) || 0)}
                className="w-full bg-bg-card border border-bg-border rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-rose-300 mb-1.5">
                Waste / Scrap Qty
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={wasteQty}
                onChange={(e) => setWasteQty(parseFloat(e.target.value) || 0)}
                className="w-full bg-bg-card border border-rose-900/60 rounded-xl px-3.5 py-2 text-sm text-rose-300 font-mono focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Waste Rationale / Scrap Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. End of night buffer discard, burnt on sauté, trim loss"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-bg-card border border-bg-border rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !recipeId}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-950/50 transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'Recording Log...' : 'Submit Scrap Log'}
          </button>
        </form>
      </div>

      {/* Historical Prep & Waste Audit Trail */}
      <div className="lg:col-span-2 bg-bg-surface border border-bg-border rounded-2xl overflow-hidden flex flex-col">
        <div className="p-4 sm:px-6 border-b border-bg-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-sky-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Recent Kitchen Prep & Waste Logs (PostgreSQL `prep_logs`)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {prepLogs.length} Entries Recorded
          </span>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[500px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-primary text-slate-400 uppercase tracking-wider font-semibold border-b border-bg-border sticky top-0">
              <tr>
                <th className="py-3 px-4">Menu Item</th>
                <th className="py-3 px-4">Day</th>
                <th className="py-3 px-4">Prepped</th>
                <th className="py-3 px-4">Wasted</th>
                <th className="py-3 px-4">Waste %</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bg-border">
              {prepLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No prep logs found in the database.
                  </td>
                </tr>
              ) : (
                prepLogs.map((log) => {
                  const prepped = Number(log.prepped_qty || log.portions_prepped || 0);
                  const waste = Number(log.waste_qty || 0);
                  const wastePct = prepped > 0 ? ((waste / prepped) * 100).toFixed(1) : '0.0';

                  return (
                    <tr key={log.id} className="hover:bg-bg-card transition-colors">
                      <td className="py-3 px-4 font-bold text-white">
                        {log.recipe_name}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {log.day_of_week}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-200">
                        {prepped}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-rose-400">
                        {waste}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-300">
                        {wastePct}%
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                        {log.notes || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
