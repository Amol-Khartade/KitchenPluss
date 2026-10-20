// ============================================================
// KitchenPulse Mobile — Tactile Neumorphic Ticket Card (Reanimated)
// Soft UI extruded surfaces, smooth status transitions & flame glow
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
  withRepeat,
  interpolateColor,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "../../store/useThemeStore";
import type { LiveTicket } from "../../types";

const STATUS_COLORS: Record<LiveTicket["status"], string> = {
  QUEUE: "#0284C7",     // Sky-600 in light, sky-400 in dark
  FIRING: "#D97706",    // Amber-600
  COMPLETED: "#059669", // Emerald-600
  CANCELLED: "#E11D48", // Rose-600
};

const STATUS_LABELS: Record<LiveTicket["status"], string> = {
  QUEUE: "⏳ QUEUE",
  FIRING: "🔥 FIRING",
  COMPLETED: "✅ DONE",
  CANCELLED: "🚫 CANCELLED",
};

interface TicketCardProps {
  ticket: LiveTicket;
  onUpdateStatus: (id: string, status: string) => void;
}

export const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  onUpdateStatus,
}) => {
  const { colors, isDark } = useTheme();

  // Animated values
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);
  const flameGlow = useSharedValue(0.3);
  const btnScale = useSharedValue(1);

  const statusProgress = useSharedValue(
    ticket.status === "QUEUE" ? 0 : ticket.status === "FIRING" ? 0.5 : 1
  );

  // Mount animation
  useEffect(() => {
    scale.value = withSpring(1, { damping: 14, stiffness: 180 });
    opacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.quad) });
    translateY.value = withSpring(0, { damping: 14, stiffness: 150 });
  }, []);

  // Status transitions & FIRING flame pulsing
  useEffect(() => {
    const targetProgress =
      ticket.status === "QUEUE" ? 0 : ticket.status === "FIRING" ? 0.5 : 1;

    statusProgress.value = withSpring(targetProgress, {
      damping: 15,
      stiffness: 140,
    });

    if (ticket.status === "FIRING") {
      flameGlow.value = withRepeat(
        withSequence(
          withTiming(0.85, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.25, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      flameGlow.value = withTiming(0, { duration: 300 });
    }
  }, [ticket.status]);

  const cardBorderAnim = useAnimatedStyle(() => {
    const activeBorderColor = interpolateColor(
      statusProgress.value,
      [0, 0.5, 1],
      [
        isDark ? "#38BDF8" : "#0284C7",
        "#F59E0B",
        isDark ? "#10B981" : "#059669",
      ]
    );

    return {
      borderColor: activeBorderColor,
      transform: [{ scale: scale.value }, { translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  const flameGlowStyle = useAnimatedStyle(() => ({
    opacity: flameGlow.value,
  }));

  const btnAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const statusColor = isDark
    ? ticket.status === "QUEUE"
      ? "#38BDF8"
      : ticket.status === "FIRING"
      ? "#F59E0B"
      : ticket.status === "COMPLETED"
      ? "#10B981"
      : "#F43F5E"
    : STATUS_COLORS[ticket.status];

  // Elapsed wait time calculation
  const elapsedMs = Date.now() - new Date(ticket.created_at).getTime();
  const elapsedMin = Math.max(0, Math.floor(elapsedMs / 60_000));
  const isUrgent = elapsedMin >= 15 && ticket.status !== "COMPLETED";

  const nextStatus =
    ticket.status === "QUEUE"
      ? "FIRING"
      : ticket.status === "FIRING"
      ? "COMPLETED"
      : null;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        colors.shadowRaised,
        cardBorderAnim,
      ]}
    >
      {/* Flame Glow Layer on Firing Tickets */}
      {ticket.status === "FIRING" && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.flameOverlay,
            { backgroundColor: isDark ? "rgba(245, 158, 11, 0.15)" : "rgba(217, 119, 6, 0.08)" },
            flameGlowStyle,
          ]}
        />
      )}

      {/* Header Row: Status Badge & Wait Clock */}
      <View style={styles.header}>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22`, borderColor: `${statusColor}60` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {STATUS_LABELS[ticket.status]}
          </Text>
        </View>

        <View style={[styles.clockBadge, { backgroundColor: colors.sunken, borderColor: colors.borderSubtle }]}>
          <Text
            style={[
              styles.elapsed,
              { color: isUrgent ? colors.accentRose : colors.textMuted },
              isUrgent && { fontWeight: "800" },
            ]}
          >
            ⏱️ T+ {elapsedMin}m
          </Text>
        </View>
      </View>

      {/* Recipe Name */}
      <Text style={[styles.recipeName, { color: colors.textPrimary }]}>
        {ticket.recipe_name ?? "Menu Item"}
      </Text>

      {/* Station & Table Row */}
      <View style={styles.metaRow}>
        <View style={[styles.metaPill, { backgroundColor: colors.sunken, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.stationText, { color: colors.textSecondary }]}>
            🍳 {ticket.station || "Kitchen Line"}
          </Text>
        </View>

        {ticket.table_number && (
          <View style={[styles.metaPill, { backgroundColor: colors.sunken, borderColor: colors.borderSubtle }]}>
            <Text style={[styles.tableText, { color: colors.accentSky }]}>
              Table #{ticket.table_number}
            </Text>
          </View>
        )}
      </View>

      {/* Special Instructions / Notes */}
      {ticket.notes ? (
        <View style={[styles.notesContainer, { backgroundColor: colors.sunken, borderColor: colors.borderSubtle }]}>
          <Text style={[styles.notesText, { color: colors.textSecondary }]} numberOfLines={2}>
            📝 {ticket.notes}
          </Text>
        </View>
      ) : null}

      {/* Progress Line */}
      <View style={[styles.progressTrack, { backgroundColor: colors.sunken }]}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: `${Math.round(statusProgress.value * 100)}%` as unknown as number,
              backgroundColor: statusColor,
            },
          ]}
        />
      </View>

      {/* Action Button */}
      {nextStatus && (
        <Animated.View style={btnAnimatedStyle}>
          <Pressable
            style={[
              styles.actionBtn,
              {
                backgroundColor: statusColor,
                borderColor: "rgba(255, 255, 255, 0.3)",
              },
              colors.shadowRaisedSm,
            ]}
            onPressIn={() => {
              btnScale.value = withSpring(0.95);
            }}
            onPressOut={() => {
              btnScale.value = withSpring(1);
            }}
            onPress={() => onUpdateStatus(ticket.id, nextStatus)}
          >
            <Text style={styles.actionBtnText}>
              {nextStatus === "FIRING" ? "🔥 Fire to Line" : "✅ Mark Completed"}
            </Text>
          </Pressable>
        </Animated.View>
      )}

      {ticket.status === "COMPLETED" && ticket.completed_at && (
        <View style={[styles.completedBanner, { backgroundColor: colors.accentEmeraldBg, borderColor: `${colors.accentEmerald}40` }]}>
          <Text style={[styles.completedAt, { color: colors.accentEmerald }]}>
            ✨ Finished at {new Date(ticket.completed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 15,
    marginVertical: 7,
    marginHorizontal: 3,
    overflow: "hidden",
    position: "relative",
  } as ViewStyle,
  flameOverlay: {
    borderRadius: 18,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  clockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  elapsed: {
    fontSize: 11,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  recipeName: {
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  metaPill: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  stationText: {
    fontSize: 11,
    fontWeight: "700",
  },
  tableText: {
    fontSize: 11,
    fontWeight: "800",
  },
  notesContainer: {
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  notesText: {
    fontSize: 11,
    fontStyle: "italic",
    lineHeight: 15,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  actionBtn: {
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 46,
    justifyContent: "center",
    alignItems: "center",
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 0.4,
  },
  completedBanner: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    alignItems: "center",
  },
  completedAt: {
    fontSize: 11,
    fontWeight: "800",
  },
});
