// ============================================================
// KitchenPulse Mobile — API Client
// ============================================================

import Constants from "expo-constants";
import { User, Organization, AuthResponse } from "../types";

// Determine backend URL from app config or environment
const extra = (Constants.expoConfig?.extra ?? {}) as { backendUrl?: string };
export const API_BASE_URL = extra.backendUrl ?? "http://localhost:5000";

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const authHeaders: Record<string, string> = authToken
    ? { Authorization: `Bearer ${authToken}` }
    : {};

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
    const message = parsed?.message || parsed?.error || `API Error ${response.status}: ${text}`;
    throw new Error(message);
  }

  const json = await response.json();
  if (json && typeof json === "object" && !("data" in json) && !("users" in json) && !("organizations" in json) && !("user" in json)) {
    return { data: json } as T;
  }
  return json as T;
}

export const api = {
  tickets: {
    list: (status?: string) =>
      apiFetch<import("../types").LiveTicket[]>(
        `/api/tickets${status ? `?status=${status}` : ""}`
      ),
    create: (body: { recipe_id: string; station?: string; table_number?: number; notes?: string }) =>
      apiFetch<import("../types").LiveTicket>("/api/tickets", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    updateStatus: (id: string, status: string) =>
      apiFetch<import("../types").LiveTicket>(
        `/api/tickets/${id}/status`,
        { method: "PATCH", body: JSON.stringify({ status }) }
      ),
  },

  recipes: {
    list: () =>
      apiFetch<import("../types").Recipe[]>("/api/recipes"),
  },

  ingredients: {
    list: () =>
      apiFetch<import("../types").Ingredient[]>("/api/ingredients"),
    updateStock: (id: string, stock: number) =>
      apiFetch<import("../types").Ingredient>(`/api/ingredients/${id}/stock`, {
        method: "PATCH",
        body: JSON.stringify({ current_stock: stock }),
      }),
  },

  prepLogs: {
    create: (body: {
      recipe_id: string;
      prepped_qty: number;
      waste_qty: number;
      notes?: string;
    }) =>
      apiFetch<import("../types").PrepLog>("/api/prep-logs", {
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
      apiFetch<import("../types").FoodCostSummary[]>("/api/food-cost"),
  },

  users: {
    list: () => apiFetch<{ users: User[] }>("/api/users"),
    create: (body: { email: string; name: string; role: string; password?: string }) =>
      apiFetch<{ user: User; temporaryPassword?: string }>("/api/users", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    updateRole: (id: string, role: string) =>
      apiFetch<{ user: User }>(`/api/users/${id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
  },

  auth: {
    getOrganizations: () =>
      apiFetch<{ organizations: Organization[] }>("/api/auth/organizations"),
    register: (body: {
      email: string;
      password: string;
      name?: string;
      role?: string;
      organization_id?: string;
      organization_name?: string;
    }) =>
      apiFetch<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    login: (body: { email: string; password: string }) =>
      apiFetch<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    me: () =>
      apiFetch<{ user: User; organization: Organization }>("/api/auth/me"),
  },
};
