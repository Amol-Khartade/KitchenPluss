// ============================================================
// KitchenPulse Mobile — Prep Sheet Screen
// Displays AI-generated prep optimization results
// ============================================================

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useKitchenStore } from "../store/useKitchenStore";
import { usePrepOptimization } from "../hooks/useQueries";
import type { PrepSuggestion } from "../types";

export default function PrepSheetScreen() {
  const { prepSheet: wsSheet } = useKitchenStore();
  const {
    data: fetchedSheet,
    isLoading,
    refetch,
    isRefetching,
  } = usePrepOptimization();

  // WebSocket broadcast takes priority over fetched
  const sheet = wsSheet ?? fetchedSheet;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Generating prep sheet...</Text>
        <Text style={styles.loadingSubtext}>AI is analyzing historical data...</Text>
      </View>
    );
  }

  if (!sheet) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>🤖</Text>
        <Text style={styles.emptyTitle}>No Prep Sheet Yet</Text>
        <Text style={styles.emptyText}>
          The AI prep optimization hasn't run yet.{"\n"}Trigger it from the
          backend or wait for the nightly run.
        </Text>
        <Pressable
          style={styles.refreshBtn}
          onPress={() => void refetch()}
          disabled={isRefetching}
        >
          <Text style={styles.refreshBtnText}>
            {isRefetching ? "Fetching..." : "Try Again"}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor="#8B5CF6"
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🤖 AI Prep Sheet</Text>
        <View style={styles.dayBadge}>
          <Text style={styles.dayText}>{sheet.day_of_week}</Text>
        </View>
      </View>

      <Text style={styles.generatedAt}>
        Generated: {new Date(sheet.generated_at).toLocaleString()}
      </Text>

      {/* AI Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>📝 Manager Summary</Text>
        <Text style={styles.summaryText}>{sheet.ai_summary}</Text>
      </View>

      {/* Suggestions */}
      <Text style={styles.sectionTitle}>Recipe Prep Targets</Text>

      {sheet.suggestions.map((suggestion: PrepSuggestion, idx: number) => {
        const isHighWaste = suggestion.waste_pct > 20;
        return (
          <View
            key={suggestion.recipe_id}
            style={[
              styles.suggestionCard,
              isHighWaste ? styles.highWasteCard : null,
            ]}
          >
            <View style={styles.suggestionHeader}>
              <Text style={styles.suggestionName}>
                {idx + 1}. {suggestion.recipe_name}
              </Text>
              {isHighWaste && (
                <View style={styles.warnBadge}>
                  <Text style={styles.warnBadgeText}>⚠️ HIGH WASTE</Text>
                </View>
              )}
            </View>

            {/* Target quantity */}
            <View style={styles.qtyRow}>
              <View style={styles.qtyBox}>
                <Text style={styles.qtyLabel}>AI Target</Text>
                <Text style={styles.qtyValue}>{suggestion.suggested_prep_qty}</Text>
                <Text style={styles.qtyUnit}>portions</Text>
              </View>
              <View style={styles.qtyBox}>
                <Text style={styles.qtyLabel}>Avg Prepped</Text>
                <Text style={styles.qtyValue}>
                  {suggestion.historical_avg_prepped.toFixed(1)}
                </Text>
                <Text style={styles.qtyUnit}>historical</Text>
              </View>
              <View style={styles.qtyBox}>
                <Text style={[styles.qtyLabel, { color: isHighWaste ? "#EF4444" : "#94A3B8" }]}>
                  Waste %
                </Text>
                <Text
                  style={[
                    styles.qtyValue,
                    { color: isHighWaste ? "#EF4444" : "#10B981" },
                  ]}
                >
                  {suggestion.waste_pct.toFixed(1)}%
                </Text>
                <Text style={styles.qtyUnit}>avg</Text>
              </View>
            </View>

            {/* Reasoning */}
            <Text style={styles.reasoning}>{suggestion.reasoning}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F172A",
    paddingHorizontal: 32,
    gap: 12,
  },
  loadingText: {
    color: "#F1F5F9",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
  },
  loadingSubtext: {
    color: "#94A3B8",
    fontSize: 13,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyTitle: {
    color: "#F1F5F9",
    fontSize: 18,
    fontWeight: "700",
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  refreshBtn: {
    marginTop: 16,
    backgroundColor: "#8B5CF6",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  refreshBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  title: {
    color: "#F1F5F9",
    fontSize: 22,
    fontWeight: "700",
  },
  dayBadge: {
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  dayText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  generatedAt: {
    color: "#475569",
    fontSize: 12,
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#8B5CF6",
  },
  summaryTitle: {
    color: "#C4B5FD",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  summaryText: {
    color: "#E2E8F0",
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  suggestionCard: {
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  highWasteCard: {
    borderColor: "#EF4444",
    borderWidth: 1.5,
  },
  suggestionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  suggestionName: {
    color: "#F1F5F9",
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  warnBadge: {
    backgroundColor: "#7F1D1D",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  warnBadgeText: {
    color: "#FCA5A5",
    fontSize: 10,
    fontWeight: "700",
  },
  qtyRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  qtyBox: {
    flex: 1,
    backgroundColor: "#0F172A",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  qtyLabel: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  qtyValue: {
    color: "#F1F5F9",
    fontSize: 22,
    fontWeight: "700",
  },
  qtyUnit: {
    color: "#475569",
    fontSize: 10,
    marginTop: 2,
  },
  reasoning: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 17,
    fontStyle: "italic",
  },
});
