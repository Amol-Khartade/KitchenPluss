// ============================================================
// KitchenPulse Mobile — Ticket Card Component (Reanimated)
// Animates smoothly between QUEUE → FIRING → DONE states
// ============================================================

import React, { useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  interpolateColor,
  Easing,
} from "react-native-reanimated";
import type { LiveTicket } from "../../types";

const STATUS_COLORS: Record<LiveTicket["status"], string> = {
  QUEUE: "#3B82F6",     // blue
  FIRING: "#F59E0B",    // amber
  COMPLETED: "#10B981", // emerald
};

const STATUS_LABELS: Record<LiveTicket["status"], string> = {
  QUEUE: "⏳ QUEUE",
  FIRING: "🔥 FIRING",
  COMPLETED: "✅ DONE",
};

interface TicketCardProps {
  ticket: LiveTicket;
  onUpdateStatus: (id: string, status: string) => void;
}

export const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  onUpdateStatus,
}) => {
  // Animated values
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const glowOpacity = useSharedValue(0);
  const statusProgress = useSharedValue(
    ticket.status === "QUEUE" ? 0 : ticket.status === "FIRING" ? 0.5 : 1
  );

  // Entry animation
  useEffect(() => {
    scale.value = withSpring(1, { damping: 14, stiffness: 180 });
    opacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) });
    translateY.value = withSpring(0, { damping: 12, stiffness: 150 });
  }, []);

  // Status transition animation
  useEffect(() => {
    const targetProgress =
      ticket.status === "QUEUE" ? 0 : ticket.status === "FIRING" ? 0.5 : 1;

    statusProgress.value = withSpring(targetProgress, {
      damping: 15,
      stiffness: 120,
    });

    if (ticket.status === "FIRING") {
      glowOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0.4, { duration: 600 }),
        withTiming(1, { duration: 600 })
      );
    } else if (ticket.status === "COMPLETED") {
      glowOpacity.value = withTiming(0, { duration: 500 });
    }
  }, [ticket.status]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
    opacity: opacity.value,
    borderColor: interpolateColor(
      statusProgress.value,
      [0, 0.5, 1],
      ["#3B82F6", "#F59E0B", "#10B981"]
    ),
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    backgroundColor: interpolateColor(
      statusProgress.value,
      [0, 0.5, 1],
      ["rgba(59,130,246,0.15)", "rgba(245,158,11,0.25)", "rgba(16,185,129,0.15)"]
    ),
  }));

  const statusColor = STATUS_COLORS[ticket.status];

  // Elapsed time
  const elapsedMs = Date.now() - new Date(ticket.created_at).getTime();
  const elapsedMin = Math.floor(elapsedMs / 60_000);

  const nextStatus =
    ticket.status === "QUEUE"
      ? "FIRING"
      : ticket.status === "FIRING"
      ? "COMPLETED"
      : null;

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      {/* Glow overlay */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.glow, glowStyle]} />

      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{STATUS_LABELS[ticket.status]}</Text>
        </View>
        <Text style={styles.elapsed}>{elapsedMin}m ago</Text>
      </View>

      {/* Recipe Name */}
      <Text style={styles.recipeName}>{ticket.recipe_name ?? "—"}</Text>

      {/* Station */}
      <Text style={styles.station}>🍳 {ticket.station}</Text>

      {/* Progress bar */}
      <View style={styles.progressBg}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: `${(statusProgress.value * 100).toFixed(0)}%` as unknown as number,
              backgroundColor: statusColor,
            },
          ]}
        />
      </View>

      {/* Action button */}
      {nextStatus && (
        <Pressable
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: statusColor, opacity: pressed ? 0.75 : 1 },
          ]}
          onPress={() => onUpdateStatus(ticket.id, nextStatus)}
        >
          <Text style={styles.actionBtnText}>
            {nextStatus === "FIRING" ? "🔥 Fire It!" : "✅ Mark Done"}
          </Text>
        </Pressable>
      )}

      {ticket.status === "COMPLETED" && ticket.completed_at && (
        <Text style={styles.completedAt}>
          Completed at{" "}
          {new Date(ticket.completed_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#3B82F6",
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 4,
    overflow: "hidden",
    minHeight: 160,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  } as ViewStyle,
  glow: {
    borderRadius: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  elapsed: {
    color: "#94A3B8",
    fontSize: 12,
  },
  recipeName: {
    color: "#F1F5F9",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  station: {
    color: "#94A3B8",
    fontSize: 13,
    marginBottom: 12,
  },
  progressBg: {
    height: 4,
    backgroundColor: "#334155",
    borderRadius: 2,
    marginBottom: 12,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  actionBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  completedAt: {
    color: "#10B981",
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
  },
});
