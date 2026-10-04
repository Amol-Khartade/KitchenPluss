import React, { useState } from 'react';
import { AiPrepSheetResponse, FoodCostSummary } from '../types/index.js';
import {
  Sparkles,
  RefreshCw,
  TrendingDown,
  DollarSign,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  Calendar,
} from 'lucide-react';

interface AiPrepViewProps {
  prepSheet: AiPrepSheetResponse | null;
  foodCostSummaries: FoodCostSummary[];
  onRunOptimization: (dayOfWeek: string) => Promise<void>;
  onRefreshFoodCost: () => Promise<void>;
  isLoadingPrep?: boolean;
  isRefreshingCost?: boolean;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const AiPrepView: React.FC<AiPrepViewProps> = ({
  prepSheet,
  foodCostSummaries,
  onRunOptimization,
  onRefreshFoodCost,
  isLoadingPrep = false,
  isRefreshingCost = false,
}) => {
  const tomorrowDay = new Date(Date.now() + 86400000).toLocaleDateString('en-US', { weekday: 'long' });
  const [selectedDay, setSelectedDay] = useState<string>(tomorrowDay);
  const [expandedReasoning, setExpandedReasoning] = useState<boolean>(true);

  // Financial rollups from foodCostSummaries
  const totalPrepSpend = foodCostSummaries.reduce((sum, item) => sum + Number(item.total_recipe_cost || 0), 0);
  const totalWasteLoss = foodCostSummaries.reduce((sum, item) => sum + Number(item.total_waste_cost || 0), 0);
  const overallWasteRatio = totalPrepSpend > 0 ? ((totalWasteLoss / totalPrepSpend) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-8">
      {/* Top Controls: Day selector + Run button */}
      <div className="bg-bg-surface border border-bg-border rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-purple-950/80 border border-purple-800 flex items-center justify-center text-purple-400">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Autonomous AI Prep Optimization Engine
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Mined from PostgreSQL Historical Prep Logs via Model Context Protocol & Gemini LLM
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Day Selector */}
          <div className="flex items-center space-x-1.5 bg-bg-primary px-3 py-1.5 rounded-xl border border-bg-border">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
            >
              {DAYS_OF_WEEK.map((d) => (
                <option key={d} value={d} className="bg-bg-card text-white">
                  Target: {d}
                </option>
              ))}
            </select>
          </div>

          {/* Trigger button */}
          <button
            onClick={() => onRunOptimization(selectedDay)}
            disabled={isLoadingPrep}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-purple-950/50 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isLoadingPrep ? 'Running Model...' : `Forecast for ${selectedDay}`}</span>
          </button>
        </div>
      </div>

