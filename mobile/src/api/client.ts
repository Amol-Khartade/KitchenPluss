// ============================================================
// KitchenPulse Mobile — API Client
// ============================================================

import Constants from "expo-constants";

// Determine backend URL from app config or environment
const extra = (Constants.expoConfig?.extra ?? {}) as { backendUrl?: string };
export const API_BASE_URL = extra.backendUrl ?? "http://localhost:5000";

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API Error ${response.status}: ${text}`);
  }

  const json = await response.json();
  if (json && typeof json === "object" && !("data" in json)) {
    return { data: json } as T;
  }
  return json as T;
}

export const api = {
  tickets: {
    list: (status?: string) =>
      apiFetch<{ data: import("../types").LiveTicket[] }>(
        `/api/tickets${status ? `?status=${status}` : ""}`
      ),
    create: (body: { recipe_id: string; station: string }) =>
      apiFetch<{ data: import("../types").LiveTicket }>("/api/tickets", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    updateStatus: (id: string, status: string) =>
      apiFetch<{ data: import("../types").LiveTicket }>(
        `/api/tickets/${id}/status`,
        { method: "PATCH", body: JSON.stringify({ status }) }
      ),
  },

  recipes: {
    list: () =>
      apiFetch<{ data: import("../types").Recipe[] }>("/api/recipes"),
  },

  ingredients: {
    list: () =>
      apiFetch<{ data: import("../types").Ingredient[] }>("/api/ingredients"),
  },

  prepLogs: {
    create: (body: {
      recipe_id: string;
      prepped_qty: number;
      waste_qty: number;
      notes?: string;
    }) =>
      apiFetch<{ data: import("../types").PrepLog }>("/api/prep-logs", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },

  ai: {
    runPrepOptimization: (dayOfWeek?: string) =>
      apiFetch<{ success: boolean; data: import("../types").PrepOptimizationResult }>(
        "/api/ai/prep-optimization",
        {
          method: "POST",
          body: JSON.stringify({ day_of_week: dayOfWeek }),
        }
      ),
    runInventoryAlert: () =>
      apiFetch<{ success: boolean; data: unknown }>("/api/ai/inventory-alert", {
        method: "POST",
        body: JSON.stringify({}),
      }),
  },

  foodCost: {
    list: () =>
      apiFetch<{ data: import("../types").FoodCostSummary[] }>("/api/food-cost"),
  },
};
