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
          <View style={styles.brandStack}>
            <Text style={styles.headerBrand}>
              Kitchen<Text style={styles.headerBrandAccent}>Pulse</Text>
            </Text>
            <Text style={styles.headerOrgText} numberOfLines={1}>
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

      {/* Floating Bottom Frosted Glass Dock */}
      <View style={styles.tabBarWrapper}>
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                style={[styles.tab, isActive && styles.activeTab]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text style={styles.tabIcon}>{tab.icon}</Text>
                <Text
                  style={[
                    styles.tabLabel,
                    isActive && styles.activeTabLabel,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
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
    backgroundColor: "#070B14",
  },
  container: {
    flex: 1,
    backgroundColor: "#070B14",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(13, 20, 36, 0.85)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  brandStack: {
    flexDirection: "column",
    justifyContent: "center",
  },
  headerBrand: {
    fontSize: 16,
    fontWeight: "900",
    color: "#f8fafc",
    letterSpacing: -0.3,
    lineHeight: 18,
  },
  headerBrandAccent: {
    color: "#38bdf8",
  },
  headerOrgText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#38bdf8",
    marginTop: 2,
    maxWidth: 180,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userRoleBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  userRoleText: {
    fontSize: 10,
    color: "#cbd5e1",
    fontWeight: "600",
  },
  logoutBtn: {
    backgroundColor: "rgba(225, 29, 72, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(225, 29, 72, 0.3)",
  },
  logoutBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fda4af",
  },
  alertBanner: {
    backgroundColor: "rgba(159, 18, 57, 0.8)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(244, 63, 94, 0.3)",
  },
  alertText: {
    color: "#ffe4e6",
    fontSize: 12,
    fontWeight: "700",
  },
  alertDetail: {
    color: "#fecdd3",
    fontSize: 11,
  },
  screen: {
    flex: 1,
    paddingBottom: Platform.OS === "ios" ? 75 : 65,
  },
  tabBarWrapper: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 18 : 10,
    left: 16,
    right: 16,
    alignItems: "center",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "rgba(13, 20, 36, 0.92)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    padding: 5,
    width: "100%",
    maxWidth: 420,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 18,
    gap: 6,
    minHeight: 44,
  },
  activeTab: {
    backgroundColor: "rgba(56, 189, 248, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.4)",
  },
  tabIcon: {
    fontSize: 15,
  },
  tabLabel: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "600",
  },
  activeTabLabel: {
    color: "#38bdf8",
    fontWeight: "800",
  },
});