      {/* AI Prep Sheet Recommendations */}
      <div className="bg-bg-surface rounded-2xl border border-bg-border overflow-hidden">
        <div className="p-4 sm:px-6 border-b border-bg-border flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base font-bold text-white tracking-tight">
                Recommended Prep List ({prepSheet ? prepSheet.day_of_week : selectedDay})
              </span>
              {prepSheet?.model_used && (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800">
                  {prepSheet.model_used}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Targeted batch prep quantities engineered to reduce end-of-shift scrap without 86-ing menu items
            </p>
          </div>

          {prepSheet?.summary_rationale && (
            <button
              onClick={() => setExpandedReasoning(!expandedReasoning)}
              className="flex items-center space-x-1 text-xs text-purple-400 hover:text-purple-300"
            >
              <span>{expandedReasoning ? 'Hide AI Rationale' : 'View AI Rationale'}</span>
              {expandedReasoning ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* AI Rationale Drawer */}
        {prepSheet?.summary_rationale && expandedReasoning && (
          <div className="bg-purple-950/20 border-b border-purple-900/30 p-4 sm:px-6 text-xs text-purple-200 font-mono leading-relaxed">
            <div className="font-bold text-purple-300 uppercase tracking-wider text-[11px] mb-1 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Executive Synthesis:</span>
            </div>
            <p className="whitespace-pre-line">{prepSheet.summary_rationale}</p>
          </div>
        )}

        {/* Recommendations Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-primary text-slate-400 uppercase tracking-wider font-semibold border-b border-bg-border">
              <tr>
                <th className="py-3 px-4">Menu Item / Recipe</th>
                <th className="py-3 px-4">Suggested Prep Qty</th>
                <th className="py-3 px-4">Avg Historical Waste</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">AI Driver / Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bg-border">
              {!prepSheet || !prepSheet.recommendations || prepSheet.recommendations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No active forecast generated yet. Click &quot;Forecast for {selectedDay}&quot; above to run the AI engine.
                  </td>
                </tr>
              ) : (
                prepSheet.recommendations.map((item, idx) => (
                  <tr key={idx} className="hover:bg-bg-card transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white text-sm">
                      {item.recipe_name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-base font-extrabold text-sky-400 bg-sky-950/60 px-2.5 py-1 rounded-lg border border-sky-800/60">
                        {item.suggested_prep_qty} portions
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-amber-300">
                      {(Number(item.historical_waste_percent) || 0).toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                        {Math.round((Number(item.confidence) || 0.9) * 100)}% Match
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 max-w-sm">
                      {item.reasoning}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial Food Cost Materialized View Section */}
      <div className="space-y-4">
        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-bg-surface border border-bg-border rounded-2xl p-5 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Total Prep Expenditure</p>
              <h3 className="text-2xl font-bold text-emerald-400 font-mono">${totalPrepSpend.toFixed(2)}</h3>
            </div>
          </div>

          <div className="bg-bg-surface border border-bg-border rounded-2xl p-5 flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-rose-950/80 border border-rose-800 flex items-center justify-center text-rose-400">
              <TrendingDown className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Total Scrap Waste Loss</p>
              <h3 className="text-2xl font-bold text-rose-400 font-mono">${totalWasteLoss.toFixed(2)}</h3>
            </div>
          </div>

          <div className="bg-bg-surface border border-bg-border rounded-2xl p-5 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-amber-950/80 border border-amber-800 flex items-center justify-center text-amber-400">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Waste Cost Ratio</p>
                <h3 className="text-2xl font-bold text-amber-400 font-mono">{overallWasteRatio}%</h3>
              </div>
            </div>

            <button
              onClick={onRefreshFoodCost}
              disabled={isRefreshingCost}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-bg-card hover:bg-bg-hover text-slate-200 border border-bg-border text-xs font-semibold transition-all disabled:opacity-50"
              title="Refresh PostgreSQL Materialized View (mv_food_cost_summary)"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingCost ? 'animate-spin' : ''}`} />
              <span>Refresh MV</span>
            </button>
          </div>
        </div>

        {/* Food Cost Materialized View Table */}
        <div className="bg-bg-surface rounded-2xl border border-bg-border overflow-hidden">
          <div className="p-4 border-b border-bg-border flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                PostgreSQL Materialized View: Hourly Food Cost Summary
              </h3>
              <p className="text-xs text-slate-400">
                Aggregated from prep logs, recipe bill of materials, and live completed ticket inventory deductions
              </p>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
              mv_food_cost_summary
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-bg-primary text-slate-400 uppercase tracking-wider font-semibold border-b border-bg-border">
                <tr>
                  <th className="py-3 px-4">Menu Item</th>
                  <th className="py-3 px-4">Menu Price</th>
                  <th className="py-3 px-4">Prepped Portions</th>
                  <th className="py-3 px-4">Wasted Portions</th>
                  <th className="py-3 px-4">Waste Rate</th>
                  <th className="py-3 px-4">Total Cost</th>
                  <th className="py-3 px-4">Waste Cost</th>
                  <th className="py-3 px-4">Waste Ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bg-border">
                {foodCostSummaries.map((f, i) => (
                  <tr key={i} className="hover:bg-bg-card transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">{f.recipe_name}</td>
                    <td className="py-3.5 px-4 font-mono">${(Number(f.menu_price) || 0).toFixed(2)}</td>
                    <td className="py-3.5 px-4 font-mono font-medium">{f.total_prepped}</td>
                    <td className="py-3.5 px-4 font-mono font-medium text-rose-400">{f.total_wasted}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                      {(Number(f.waste_rate_percent) || 0).toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                      ${(Number(f.total_recipe_cost) || 0).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-rose-400">
                      ${(Number(f.total_waste_cost) || 0).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold">
                      <span className={`px-2 py-0.5 rounded text-[11px] ${
                        Number(f.waste_cost_ratio_percent) > 20
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {(Number(f.waste_cost_ratio_percent) || 0).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
