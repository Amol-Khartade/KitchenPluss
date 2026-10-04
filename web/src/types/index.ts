export type TicketStatus = 'QUEUE' | 'FIRING' | 'COMPLETED' | 'CANCELLED';

export interface Ticket {
  id: string;
  recipe_id: string;
  recipe_name: string;
  station: string;
  status: TicketStatus;
  table_number: number;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  minimum_threshold: number;
  created_at?: string;
  updated_at?: string;
}

export interface RecipeIngredient {
  ingredient_id: string;
  ingredient_name?: string;
  unit?: string;
  quantity_required: number;
}

export interface Recipe {
  id: string;
  menu_item_name: string;
  price: number;
  station: string;
  ingredients?: RecipeIngredient[];
}

export interface PrepLog {
  id: string;
  recipe_id: string;
  recipe_name: string;
  prep_date: string;
  day_of_week: string;
  prepped_qty: number;
  portions_prepped?: number;
  waste_qty: number;
  notes: string | null;
  created_at: string;
}

export interface FoodCostSummary {
  recipe_id: string;
  recipe_name: string;
  menu_price: number;
  total_prepped: number;
  total_wasted: number;
  waste_rate_percent: number;
  total_recipe_cost: number;
  total_waste_cost: number;
  waste_cost_ratio_percent: number;
}

export interface SupplierOrder {
  id: string;
  ingredient_id: string;
  ingredient_name: string;
  unit: string;
  quantity_ordered: number;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  quality_flag: 'PASS' | 'FAIL' | 'PENDING_INSPECTION';
  created_at: string;
}

export interface StationWorkload {
  station: string;
  queue_count: number;
  firing_count: number;
  total_active: number;
  workload_percentage: number;
}

export interface AiPrepItem {
  recipe_id: string;
  recipe_name: string;
  suggested_prep_qty: number;
  historical_waste_percent: number;
  confidence: number;
  reasoning: string;
}

export interface AiPrepSheetResponse {
  day_of_week: string;
  generated_at: string;
  recommendations: AiPrepItem[];
  model_used: string;
  summary_rationale: string;
}
