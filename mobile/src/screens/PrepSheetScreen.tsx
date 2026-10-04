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
    backgroundColor: "#070B14",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#070B14",
    paddingHorizontal: 28,
    gap: 12,
  },
  loadingText: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 8,
  },
  loadingSubtext: {
    color: "#94A3B8",
    fontSize: 12,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 6,
  },
  emptyTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "800",
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  refreshBtn: {
    marginTop: 14,
    backgroundColor: "#7C3AED",
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 11,
    shadowColor: "#8B5CF6",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  refreshBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  dayBadge: {
    backgroundColor: "rgba(139, 92, 246, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.4)",
  },
  dayText: {
    color: "#C4B5FD",
    fontSize: 11,
    fontWeight: "800",
  },
  generatedAt: {
    color: "#64748B",
    fontSize: 11,
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: "rgba(139, 92, 246, 0.08)",
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
  },
  summaryTitle: {
    color: "#C4B5FD",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  summaryText: {
    color: "#E2E8F0",
    fontSize: 13,
    lineHeight: 19,
  },
  sectionTitle: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  suggestionCard: {
    backgroundColor: "rgba(18, 26, 44, 0.72)",
    borderRadius: 18,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  highWasteCard: {
    borderColor: "rgba(239, 68, 68, 0.6)",
    backgroundColor: "rgba(239, 68, 68, 0.06)",
  },
  suggestionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  suggestionName: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "800",
    flex: 1,
  },
  warnBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
  },
  warnBadgeText: {
    color: "#FCA5A5",
    fontSize: 9,
    fontWeight: "800",
  },
  qtyRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  qtyBox: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  qtyLabel: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  qtyValue: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "900",
  },
  qtyUnit: {
    color: "#64748B",
    fontSize: 9,
    marginTop: 2,
    fontWeight: "600",
  },
  reasoning: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 17,
    fontStyle: "italic",
  },
});
