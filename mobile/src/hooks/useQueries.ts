// ============================================================
// KitchenPulse Mobile — TanStack Query Hooks
// ============================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import type { WasteFormEntry } from "../types";

// ── Query Keys ─────────────────────────────────────────────

export const QUERY_KEYS = {
  tickets: (status?: string) => ["tickets", status] as const,
  recipes: () => ["recipes"] as const,
  ingredients: () => ["ingredients"] as const,
  foodCost: () => ["food-cost"] as const,
  prepSheet: () => ["prep-sheet"] as const,
} as const;

// ── Ticket Queries ─────────────────────────────────────────

export function useTickets(status?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.tickets(status),
    queryFn: () => api.tickets.list(status),
    select: (res) => res.data,
    refetchInterval: 30_000, // Background poll every 30s as fallback
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.tickets.create,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.tickets.updateStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}

// ── Recipe Queries ─────────────────────────────────────────

export function useRecipes() {
  return useQuery({
    queryKey: QUERY_KEYS.recipes(),
    queryFn: api.recipes.list,
    select: (res) => res.data,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ── Ingredient Queries ─────────────────────────────────────

export function useIngredients() {
  return useQuery({
    queryKey: QUERY_KEYS.ingredients(),
    queryFn: api.ingredients.list,
    select: (res) => res.data,
    refetchInterval: 60_000,
  });
}

// ── Food Cost Queries ──────────────────────────────────────

export function useFoodCostSummary() {
  return useQuery({
    queryKey: QUERY_KEYS.foodCost(),
    queryFn: api.foodCost.list,
    select: (res) => res.data,
    refetchInterval: 5 * 60 * 1000,
  });
}

// ── AI Prep Sheet ──────────────────────────────────────────

export function usePrepOptimization() {
  return useQuery({
    queryKey: QUERY_KEYS.prepSheet(),
    queryFn: () => api.ai.runPrepOptimization(),
    select: (res) => res.data,
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
  });
}

// ── Waste Log Mutation ─────────────────────────────────────

export function useLogWaste() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entries: WasteFormEntry[]) => {
      // Submit all entries in parallel
      const results = await Promise.allSettled(
        entries.map((entry) =>
          api.prepLogs.create({
            recipe_id: entry.recipe_id,
            prepped_qty: entry.prepped_qty,
            waste_qty: entry.waste_qty,
            notes: entry.notes || undefined,
          })
        )
      );
      return results;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.foodCost() });
    },
  });
}
