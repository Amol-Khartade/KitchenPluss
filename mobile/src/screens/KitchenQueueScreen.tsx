// ============================================================
// KitchenPulse Mobile — Live Kitchen Queue Screen
// Real-time ticket board with animated cards
// ============================================================

import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
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
  QUEUE: "#3B82F6",
  FIRING: "#F59E0B",
  COMPLETED: "#10B981",
};

export default function KitchenQueueScreen() {
  const { tickets: wsTickets, isConnected } = useKitchenStore();
  const { data: fetchedTickets, isLoading, refetch } = useTickets();
  const updateStatus = useUpdateTicketStatus();

  // Merge WebSocket tickets with server state
  // WebSocket updates take precedence for real-time feel
  const allTickets: LiveTicket[] = React.useMemo(() => {
    if (wsTickets.length > 0) {
      // Merge: WS tickets take priority, fill gaps with fetched
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🍽️ Live Kitchen Queue</Text>
        <View style={styles.headerRight}>
          <View
            style={[
              styles.connectionDot,
              { backgroundColor: isConnected ? "#10B981" : "#EF4444" },
            ]}
          />
          <Text style={styles.connectionLabel}>
            {isConnected ? "LIVE" : "OFFLINE"}
          </Text>
        </View>
      </View>

      {/* Columns (3-column tablet layout) */}
      <View style={styles.columns}>
        {COLUMN_STATUSES.map((status) => (
          <View key={status} style={styles.column}>
            {/* Column header */}
            <View
              style={[
                styles.columnHeader,
                { borderBottomColor: COLUMN_COLORS[status] },
              ]}
            >
              <Text
                style={[styles.columnTitle, { color: COLUMN_COLORS[status] }]}
              >
                {COLUMN_LABELS[status]}
              </Text>
              <View
                style={[
                  styles.countBadge,
                  { backgroundColor: COLUMN_COLORS[status] },
                ]}
              >
                <Text style={styles.countText}>
                  {ticketsByStatus[status]?.length ?? 0}
                </Text>
              </View>
            </View>

            {/* Tickets */}
            <ScrollView
              style={styles.columnScroll}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isLoading}
                  onRefresh={refetch}
                  tintColor="#3B82F6"
                />
              }
            >
              {ticketsByStatus[status]?.length === 0 ? (
                <View style={styles.emptyCol}>
                  <Text style={styles.emptyText}>No tickets</Text>
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
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  title: {
    color: "#F1F5F9",
    fontSize: 22,
    fontWeight: "700",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  connectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  connectionLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  columns: {
    flex: 1,
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  column: {
    flex: 1,
    marginHorizontal: 4,
  },
  columnHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    marginBottom: 8,
    borderBottomWidth: 2,
  },
  columnTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  countBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  countText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  columnScroll: {
    flex: 1,
  },
  emptyCol: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyText: {
    color: "#475569",
    fontSize: 13,
  },
});
