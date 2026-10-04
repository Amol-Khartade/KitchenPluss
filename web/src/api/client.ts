import {
  Ticket,
  TicketStatus,
  Ingredient,
  Recipe,
  PrepLog,
  FoodCostSummary,
  SupplierOrder,
  AiPrepSheetResponse,
} from '../types/index.js';

const API_BASE = '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || errorBody.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// Tickets API
export const ticketsApi = {
  getAll: (status?: string) =>
    request<Ticket[]>(status ? `/tickets?status=${encodeURIComponent(status)}` : '/tickets'),
  create: (data: { recipe_id: string; station?: string; table_number?: number; notes?: string }) =>
    request<Ticket>('/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateStatus: (id: string, status: TicketStatus) =>
    request<Ticket>(`/tickets/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

// Ingredients API
export const ingredientsApi = {
  getAll: () => request<Ingredient[]>('/ingredients'),
  updateStock: (id: string, current_stock: number) =>
    request<Ingredient>(`/ingredients/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ current_stock }),
    }),
};

// Recipes API
export const recipesApi = {
  getAll: () => request<Recipe[]>('/recipes'),
};

// Prep Logs API
export const prepLogsApi = {
  getAll: (dayOfWeek?: string) =>
    request<PrepLog[]>(dayOfWeek ? `/prep-logs?day_of_week=${encodeURIComponent(dayOfWeek)}` : '/prep-logs'),
  create: (data: { recipe_id: string; day_of_week: string; prepped_qty: number; waste_qty: number; notes?: string }) =>
    request<PrepLog>('/prep-logs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Food Cost API
export const foodCostApi = {
  getSummary: () => request<FoodCostSummary[]>('/food-cost'),
  refresh: () => request<{ message: string; refreshed_at: string }>('/food-cost/refresh', { method: 'POST' }),
};

// Supplier Orders API
export const supplierOrdersApi = {
  getAll: (status?: string) =>
    request<SupplierOrder[]>(status ? `/supplier-orders?status=${encodeURIComponent(status)}` : '/supplier-orders'),
  create: (data: { ingredient_id: string; quantity_ordered: number }) =>
    request<SupplierOrder>('/supplier-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateStatus: (id: string, status: string, quality_flag?: string) =>
    request<SupplierOrder>(`/supplier-orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, quality_flag }),
    }),
};

// AI Workflows API
export const aiApi = {
  runPrepOptimization: (day_of_week?: string) =>
    request<{ success: boolean; data: AiPrepSheetResponse }>('/ai/prep-optimization', {
      method: 'POST',
      body: JSON.stringify({ day_of_week }),
    }),
  runInventoryAlert: () =>
    request<{ success: boolean; data: any }>('/ai/inventory-alert', {
      method: 'POST',
    }),
};
