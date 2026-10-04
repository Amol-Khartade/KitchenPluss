// ============================================================
// KitchenPulse Mobile — Live Kitchen Queue Screen
// Responsive: Tablet (3-Column) / Mobile Phone (Segmented Tabs)
// Glassmorphism aesthetic with real-time WebSocket sync
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
  Platform,
} from "react-native";
import { useKitchenStore } from "../store/useKitchenStore";
import { useTickets, useUpdateTicketStatus } from "../hooks/useQueries";
import { TicketCard } from "../components/tickets/TicketCard";
import type { LiveTicket } from "../types";

const COLUMN_STATUSES: LiveTicket["status"][] = ["QUEUE", "FIRING", "COMPLETED"];

const COLUMN_LABELS: Record<LiveTicket["status"], string> = {
  QUEUE: "⏳ Queue",
  FIRING: "🔥 Firing",
  COMPLETED: "✅ Done",
};

const COLUMN_COLORS: Record<LiveTicket["status"], string> = {
  QUEUE: "#38BDF8", // Cyan / sky
  FIRING: "#F59E0B", // Amber
  COMPLETED: "#10B981", // Emerald
};

type ViewFilter = "ALL" | LiveTicket["status"];

export default function KitchenQueueScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 640;

  const [activeFilter, setActiveFilter] = useState<ViewFilter>("ALL");

  const { tickets: wsTickets, isConnected } = useKitchenStore();
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

  return (
    <View style={styles.container}>
      {/* Screen Title & Order Count Bar (Content-level, not a second app header) */}
      <View style={styles.screenTitleRow}>
        <View style={styles.titleStack}>
          <Text style={styles.title}>Live KDS Board</Text>
          <Text style={styles.subtitle}>
            {allTickets.length} active order{allTickets.length === 1 ? "" : "s"} across stations
          </Text>
        </View>

        <View style={styles.orderBadge}>
          <Text style={styles.orderBadgeText}>
            {allTickets.length} {allTickets.length === 1 ? "Order" : "Orders"}
          </Text>
        </View>
      </View>

      {/* Mobile-Only Segmented Filter Bar (<640px) */}
      {!isTablet && (
        <View style={styles.filterBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <Pressable
              style={[
                styles.filterChip,
                activeFilter === "ALL" && styles.filterChipActiveAll,
              ]}
              onPress={() => setActiveFilter("ALL")}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === "ALL" && styles.filterChipTextActive,
                ]}
              >
                All ({allTickets.length})
              </Text>
            </Pressable>

            {COLUMN_STATUSES.map((status) => {
              const count = ticketsByStatus[status]?.length ?? 0;
              const isActive = activeFilter === status;
              return (
                <Pressable
                  key={status}
                  style={[
                    styles.filterChip,
                    isActive && {
                      backgroundColor: `${COLUMN_COLORS[status]}25`,
                      borderColor: COLUMN_COLORS[status],
                    },
                  ]}
                  onPress={() => setActiveFilter(status)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      isActive && { color: COLUMN_COLORS[status], fontWeight: "800" },
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
            const color = COLUMN_COLORS[status];
            return (
              <View key={status} style={styles.column}>
                {/* Column header */}
                <View
                  style={[
                    styles.columnHeader,
                    { borderTopColor: color },
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
                      tintColor="#38BDF8"
                    />
                  }
                >
                  {count === 0 ? (
                    <View style={styles.emptyCol}>
                      <Text style={styles.emptyIcon}>✨</Text>
                      <Text style={styles.emptyText}>No tickets in {COLUMN_LABELS[status]}</Text>
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
        /* Phone View: Full width cards for natural thumb accessibility */
        <ScrollView
          style={styles.phoneScroll}
          contentContainerStyle={styles.phoneScrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              tintColor="#38BDF8"
            />
          }
        >
          {filteredTickets.length === 0 ? (
            <View style={styles.emptyCol}>
              <Text style={styles.emptyIcon}>✨</Text>
              <Text style={styles.emptyText}>No tickets found for this filter</Text>
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
    backgroundColor: "#070B14",
  },
  screenTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  titleStack: {
    flexDirection: "column",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 1,
  },
  orderBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
  },
  orderBadgeText: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "800",
  },
  filterBar: {
    backgroundColor: "rgba(10, 15, 28, 0.8)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
    paddingVertical: 8,
  },
  filterScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  filterChipActiveAll: {
    backgroundColor: "rgba(56, 189, 248, 0.18)",
    borderColor: "rgba(56, 189, 248, 0.5)",
  },
  filterChipText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#38BDF8",
    fontWeight: "800",
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
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 8,
    overflow: "hidden",
  },
  columnHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderTopWidth: 2.5,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    marginBottom: 8,
  },
  colHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusGlowDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  columnTitle: {
    fontSize: 13,
    fontWeight: "800",
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
    fontWeight: "800",
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
    paddingBottom: 20,
  },
  emptyCol: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 24,
  },
  emptyText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "500",
  },
});
