// ============================================================
// KitchenPulse Mobile — Shared TypeScript Types
// ============================================================

export type TicketStatus = "QUEUE" | "FIRING" | "COMPLETED";

export interface LiveTicket {
  id: string;
  recipe_id: string;
  station: string;
  status: TicketStatus;
  created_at: string;
  completed_at: string | null;
  recipe_name?: string; // joined from API
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_threshold: number;
  cost_per_unit: number;
  is_low_stock?: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  station: string;
  sale_price: number;
  prep_time_minutes: number;
}

export interface PrepLog {
  id: string;
  recipe_id: string;
  prep_date: string;
  prepped_qty: number;
  waste_qty: number;
  day_of_week: string;
  notes: string | null;
}

export interface FoodCostSummary {
  recipe_id: string;
  recipe_name: string;
  sale_price: number;
  total_prepped: number;
  total_waste: number;
  estimated_cost_per_serving: number;
  food_cost_pct: number;
  waste_pct: number;
}

// AI Types
export interface PrepSuggestion {
  recipe_id: string;
  recipe_name: string;
  suggested_prep_qty: number;
  reasoning: string;
  historical_avg_prepped: number;
  historical_avg_waste: number;
  waste_pct: number;
}

export interface PrepOptimizationResult {
  day_of_week: string;
  generated_at: string;
  suggestions: PrepSuggestion[];
  ai_summary: string;
}

// End of Day Waste Form
export interface WasteFormEntry {
  recipe_id: string;
  recipe_name: string;
  prepped_qty: number;
  waste_qty: number;
  notes: string;
}

// API Response wrapper
export interface ApiResponse<T> {
  success?: boolean;
  data: T;
  error?: string;
}
