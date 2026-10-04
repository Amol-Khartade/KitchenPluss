// ============================================================
// KitchenPulse Mobile — Root App Entry
// Strict Multi-Tenant Auth Guard & Station Navigation
// ============================================================

import "react-native-reanimated";
import React from "react";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useSocket } from "./src/hooks/useSocket";
import { useKitchenStore } from "./src/store/useKitchenStore";
import { useAuthStore } from "./src/store/useAuthStore";
import KitchenQueueScreen from "./src/screens/KitchenQueueScreen";
import PrepSheetScreen from "./src/screens/PrepSheetScreen";
import WasteFormScreen from "./src/screens/WasteFormScreen";
import AuthScreen from "./src/screens/AuthScreen";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
    },
  },
});

type Tab = "queue" | "prep" | "waste";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "queue", label: "Kitchen", icon: "🍽️" },
  { id: "prep", label: "Prep AI", icon: "🤖" },
  { id: "waste", label: "EOD Log", icon: "📋" },
];

function AppContent() {
  const { isAuthenticated, user, organization, logout } = useAuthStore();
  const [activeTab, setActiveTab] = React.useState<Tab>("queue");
  const { stockAlerts, clearAlerts } = useKitchenStore();

  // Initialize Socket.IO connection at app root
  useSocket();

  // Strict Authentication Guard: Without login, DO NOT show dashboard!
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  const isOwner = user?.role === "Owner";
  const isAdmin = user?.role === "Admin";

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Top Station Header with Hotel / Client Organization Info */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerBrand}>
            Kitchen<Text style={styles.headerBrandAccent}>Pulse</Text>
          </Text>
          <View style={styles.orgBadge}>
            <Text style={styles.orgBadgeText} numberOfLines={1}>
              🏨 {organization?.name || "Kitchen Operations"}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.userRoleBadge}>
            <Text style={styles.userRoleText}>
              {isOwner ? "👑 " : isAdmin ? "🛡️ " : "🍳 "}
              {user?.name} ({user?.role})
            </Text>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stock alert banner */}
      {stockAlerts.length > 0 && (
        <Pressable style={styles.alertBanner} onPress={clearAlerts}>
          <Text style={styles.alertText}>
            🚨 {stockAlerts.length} stock alert(s) — Tap to dismiss
          </Text>
          <Text style={styles.alertDetail}>
            {stockAlerts[0]?.ingredient_name} is low!
          </Text>
        </Pressable>
      )}

      {/* Screen content */}
      <View style={styles.screen}>
        {activeTab === "queue" && <KitchenQueueScreen />}
        {activeTab === "prep" && <PrepSheetScreen />}
        {activeTab === "waste" && <WasteFormScreen />}
      </View>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab.id && styles.activeTabLabel,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#060910",
  },
  container: {
    flex: 1,
    backgroundColor: "#0a0e17",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#0d131f",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  headerBrand: {
    fontSize: 16,
    fontWeight: "900",
    color: "#f8fafc",
  },
  headerBrandAccent: {
    color: "#38bdf8",
  },
  orgBadge: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
    maxWidth: 160,
  },
  orgBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#38bdf8",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userRoleBadge: {
    backgroundColor: "#131b2e",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  userRoleText: {
    fontSize: 10,
    color: "#cbd5e1",
    fontWeight: "600",
  },
  logoutBtn: {
    backgroundColor: "rgba(225, 29, 72, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(225, 29, 72, 0.3)",
  },
  logoutBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fda4af",
  },
  alertBanner: {
    backgroundColor: "#7f1d1d",
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  alertText: {
    color: "#fecaca",
    fontSize: 12,
    fontWeight: "600",
  },
  alertDetail: {
    color: "#fca5a5",
    fontSize: 11,
  },
  screen: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#0d131f",
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    paddingBottom: Platform.OS === "ios" ? 16 : 8,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
  },
  activeTab: {
    borderTopWidth: 2,
    borderTopColor: "#38bdf8",
    marginTop: -2,
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "500",
  },
  activeTabLabel: {
    color: "#38bdf8",
    fontWeight: "700",
  },
});
