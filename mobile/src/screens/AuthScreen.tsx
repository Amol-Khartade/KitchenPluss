// ============================================================
// KitchenPulse Mobile — Authentication Screen
// Strict Auth Guard, Tenant Organization Selector & Neumorphic UI
// ============================================================

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useAuthStore } from "../store/useAuthStore";
import { useTheme } from "../store/useThemeStore";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import { api } from "../api/client";
import { Organization } from "../types";

export default function AuthScreen() {
  const { login, register, isLoading } = useAuthStore();
  const { colors, isDark } = useTheme();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [signupType, setSignupType] = useState<"new_org" | "join_org">("new_org");

  // Form inputs
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Admin");
  const [orgName, setOrgName] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    api.auth
      .getOrganizations()
      .then((res) => {
        if (isMounted && res.organizations?.length > 0) {
          setOrganizations(res.organizations);
          setSelectedOrgId(res.organizations[0].id);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAuth = async () => {
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    try {
      if (mode === "login") {
        await login(email.trim().toLowerCase(), password);
      } else {
        if (signupType === "new_org" && !orgName.trim()) {
          setErrorMessage("Please enter a Hotel or Restaurant name.");
          return;
        }
        await register({
          name: name.trim() || email.split("@")[0],
          email: email.trim().toLowerCase(),
          password,
          role: signupType === "new_org" ? "Owner" : role,
          organization_name: signupType === "new_org" ? orgName.trim() : undefined,
          organization_id: signupType === "join_org" ? selectedOrgId : undefined,
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Authentication failed.");
    }
  };

  const handleQuickDemo = async (demoEmail: string) => {
    setErrorMessage(null);
    try {
      await login(demoEmail, "password123");
    } catch (err: any) {
      setErrorMessage(err.message || "Demo login failed");
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.keyboardView, { backgroundColor: colors.base }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top Bar with Floating Theme Switcher */}
        <View style={styles.topBar}>
          <View style={styles.statusPill}>
            <View style={[styles.liveDot, { backgroundColor: colors.accentEmerald }]} />
            <Text style={[styles.statusText, { color: colors.textMuted }]}>Station Terminal Ready</Text>
          </View>
          <ThemeToggle />
        </View>

        {/* Header Branding */}
        <View style={styles.brandContainer}>
          <View
            style={[
              styles.logoBadge,
              {
                backgroundColor: colors.surface,
                borderColor: colors.accentSky,
              },
              colors.shadowRaised,
            ]}
          >
            <Text style={styles.logoIcon}>🔥</Text>
          </View>
          <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>
            Kitchen<Text style={{ color: colors.accentSky }}>Pulse</Text>
          </Text>
          <Text style={[styles.brandSubtitle, { color: colors.textMuted }]}>
            Commercial Kitchen Station & Supply Chain System
          </Text>
        </View>

        {/* Neumorphic Auth Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
            colors.shadowRaisedLg,
          ]}
        >
          {/* Mode Switcher */}
          <View style={[styles.tabContainer, { backgroundColor: colors.sunken, borderColor: colors.borderSubtle }]}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                mode === "login" && [
                  styles.activeTabButton,
                  { backgroundColor: colors.accentSky },
                  colors.shadowRaisedSm,
                ],
              ]}
              onPress={() => {
                setMode("login");
                setErrorMessage(null);
              }}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  { color: mode === "login" ? "#FFFFFF" : colors.textMuted },
                ]}
              >
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                mode === "signup" && [
                  styles.activeTabButton,
                  { backgroundColor: colors.accentSky },
                  colors.shadowRaisedSm,
                ],
              ]}
              onPress={() => {
                setMode("signup");
                setErrorMessage(null);
              }}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  { color: mode === "signup" ? "#FFFFFF" : colors.textMuted },
                ]}
              >
                Register
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error Alert */}
          {errorMessage && (
            <View style={[styles.errorBox, { backgroundColor: colors.accentRoseBg, borderColor: colors.accentRose }]}>
              <Text style={[styles.errorText, { color: colors.accentRose }]}>⚠️ {errorMessage}</Text>
            </View>
          )}

          {/* Sign Up Fields */}
          {mode === "signup" && (
            <>
              {/* Type Switcher */}
              <View style={styles.signupTypeRow}>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    { backgroundColor: colors.sunken, borderColor: colors.borderSubtle },
                    signupType === "new_org" && {
                      borderColor: colors.accentAmber,
                      backgroundColor: colors.accentAmberBg,
                    },
                  ]}
                  onPress={() => setSignupType("new_org")}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      { color: signupType === "new_org" ? colors.accentAmber : colors.textSecondary },
                    ]}
                  >
                    👑 New Hotel (Owner)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    { backgroundColor: colors.sunken, borderColor: colors.borderSubtle },
                    signupType === "join_org" && {
                      borderColor: colors.accentSky,
                      backgroundColor: colors.accentSkyBg,
                    },
                  ]}
                  onPress={() => setSignupType("join_org")}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      { color: signupType === "join_org" ? colors.accentSky : colors.textSecondary },
                    ]}
                  >
                    🛡️ Join Org (Staff)
                  </Text>
                </TouchableOpacity>
              </View>

              {signupType === "new_org" ? (
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Hotel / Restaurant Name</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.sunken,
                        borderColor: colors.accentAmber,
                        color: colors.textPrimary,
                      },
                    ]}
                    placeholder="e.g. Grand Palace Hotel"
                    placeholderTextColor={colors.textMuted}
                    value={orgName}
                    onChangeText={setOrgName}
                  />
                  <Text style={[styles.helperText, { color: colors.textMuted }]}>
                    You will be assigned the <Text style={{ color: colors.accentAmber, fontWeight: "bold" }}>Owner</Text> role with full administrative access.
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Select Client Organization</Text>
                    <View style={styles.orgPickerList}>
                      {organizations.map((o) => (
                        <TouchableOpacity
                          key={o.id}
                          style={[
                            styles.orgOption,
                            { backgroundColor: colors.sunken, borderColor: colors.borderSubtle },
                            selectedOrgId === o.id && {
                              borderColor: colors.accentSky,
                              backgroundColor: colors.accentSkyBg,
                            },
                          ]}
                          onPress={() => setSelectedOrgId(o.id)}
                        >
                          <Text
                            style={[
                              styles.orgOptionText,
                              {
                                color: selectedOrgId === o.id ? colors.accentSky : colors.textSecondary,
                                fontWeight: selectedOrgId === o.id ? "800" : "600",
                              },
                            ]}
                          >
                            🏨 {o.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Role</Text>
                    <View style={styles.rolePickerList}>
                      {["Admin", "Executive Chef", "Line Cook"].map((r) => (
                        <TouchableOpacity
                          key={r}
                          style={[
                            styles.roleOption,
                            { backgroundColor: colors.sunken, borderColor: colors.borderSubtle },
                            role === r && {
                              borderColor: colors.accentSky,
                              backgroundColor: colors.accentSkyBg,
                            },
                          ]}
                          onPress={() => setRole(r)}
                        >
                          <Text
                            style={[
                              styles.roleOptionText,
                              {
                                color: role === r ? colors.accentSky : colors.textSecondary,
                                fontWeight: role === r ? "800" : "600",
                              },
                            ]}
                          >
                            {r}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              )}

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.sunken,
                      borderColor: colors.borderSubtle,
                      color: colors.textPrimary,
                    },
                  ]}
                  placeholder="e.g. Gordon Ramsay"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </>
          )}

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Email Address</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.sunken,
                  borderColor: colors.borderSubtle,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="chef@kitchenpulse.io"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.sunken,
                  borderColor: colors.borderSubtle,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="••••••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: colors.accentSky,
                borderColor: "rgba(255, 255, 255, 0.25)",
              },
              colors.shadowRaised,
            ]}
            onPress={handleAuth}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {mode === "login" ? "Sign In to Terminal" : "Create Account"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Demo Logins Section */}
        <View
          style={[
            styles.demoSection,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
            colors.shadowRaised,
          ]}
        >
          <Text style={[styles.demoTitle, { color: colors.textMuted }]}>⚡ 1-TAP DEMO CLIENT LOGINS</Text>
          <View style={styles.demoGrid}>
            <TouchableOpacity
              style={[
                styles.demoBtn,
                { backgroundColor: colors.sunken, borderColor: colors.borderSubtle },
              ]}
              onPress={() => handleQuickDemo("owner@grandpalace.com")}
            >
              <Text style={[styles.demoBtnText, { color: colors.textPrimary }]}>👑 Grand Palace (Owner)</Text>
              <Text style={[styles.demoEmail, { color: colors.textMuted }]}>owner@grandpalace.com</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.demoBtn,
                { backgroundColor: colors.sunken, borderColor: colors.borderSubtle },
              ]}
              onPress={() => handleQuickDemo("admin@grandpalace.com")}
            >
              <Text style={[styles.demoBtnText, { color: colors.textPrimary }]}>🛡️ Grand Palace (Admin)</Text>
              <Text style={[styles.demoEmail, { color: colors.textMuted }]}>admin@grandpalace.com</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.demoBtn,
                { backgroundColor: colors.sunken, borderColor: colors.borderSubtle },
              ]}
              onPress={() => handleQuickDemo("owner@bellanapoli.com")}
            >
              <Text style={[styles.demoBtnText, { color: colors.textPrimary }]}>👑 Bella Napoli (Owner)</Text>
              <Text style={[styles.demoEmail, { color: colors.textMuted }]}>owner@bellanapoli.com</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.demoBtn,
                { backgroundColor: colors.sunken, borderColor: colors.borderSubtle },
              ]}
              onPress={() => handleQuickDemo("cook@grandpalace.com")}
            >
              <Text style={[styles.demoBtnText, { color: colors.textPrimary }]}>🍳 Line Cook (Kitchen Line)</Text>
              <Text style={[styles.demoEmail, { color: colors.textMuted }]}>cook@grandpalace.com</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 44 : 24,
    paddingBottom: 40,
    alignItems: "center",
  },
  topBar: {
    width: "100%",
    maxWidth: 440,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  logoIcon: {
    fontSize: 28,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
    maxWidth: 290,
    fontWeight: "500",
  },
  card: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 20,
  },
  tabContainer: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  activeTabButton: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: "800",
  },
  errorBox: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    fontWeight: "700",
  },
  signupTypeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  typeBtnText: {
    fontSize: 11,
    fontWeight: "800",
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: "600",
  },
  helperText: {
    fontSize: 10,
    marginTop: 4,
  },
  orgPickerList: {
    gap: 6,
  },
  orgOption: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  orgOptionText: {
    fontSize: 12,
  },
  rolePickerList: {
    flexDirection: "row",
    gap: 6,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  roleOptionText: {
    fontSize: 11,
  },
  submitButton: {
    borderWidth: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  demoSection: {
    width: "100%",
    maxWidth: 440,
    marginTop: 18,
    padding: 16,
    borderRadius: 22,
    borderWidth: 1.5,
  },
  demoTitle: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.6,
    textAlign: "center",
    marginBottom: 12,
  },
  demoGrid: {
    gap: 8,
  },
  demoBtn: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  demoBtnText: {
    fontSize: 12,
    fontWeight: "800",
  },
  demoEmail: {
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginTop: 2,
    fontWeight: "600",
  },
});
