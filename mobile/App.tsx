// ============================================================
// KitchenPulse Mobile — Root App Entry
// Strict Multi-Tenant Auth Guard, Neumorphic UI & Theme Toggle
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
  ActivityIndicator,
} from "react-native";
import { useSocket } from "./src/hooks/useSocket";
import { useKitchenStore } from "./src/store/useKitchenStore";
import { useAuthStore } from "./src/store/useAuthStore";
import { useTheme } from "./src/store/useThemeStore";
import { ThemeToggle } from "./src/components/ui/ThemeToggle";
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
  { id: "queue", label: "KDS Queue", icon: "🍽️" },
  { id: "prep", label: "Prep AI", icon: "🤖" },
  { id: "waste", label: "Scrap Log", icon: "📋" },
];

function AppContent() {
  const { isAuthenticated, isHydrated, user, organization, logout } = useAuthStore();
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = React.useState<Tab>("queue");
  const { stockAlerts, clearAlerts } = useKitchenStore();

  // Initialize Socket.IO connection at app root
  useSocket();

  // Wait for MMKV storage rehydration before deciding to show login screen
  if (!isHydrated) {
    return (
      <View style={[styles.container, { backgroundColor: colors.base, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.accentSky} />
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 12, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" }}>
          Restoring kitchen station session...
        </Text>
      </View>
    );
  }

  // Strict Authentication Guard: Without login, show Auth Screen!
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  const isOwner = user?.role === "Owner";
  const isAdmin = user?.role === "Admin";

  return (
    <View style={[styles.container, { backgroundColor: colors.base }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Top Station Header with Hotel / Client Organization Info */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
          colors.shadowRaisedSm,
        ]}
      >
        <View style={styles.headerLeft}>
          <View style={styles.brandStack}>
            <Text style={[styles.headerBrand, { color: colors.textPrimary }]}>
              Kitchen<Text style={{ color: colors.accentSky }}>Pulse</Text>
            </Text>
            <View style={[styles.orgPill, { backgroundColor: colors.sunken, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.headerOrgText, { color: colors.accentSky }]} numberOfLines={1}>
                🏨 {organization?.name || "Kitchen Operations"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Neumorphic Theme Switcher */}
          <ThemeToggle compact />

          {/* User Role Badge */}
          <View style={[styles.userRoleBadge, { backgroundColor: colors.sunken, borderColor: colors.borderSubtle }]}>
            <Text style={[styles.userRoleText, { color: colors.textSecondary }]}>
              {isOwner ? "👑 " : isAdmin ? "🛡️ " : "🍳 "}
              {user?.name?.split(' ')[0]}
            </Text>
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity
            style={[styles.logoutBtn, { backgroundColor: colors.accentRoseBg, borderColor: colors.accentRose }]}
            onPress={logout}
          >
            <Text style={[styles.logoutBtnText, { color: colors.accentRose }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stock alert banner */}
      {stockAlerts.length > 0 && (
        <Pressable
          style={[styles.alertBanner, { backgroundColor: colors.accentRoseBg, borderBottomColor: colors.accentRose }]}
          onPress={clearAlerts}
        >
          <Text style={[styles.alertText, { color: colors.accentRose }]}>
            🚨 {stockAlerts.length} stock alert(s) — Tap to dismiss
          </Text>
          <Text style={[styles.alertDetail, { color: colors.textSecondary }]}>
            {stockAlerts[0]?.ingredient_name} below safety line!
          </Text>
        </Pressable>
      )}

      {/* Screen content */}
      <View style={styles.screen}>
        {activeTab === "queue" && <KitchenQueueScreen />}
        {activeTab === "prep" && <PrepSheetScreen />}
        {activeTab === "waste" && <WasteFormScreen />}
      </View>

      {/* Floating Bottom Neumorphic Dock */}
      <View style={styles.tabBarWrapper}>
        <View
          style={[
            styles.tabBar,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
            colors.shadowRaisedLg,
          ]}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                style={[
                  styles.tab,
                  isActive
                    ? [
                        styles.activeTab,
                        {
                          backgroundColor: colors.accentSkyBg,
                          borderColor: colors.accentSky,
                        },
                        colors.shadowRaisedSm,
                      ]
                    : { borderColor: "transparent" },
                ]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text style={styles.tabIcon}>{tab.icon}</Text>
                <Text
                  style={[
                    styles.tabLabel,
                    { color: isActive ? colors.accentSky : colors.textMuted },
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
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.base }]}>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
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
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  orgPill: {
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  headerOrgText: {
    fontSize: 10,
    fontWeight: "700",
    maxWidth: 160,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userRoleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  userRoleText: {
    fontSize: 10,
    fontWeight: "700",
  },
  logoutBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  logoutBtnText: {
    fontSize: 10,
    fontWeight: "700",
  },
  alertBanner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  alertText: {
    fontSize: 12,
    fontWeight: "700",
  },
  alertDetail: {
    fontSize: 11,
  },
  screen: {
    flex: 1,
    paddingBottom: Platform.OS === "ios" ? 82 : 72,
  },
  tabBarWrapper: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 18 : 12,
    left: 16,
    right: 16,
    alignItems: "center",
  },
  tabBar: {
    flexDirection: "row",
    borderRadius: 24,
    borderWidth: 1,
    padding: 6,
    width: "100%",
    maxWidth: 440,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
    minHeight: 44,
  },
  activeTab: {
    borderWidth: 1,
  },
  tabIcon: {
    fontSize: 15,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  activeTabLabel: {
    fontWeight: "800",
  },
});
