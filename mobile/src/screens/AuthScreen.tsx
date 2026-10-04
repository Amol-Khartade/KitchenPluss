// ============================================================
// KitchenPulse Mobile — Authentication Screen
// Strict Auth Guard & Tenant Organization Selector
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
import { api } from "../api/client";
import { Organization } from "../types";

export default function AuthScreen() {
  const { login, register, isLoading } = useAuthStore();

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
      style={styles.keyboardView}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Branding */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>🔥</Text>
          </View>
          <Text style={styles.brandTitle}>
            Kitchen<Text style={styles.brandAccent}>Pulse</Text>
          </Text>
          <Text style={styles.brandSubtitle}>
            Commercial Kitchen Station & Supply Chain System
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Mode Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, mode === "login" && styles.activeTabButton]}
              onPress={() => {
                setMode("login");
                setErrorMessage(null);
              }}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  mode === "login" && styles.activeTabButtonText,
                ]}
              >
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, mode === "signup" && styles.activeTabButton]}
              onPress={() => {
                setMode("signup");
                setErrorMessage(null);
              }}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  mode === "signup" && styles.activeTabButtonText,
                ]}
              >
                Register
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error Message */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
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
                    signupType === "new_org" && styles.typeBtnActiveOwner,
                  ]}
                  onPress={() => setSignupType("new_org")}
                >
                  <Text style={styles.typeBtnText}>👑 New Hotel (Owner)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    signupType === "join_org" && styles.typeBtnActiveAdmin,
                  ]}
                  onPress={() => setSignupType("join_org")}
                >
                  <Text style={styles.typeBtnText}>🛡️ Join (Admin/Staff)</Text>
                </TouchableOpacity>
              </View>

              {signupType === "new_org" ? (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Hotel / Restaurant Name</Text>
                  <TextInput
                    style={[styles.input, styles.inputHighlight]}
                    placeholder="e.g. Grand Palace Hotel"
                    placeholderTextColor="#64748b"
                    value={orgName}
                    onChangeText={setOrgName}
                  />
                  <Text style={styles.helperText}>
                    You will be assigned the <Text style={{ color: "#f59e0b", fontWeight: "bold" }}>Owner</Text> role with full administrative access.
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Select Client Organization</Text>
                    <View style={styles.orgPickerList}>
                      {organizations.map((o) => (
                        <TouchableOpacity
                          key={o.id}
                          style={[
                            styles.orgOption,
                            selectedOrgId === o.id && styles.orgOptionSelected,
                          ]}
                          onPress={() => setSelectedOrgId(o.id)}
                        >
                          <Text
                            style={[
                              styles.orgOptionText,
                              selectedOrgId === o.id && styles.orgOptionTextSelected,
                            ]}
                          >
                            🏨 {o.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Role</Text>
                    <View style={styles.rolePickerList}>
                      {["Admin", "Executive Chef", "Line Cook"].map((r) => (
                        <TouchableOpacity
                          key={r}
                          style={[
                            styles.roleOption,
                            role === r && styles.roleOptionSelected,
                          ]}
                          onPress={() => setRole(r)}
                        >
                          <Text
                            style={[
                              styles.roleOptionText,
                              role === r && styles.roleOptionTextSelected,
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
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Marco Pierre White"
                  placeholderTextColor="#64748b"
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </>
          )}

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="chef@kitchenpulse.io"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••••••"
              placeholderTextColor="#64748b"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleAuth}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {mode === "login" ? "Sign In to Station" : "Create Account"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Demo Logins Section */}
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>⚡ 1-TAP DEMO CLIENT LOGINS</Text>
          <View style={styles.demoGrid}>
            <TouchableOpacity
              style={styles.demoBtn}
              onPress={() => handleQuickDemo("owner@grandpalace.com")}
            >
              <Text style={styles.demoBtnText}>👑 Grand Palace (Owner)</Text>
              <Text style={styles.demoEmail}>owner@grandpalace.com</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoBtn}
              onPress={() => handleQuickDemo("admin@grandpalace.com")}
            >
              <Text style={styles.demoBtnText}>🛡️ Grand Palace (Admin)</Text>
              <Text style={styles.demoEmail}>admin@grandpalace.com</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoBtn}
              onPress={() => handleQuickDemo("owner@bellanapoli.com")}
            >
              <Text style={styles.demoBtnText}>👑 Bella Napoli (Owner)</Text>
              <Text style={styles.demoEmail}>owner@bellanapoli.com</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoBtn}
              onPress={() => handleQuickDemo("cook@grandpalace.com")}
            >
              <Text style={styles.demoBtnText}>🍳 Line Cook (Cook)</Text>
              <Text style={styles.demoEmail}>cook@grandpalace.com</Text>
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
    backgroundColor: "#060910",
  },
  scrollContent: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 40,
    alignItems: "center",
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#38bdf8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoIcon: {
    fontSize: 28,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#f8fafc",
    letterSpacing: -0.5,
  },
  brandAccent: {
    color: "#38bdf8",
  },
  brandSubtitle: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 4,
    textAlign: "center",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#0d131f",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
    padding: 20,
    shadowColor: "#0284c7",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#060910",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: "#0284c7",
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94a3b8",
  },
  activeTabButtonText: {
    color: "#ffffff",
  },
  errorBox: {
    backgroundColor: "rgba(225, 29, 72, 0.15)",
    borderWidth: 1,
    borderColor: "#e11d48",
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  errorText: {
    color: "#fda4af",
    fontSize: 12,
  },
  signupTypeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    backgroundColor: "#111827",
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  typeBtnActiveOwner: {
    borderColor: "#f59e0b",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
  },
  typeBtnActiveAdmin: {
    borderColor: "#38bdf8",
    backgroundColor: "rgba(56, 189, 248, 0.15)",
  },
  typeBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#f8fafc",
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    color: "#cbd5e1",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#131b2e",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#f8fafc",
    fontSize: 13,
  },
  inputHighlight: {
    borderColor: "#f59e0b",
  },
  helperText: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 4,
  },
  orgPickerList: {
    gap: 6,
  },
  orgOption: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#111827",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  orgOptionSelected: {
    borderColor: "#38bdf8",
    backgroundColor: "rgba(56, 189, 248, 0.15)",
  },
  orgOptionText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "500",
  },
  orgOptionTextSelected: {
    color: "#38bdf8",
    fontWeight: "700",
  },
  rolePickerList: {
    flexDirection: "row",
    gap: 6,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 6,
    backgroundColor: "#111827",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1f2937",
    alignItems: "center",
  },
  roleOptionSelected: {
    borderColor: "#38bdf8",
    backgroundColor: "rgba(56, 189, 248, 0.15)",
  },
  roleOptionText: {
    color: "#94a3b8",
    fontSize: 11,
  },
  roleOptionTextSelected: {
    color: "#38bdf8",
    fontWeight: "700",
  },
  submitButton: {
    backgroundColor: "#0284c7",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#0284c7",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  demoSection: {
    width: "100%",
    maxWidth: 420,
    marginTop: 20,
    padding: 14,
    backgroundColor: "#0d131f",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  demoTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
    textAlign: "center",
    marginBottom: 10,
  },
  demoGrid: {
    gap: 6,
  },
  demoBtn: {
    padding: 8,
    backgroundColor: "#131b2e",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  demoBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#f8fafc",
  },
  demoEmail: {
    fontSize: 9,
    color: "#94a3b8",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginTop: 2,
  },
});
