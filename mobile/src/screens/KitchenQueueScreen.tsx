// ============================================================
// KitchenPulse Mobile — Live Kitchen Queue Screen
// Responsive: Tablet (3-Column) / Mobile Phone (Segmented Tabs)
// Tactile Neumorphic styling with real-time WebSocket sync
// ============================================================

import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { useKitchenStore } from "../store/useKitchenStore";
import { useTickets, useUpdateTicketStatus } from "../hooks/useQueries";
import { TicketCard } from "../components/tickets/TicketCard";
import { useTheme } from "../store/useThemeStore";
import type { LiveTicket } from "../types";

const COLUMN_STATUSES: LiveTicket["status"][] = ["QUEUE", "FIRING", "COMPLETED"];

const COLUMN_LABELS: Record<LiveTicket["status"], string> = {
  QUEUE: "⏳ Queue",
  FIRING: "🔥 Firing",
  COMPLETED: "✅ Done",
  CANCELLED: "🚫 Cancelled",
};

type ViewFilter = "ALL" | LiveTicket["status"];

export default function KitchenQueueScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 640;
  const { colors, isDark } = useTheme();

  const [activeFilter, setActiveFilter] = useState<ViewFilter>("ALL");

  const { tickets: wsTickets } = useKitchenStore();
  const { data: fetchedTickets, isLoading, refetch } = useTickets();
  const updateStatus = useUpdateTicketStatus();

  // Merge WebSocket tickets with server state
  const allTickets: LiveTicket[] = React.useMemo(() => {
    if (wsTickets.length > 0) {
      const wsIds = new Set(wsTickets.map((t) => t.id));
      const fromServer = (fetchedTickets ?? []).filter((t: LiveTicket) => !wsIds.has(t.id));
      return [...wsTickets, ...fromServer];
    }
    return fetchedTickets ?? [];
  }, [wsTickets, fetchedTickets]);

  const handleUpdateStatus = useCallback(
    (id: string, status: string) => {
      updateStatus.mutate({ id, status });
    },
    [updateStatus]
  );

  const ticketsByStatus = COLUMN_STATUSES.reduce(
    (acc, status) => {
      acc[status] = allTickets.filter((t) => t.status === status);
      return acc;
    },
    {} as Record<LiveTicket["status"], LiveTicket[]>
  );

  const filteredTickets = React.useMemo(() => {
    if (activeFilter === "ALL") return allTickets;
    return ticketsByStatus[activeFilter] ?? [];
  }, [activeFilter, allTickets, ticketsByStatus]);

  const getStatusColor = (status: LiveTicket["status"]) => {
    switch (status) {
      case "QUEUE":
        return colors.accentSky;
      case "FIRING":
        return colors.accentAmber;
      case "COMPLETED":
        return colors.accentEmerald;
      default:
        return colors.accentRose;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.base }]}>
      {/* Screen Title & Order Count Bar */}
      <View style={styles.screenTitleRow}>
        <View style={styles.titleStack}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Live KDS Board</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {allTickets.length} active ticket{allTickets.length === 1 ? "" : "s"} across line stations
          </Text>
        </View>

        <View
          style={[
            styles.orderBadge,
            {
              backgroundColor: colors.sunken,
              borderColor: colors.borderSubtle,
            },
            colors.shadowRaisedSm,
          ]}
        >
          <Text style={[styles.orderBadgeText, { color: colors.accentSky }]}>
            {allTickets.length} {allTickets.length === 1 ? "Order" : "Orders"}
          </Text>
        </View>
      </View>

      {/* Mobile-Only Segmented Filter Bar (<640px) */}
      {!isTablet && (
        <View style={[styles.filterBar, { backgroundColor: colors.sunken, borderBottomColor: colors.borderSubtle }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <Pressable
              style={[
                styles.filterChip,
                {
                  backgroundColor: activeFilter === "ALL" ? colors.accentSkyBg : colors.card,
                  borderColor: activeFilter === "ALL" ? colors.accentSky : colors.border,
                },
                activeFilter === "ALL" ? colors.shadowRaisedSm : {},
              ]}
              onPress={() => setActiveFilter("ALL")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color: activeFilter === "ALL" ? colors.accentSky : colors.textSecondary,
                    fontWeight: activeFilter === "ALL" ? "800" : "600",
                  },
                ]}
              >
                All ({allTickets.length})
              </Text>
            </Pressable>

            {COLUMN_STATUSES.map((status) => {
              const count = ticketsByStatus[status]?.length ?? 0;
              const isActive = activeFilter === status;
              const color = getStatusColor(status);

              return (
                <Pressable
                  key={status}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isActive ? `${color}22` : colors.card,
                      borderColor: isActive ? color : colors.border,
                    },
                    isActive ? colors.shadowRaisedSm : {},
                  ]}
                  onPress={() => setActiveFilter(status)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color: isActive ? color : colors.textSecondary,
                        fontWeight: isActive ? "800" : "600",
                      },
                    ]}
                  >
                    {COLUMN_LABELS[status]} ({count})
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Layout Rendering: Tablet (3 Columns) vs Mobile Phone (Full-width cards) */}
      {isTablet ? (
        /* Tablet 3-Column Grid */
        <View style={styles.columns}>
          {COLUMN_STATUSES.map((status) => {
            const count = ticketsByStatus[status]?.length ?? 0;
            const color = getStatusColor(status);

            return (
              <View
                key={status}
                style={[
                  styles.column,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                  colors.shadowRaisedSm,
                ]}
              >
                {/* Column header */}
                <View
                  style={[
                    styles.columnHeader,
                    {
                      borderTopColor: color,
                      backgroundColor: colors.sunken,
                    },
                  ]}
                >
                  <View style={styles.colHeaderLeft}>
                    <View style={[styles.statusGlowDot, { backgroundColor: color }]} />
                    <Text style={[styles.columnTitle, { color }]}>
                      {COLUMN_LABELS[status]}
                    </Text>
                  </View>
                  <View style={[styles.countBadge, { backgroundColor: `${color}25`, borderColor: `${color}60` }]}>
                    <Text style={[styles.countText, { color }]}>{count}</Text>
                  </View>
                </View>

                {/* Tickets list */}
                <ScrollView
                  style={styles.columnScroll}
                  showsVerticalScrollIndicator={false}
                  refreshControl={
                    <RefreshControl
                      refreshing={isLoading}
                      onRefresh={refetch}
                      tintColor={colors.accentSky}
                    />
                  }
                >
                  {count === 0 ? (
                    <View style={styles.emptyCol}>
                      <Text style={styles.emptyIcon}>✨</Text>
                      <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                        No tickets in {COLUMN_LABELS[status]}
                      </Text>
                    </View>
                  ) : (
                    ticketsByStatus[status]?.map((ticket) => (
                      <TicketCard
                        key={ticket.id}
                        ticket={ticket}
                        onUpdateStatus={handleUpdateStatus}
                      />
                    ))
                  )}
                </ScrollView>
              </View>
            );
          })}
        </View>
      ) : (
        /* Phone View: Full width cards */
        <ScrollView
          style={styles.phoneScroll}
          contentContainerStyle={styles.phoneScrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              tintColor={colors.accentSky}
            />
          }
        >
          {filteredTickets.length === 0 ? (
            <View style={styles.emptyCol}>
              <Text style={styles.emptyIcon}>✨</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No tickets found for this station filter
              </Text>
            </View>
          ) : (
            filteredTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onUpdateStatus={handleUpdateStatus}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  titleStack: {
    flexDirection: "column",
  },
  title: {
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 1,
    fontWeight: "500",
  },
  orderBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  orderBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  filterBar: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  filterScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6.5,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
  },
  columns: {
    flex: 1,
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingTop: 10,
    gap: 8,
  },
  column: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 8,
    overflow: "hidden",
  },
  columnHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: 3,
    borderRadius: 10,
    marginBottom: 8,
  },
  colHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusGlowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  columnTitle: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    borderWidth: 1,
  },
  countText: {
    fontSize: 11,
    fontWeight: "900",
  },
  columnScroll: {
    flex: 1,
  },
  phoneScroll: {
    flex: 1,
    paddingHorizontal: 12,
  },
  phoneScrollContent: {
    paddingVertical: 8,
    paddingBottom: 24,
  },
  emptyCol: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 52,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 26,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
