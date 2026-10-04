// ============================================================
// KitchenPulse Mobile — Root App Entry
// Sets up Navigation, QueryClient, and Socket.IO
// ============================================================

import "react-native-reanimated";
import React from "react";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { View, Text, StyleSheet, Pressable, SafeAreaView } from "react-native";
import { useSocket } from "./src/hooks/useSocket";
import { useKitchenStore } from "./src/store/useKitchenStore";
import KitchenQueueScreen from "./src/screens/KitchenQueueScreen";
import PrepSheetScreen from "./src/screens/PrepSheetScreen";
import WasteFormScreen from "./src/screens/WasteFormScreen";

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
  const [activeTab, setActiveTab] = React.useState<Tab>("queue");
  const { stockAlerts, clearAlerts } = useKitchenStore();

  // Initialize Socket.IO connection at app root
  useSocket();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

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
    <SafeAreaView style={styles.container}>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  screen: {
    flex: 1,
  },
  alertBanner: {
    backgroundColor: "#7F1D1D",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EF4444",
  },
  alertText: {
    color: "#FCA5A5",
    fontWeight: "700",
    fontSize: 13,
  },
  alertDetail: {
    color: "#FCA5A5",
    fontSize: 11,
    marginTop: 2,
    opacity: 0.8,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    borderTopWidth: 1,
    borderTopColor: "#334155",
    paddingBottom: 20,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
  },
  activeTab: {
    borderTopWidth: 2,
    borderTopColor: "#3B82F6",
  },
  tabIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
  tabLabel: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  activeTabLabel: {
    color: "#3B82F6",
  },
});
