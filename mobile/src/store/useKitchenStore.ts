// ============================================================
// KitchenPulse Mobile — Global Store (Zustand)
// ============================================================

import { create } from "zustand";
import type { LiveTicket, Ingredient, PrepOptimizationResult } from "../types";

interface KitchenStore {
  // Live Tickets
  tickets: LiveTicket[];
  setTickets: (tickets: LiveTicket[]) => void;
  addTicket: (ticket: LiveTicket) => void;
  updateTicket: (id: string, changes: Partial<LiveTicket>) => void;

  // Ingredients / Stock
  ingredients: Ingredient[];
  setIngredients: (ingredients: Ingredient[]) => void;

  // Prep Sheet (AI Output)
  prepSheet: PrepOptimizationResult | null;
  setPrepSheet: (sheet: PrepOptimizationResult | null) => void;

  // Socket connection state
  isConnected: boolean;
  setConnected: (connected: boolean) => void;

  // Alerts
  stockAlerts: StockAlert[];
  addStockAlert: (alert: StockAlert) => void;
  clearAlerts: () => void;
}

export interface StockAlert {
  id: string;
  ingredient_name: string;
  current_stock: number;
  min_threshold: number;
  timestamp: string;
}

export const useKitchenStore = create<KitchenStore>((set) => ({
  tickets: [],
  setTickets: (tickets) => set({ tickets }),
  addTicket: (ticket) =>
    set((state) => ({ tickets: [ticket, ...state.tickets] })),
  updateTicket: (id, changes) =>
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === id ? { ...t, ...changes } : t
      ),
    })),

  ingredients: [],
  setIngredients: (ingredients) => set({ ingredients }),

  prepSheet: null,
  setPrepSheet: (prepSheet) => set({ prepSheet }),

  isConnected: false,
  setConnected: (isConnected) => set({ isConnected }),

  stockAlerts: [],
  addStockAlert: (alert) =>
    set((state) => ({ stockAlerts: [alert, ...state.stockAlerts].slice(0, 20) })),
  clearAlerts: () => set({ stockAlerts: [] }),
}));
