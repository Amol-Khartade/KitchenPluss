// ============================================================
// @kitchenpulse/shared — Domain Utilities & Calculation Formulas
// Single implementation for Food Cost, Scrap Percentages, and Clocks
// ============================================================

/**
 * Calculates food cost percentage: (cost / sale_price) * 100
 */
export function calculateFoodCostPercentage(cost: number, salePrice: number): number {
  if (!salePrice || salePrice <= 0) return 0;
  const pct = (cost / salePrice) * 100;
  return Number(pct.toFixed(2));
}

/**
 * Calculates scrap / waste rate percentage: (waste_qty / prepped_qty) * 100
 */
export function calculateWastePercentage(wasteQty: number, preppedQty: number): number {
  if (!preppedQty || preppedQty <= 0) return 0;
  const pct = (wasteQty / preppedQty) * 100;
  return Number(pct.toFixed(2));
}

/**
 * Formats a numerical amount to standard USD currency format
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return '$0.00';
  return `$${Number(amount).toFixed(2)}`;
}

/**
 * Calculates and formats elapsed kitchen wait time (T+ mm:ss)
 */
export function formatElapsedTime(createdAt: string | Date | number): string {
  const start = typeof createdAt === 'string' || typeof createdAt === 'number'
    ? new Date(createdAt).getTime()
    : createdAt.getTime();
  
  const elapsedSec = Math.max(0, Math.floor((Date.now() - start) / 1000));
  const mins = Math.floor(elapsedSec / 60);
  const secs = elapsedSec % 60;
  return `T+ ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Returns station color code for KDS badge displays
 */
export function getStationColor(station: string): { bg: string; text: string; border: string } {
  const norm = (station || '').toUpperCase();
  switch (norm) {
    case 'GRILL':
      return { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' };
    case 'SAUTÉ':
    case 'SAUTE':
      return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' };
    case 'PREP':
      return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' };
    case 'PIZZA':
    case 'OVEN':
      return { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' };
    case 'DISH':
      return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' };
    default:
      return { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' };
  }
}
