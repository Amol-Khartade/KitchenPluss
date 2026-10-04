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
    select: (res: any) => (Array.isArray(res) ? res : res?.data ?? []),
    refetchInterval: 15_000,
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
    select: (res: any) => (Array.isArray(res) ? res : res?.data ?? []),
    staleTime: 5 * 60 * 1000,
  });
}

// ── Ingredient Queries ─────────────────────────────────────

export function useIngredients() {
  return useQuery({
    queryKey: QUERY_KEYS.ingredients(),
    queryFn: api.ingredients.list,
    select: (res: any) => (Array.isArray(res) ? res : res?.data ?? []),
    refetchInterval: 30_000,
  });
}

// ── Food Cost Queries ──────────────────────────────────────

export function useFoodCostSummary() {
  return useQuery({
    queryKey: QUERY_KEYS.foodCost(),
    queryFn: api.foodCost.list,
    select: (res: any) => (Array.isArray(res) ? res : res?.data ?? []),
    refetchInterval: 5 * 60 * 1000,
  });
}

// ── AI Prep Sheet ──────────────────────────────────────────

export function usePrepOptimization() {
  return useQuery({
    queryKey: QUERY_KEYS.prepSheet(),
    queryFn: () => api.ai.runPrepOptimization(),
    select: (res: any) => res?.data ?? res,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
}

// ── Waste Log Mutation ─────────────────────────────────────

export function useLogWaste() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entries: WasteFormEntry[]) => {
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
