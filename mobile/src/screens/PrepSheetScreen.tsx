// ============================================================
// KitchenPulse Mobile — Prep Sheet Screen
// Displays AI-generated prep optimization results
// Tactile Neumorphic styling with Light / Dark theme support
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
import { useTheme } from "../store/useThemeStore";
import type { PrepSuggestion } from "../types";

export default function PrepSheetScreen() {
  const { prepSheet: wsSheet } = useKitchenStore();
  const { colors } = useTheme();
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
      <View style={[styles.centered, { backgroundColor: colors.base }]}>
        <ActivityIndicator size="large" color={colors.accentPurple} />
        <Text style={[styles.loadingText, { color: colors.textPrimary }]}>Generating prep sheet...</Text>
        <Text style={[styles.loadingSubtext, { color: colors.textMuted }]}>AI is analyzing kitchen inventory & tickets...</Text>
      </View>
    );
  }

  if (!sheet) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.base }]}>
        <Text style={styles.emptyIcon}>🤖</Text>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Prep Sheet Yet</Text>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          The AI prep optimization hasn't run yet.{"\n"}Trigger it from the
          dashboard or wait for the shift cycle.
        </Text>
        <Pressable
          style={[
            styles.refreshBtn,
            {
              backgroundColor: colors.accentPurple,
              borderColor: "rgba(255, 255, 255, 0.25)",
            },
            colors.shadowRaisedSm,
          ]}
          onPress={() => void refetch()}
          disabled={isRefetching}
        >
          <Text style={styles.refreshBtnText}>
            {isRefetching ? "Fetching..." : "Generate AI Prep"}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.base }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={colors.accentPurple}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>🤖 AI Prep Targets</Text>
        <View
          style={[
            styles.dayBadge,
            {
              backgroundColor: colors.accentPurpleBg,
              borderColor: `${colors.accentPurple}60`,
            },
            colors.shadowRaisedSm,
          ]}
        >
          <Text style={[styles.dayText, { color: colors.accentPurple }]}>{sheet.day_of_week}</Text>
        </View>
      </View>

      <Text style={[styles.generatedAt, { color: colors.textMuted }]}>
        Shift Run: {new Date(sheet.generated_at).toLocaleString()}
      </Text>

      {/* AI Summary Card */}
      <View
        style={[
          styles.summaryCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
          colors.shadowRaised,
        ]}
      >
        <View style={styles.summaryHeaderRow}>
          <Text style={[styles.summaryTitle, { color: colors.accentPurple }]}>📝 Executive Chef Insight</Text>
          <View style={[styles.summaryBadge, { backgroundColor: colors.accentPurpleBg }]}>
            <Text style={[styles.summaryBadgeText, { color: colors.accentPurple }]}>Gemini 3.8 Flash</Text>
          </View>
        </View>
        <View style={[styles.summaryInsetBox, { backgroundColor: colors.sunken, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.summaryText, { color: colors.textSecondary }]}>{sheet.ai_summary}</Text>
        </View>
      </View>

      {/* Suggestions Section Header */}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Station BOM Prep Recommendations</Text>

      {sheet.suggestions.map((suggestion: PrepSuggestion, idx: number) => {
        const isHighWaste = suggestion.waste_pct > 20;
        return (
          <View
            key={suggestion.recipe_id}
            style={[
              styles.suggestionCard,
              {
                backgroundColor: colors.card,
                borderColor: isHighWaste ? colors.accentRose : colors.border,
              },
              colors.shadowRaised,
            ]}
          >
            <View style={styles.suggestionHeader}>
              <Text style={[styles.suggestionName, { color: colors.textPrimary }]}>
                {idx + 1}. {suggestion.recipe_name}
              </Text>
              {isHighWaste && (
                <View style={[styles.warnBadge, { backgroundColor: colors.accentRoseBg, borderColor: colors.accentRose }]}>
                  <Text style={[styles.warnBadgeText, { color: colors.accentRose }]}>⚠️ HIGH WASTE</Text>
                </View>
              )}
            </View>

            {/* Target quantity metrics */}
            <View style={styles.qtyRow}>
              <View style={[styles.qtyBox, { backgroundColor: colors.sunken, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.qtyLabel, { color: colors.textMuted }]}>AI Target</Text>
                <Text style={[styles.qtyValue, { color: colors.accentSky }]}>{suggestion.suggested_prep_qty}</Text>
                <Text style={[styles.qtyUnit, { color: colors.textMuted }]}>portions</Text>
              </View>

              <View style={[styles.qtyBox, { backgroundColor: colors.sunken, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.qtyLabel, { color: colors.textMuted }]}>Avg Prepped</Text>
                <Text style={[styles.qtyValue, { color: colors.textPrimary }]}>
                  {suggestion.historical_avg_prepped.toFixed(1)}
                </Text>
                <Text style={[styles.qtyUnit, { color: colors.textMuted }]}>historical</Text>
              </View>

              <View style={[styles.qtyBox, { backgroundColor: colors.sunken, borderColor: colors.borderSubtle }]}>
                <Text style={[styles.qtyLabel, { color: isHighWaste ? colors.accentRose : colors.textMuted }]}>
                  Waste %
                </Text>
                <Text
                  style={[
                    styles.qtyValue,
                    { color: isHighWaste ? colors.accentRose : colors.accentEmerald },
                  ]}
                >
                  {suggestion.waste_pct.toFixed(1)}%
                </Text>
                <Text style={[styles.qtyUnit, { color: colors.textMuted }]}>shift avg</Text>
              </View>
            </View>

            {/* Reasoning Note */}
            <View style={[styles.reasoningBox, { backgroundColor: colors.sunken, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.reasoning, { color: colors.textSecondary }]}>
                💡 {suggestion.reasoning}
              </Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingHorizontal: 28,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 8,
  },
  loadingSubtext: {
    fontSize: 12,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: "900",
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  refreshBtn: {
    marginTop: 14,
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderWidth: 1,
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
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  dayBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 12,
    borderWidth: 1,
  },
  dayText: {
    fontSize: 11,
    fontWeight: "800",
  },
  generatedAt: {
    fontSize: 11,
    marginBottom: 16,
    fontWeight: "500",
  },
  summaryCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  summaryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  summaryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  summaryBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  summaryInsetBox: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  summaryText: {
    fontSize: 13,
    lineHeight: 19,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  suggestionCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
  },
  suggestionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: "900",
    flex: 1,
  },
  warnBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  warnBadgeText: {
    fontSize: 9,
    fontWeight: "900",
  },
  qtyRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  qtyBox: {
    flex: 1,
    borderRadius: 14,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  qtyLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  qtyValue: {
    fontSize: 20,
    fontWeight: "900",
  },
  qtyUnit: {
    fontSize: 9,
    marginTop: 2,
    fontWeight: "600",
  },
  reasoningBox: {
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
  },
  reasoning: {
    fontSize: 12,
    lineHeight: 17,
    fontStyle: "italic",
  },
});
