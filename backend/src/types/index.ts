// ============================================================
// KitchenPulse — Shared Type Definitions
// ============================================================

// ── Enums ──────────────────────────────────────────────────

export const TicketStatus = {
  QUEUE: "QUEUE",
  FIRING: "FIRING",
  COMPLETED: "COMPLETED",
} as const;

export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const OrderStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const QualityFlag = {
  PASS: "PASS",
  FAIL: "FAIL",
  PENDING_INSPECTION: "PENDING_INSPECTION",
} as const;

export type QualityFlag = (typeof QualityFlag)[keyof typeof QualityFlag];

// ── Multi-Tenant Organizations ─────────────────────────────

export interface Organization {
  id: string;
  name: string;
  slug: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  created_at?: Date | string;
  updated_at?: Date | string;
}

// ── Database Row Interfaces ────────────────────────────────

export interface Ingredient {
  id: string;
  organization_id?: string;
  name: string;
  unit: string;
  current_stock: number;
  min_threshold: number;
  cost_per_unit: number;
  updated_at: Date;
}

export interface Recipe {
  id: string;
  organization_id?: string;
  name: string;
  station: string;
  sale_price: number;
  prep_time_minutes: number;
}

export interface RecipeIngredient {
  recipe_id: string;
  ingredient_id: string;
  quantity_required: number;
}

export interface PrepLog {
  id: string;
  organization_id?: string;
  recipe_id: string;
  prep_date: string; // ISO date string (YYYY-MM-DD)
  prepped_qty: number;
  waste_qty: number;
  day_of_week: string;
  notes: string | null;
  created_at: Date;
}

export interface LiveTicket {
  id: string;
  organization_id?: string;
  recipe_id: string;
  station: string;
  status: TicketStatus;
  created_at: Date;
  completed_at: Date | null;
}

export interface SupplierOrder {
  id: string;
  organization_id?: string;
  ingredient_id: string;
  quantity_ordered: number;
  status: OrderStatus;
  quality_flag: QualityFlag;
  created_at: Date;
}

// ── Materialized View ──────────────────────────────────────

export interface FoodCostSummary {
  recipe_id: string;
  organization_id?: string;
  recipe_name: string;
  sale_price: number;
  total_prepped: number;
  total_waste: number;
  estimated_cost_per_serving: number;
  food_cost_pct: number;
  waste_pct: number;
}

// ── WebSocket Payloads ─────────────────────────────────────

export interface WsTicketCreated {
  event: "ticket:created";
  payload: LiveTicket;
}

export interface WsTicketUpdated {
  event: "ticket:updated";
  payload: Pick<LiveTicket, "id" | "status" | "completed_at">;
}

export interface WsStockAlert {
  event: "stock:alert";
  payload: {
    ingredient_id: string;
    ingredient_name: string;
    current_stock: number;
    min_threshold: number;
  };
}

export interface WsOrderUpdate {
  event: "order:updated";
  payload: Pick<SupplierOrder, "id" | "status" | "quality_flag">;
}

export type WsEvent =
  | WsTicketCreated
  | WsTicketUpdated
  | WsStockAlert
  | WsOrderUpdate;

// ── API Request / Response Helpers ─────────────────────────

export type CreateIngredient = Omit<Ingredient, "id" | "updated_at">;
export type UpdateIngredient = Partial<CreateIngredient>;

export type CreateRecipe = Omit<Recipe, "id">;
export type UpdateRecipe = Partial<CreateRecipe>;

export type CreatePrepLog = Omit<PrepLog, "id" | "created_at" | "day_of_week">;
export type CreateTicket = Pick<LiveTicket, "recipe_id" | "station">;
export type CreateSupplierOrder = Pick<SupplierOrder, "ingredient_id" | "quantity_ordered">;

// ── User & Authentication ──────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  auth_provider: 'email' | 'google';
  google_id: string | null;
  role: string;
  organization_id: string;
  organization_name?: string;
  created_at: Date;
  updated_at: Date;
}

export type SafeUser = {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  auth_provider: 'email' | 'google';
  role: string;
  organization_id: string;
  organization_name?: string;
  created_at?: Date | string;
};

export interface AuthResponse {
  user: SafeUser;
  organization: Organization;
  token: string;
}
