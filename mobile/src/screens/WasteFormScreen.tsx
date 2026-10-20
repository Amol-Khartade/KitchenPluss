// ============================================================
// KitchenPulse Mobile — End of Day Scrap & Waste Form
// Zod validation, tactile Neumorphic inputs, stepper buttons
// ============================================================

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { z } from "zod";
import { useRecipes } from "../hooks/useQueries";
import { useLogWaste } from "../hooks/useQueries";
import { useTheme } from "../store/useThemeStore";
import type { WasteFormEntry, Recipe } from "../types";

// ── Zod Schema ─────────────────────────────────────────────

const wasteEntrySchema = z.object({
  recipe_id: z.string().uuid("Invalid recipe ID"),
  recipe_name: z.string(),
  prepped_qty: z
    .number({ invalid_type_error: "Must be a number" })
    .int("Must be whole number")
    .nonnegative("Cannot be negative"),
  waste_qty: z
    .number({ invalid_type_error: "Must be a number" })
    .int("Must be whole number")
    .nonnegative("Cannot be negative"),
  notes: z.string().max(500, "Notes too long"),
});

const wasteFormSchema = z
  .array(wasteEntrySchema)
  .refine(
    (entries) =>
      entries.every((e) => e.waste_qty <= e.prepped_qty),
    "Waste quantity cannot exceed prepped quantity"
  );

// ── Component ──────────────────────────────────────────────

export default function WasteFormScreen() {
  const { data: recipes, isLoading: recipesLoading } = useRecipes();
  const logWaste = useLogWaste();
  const { colors } = useTheme();

  const [entries, setEntries] = useState<WasteFormEntry[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  // Initialise entries from recipes
  React.useEffect(() => {
    if (recipes && entries.length === 0) {
      setEntries(
        recipes.map((r: Recipe) => ({
          recipe_id: r.id,
          recipe_name: r.name,
          prepped_qty: 0,
          waste_qty: 0,
          notes: "",
        }))
      );
    }
  }, [recipes]);

  const updateEntry = (
    idx: number,
    field: keyof WasteFormEntry,
    value: string | number
  ) => {
    setEntries((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx]!, [field]: value };
      return next;
    });
    // Clear field error on change
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`${idx}.${field}`];
      return next;
    });
  };

  const handleAdjust = (idx: number, field: "prepped_qty" | "waste_qty", delta: number) => {
    const current = Number(entries[idx]?.[field]) || 0;
    const nextVal = Math.max(0, current + delta);
    updateEntry(idx, field, nextVal);
  };

  const handleSubmit = async () => {
    // Only submit entries with non-zero prepped qty
    const activeEntries = entries.filter((e) => e.prepped_qty > 0);

    if (activeEntries.length === 0) {
      Alert.alert("No entries", "Please fill in at least one recipe's prep quantity.");
      return;
    }

    // Zod validation
    const result = wasteFormSchema.safeParse(activeEntries);
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const key = err.path.join(".");
        newErrors[key] = err.message;
      });
      setErrors(newErrors);
      Alert.alert("Validation Error", result.error.errors[0]?.message ?? "Invalid input");
      return;
    }

    try {
      await logWaste.mutateAsync(activeEntries);
      setSubmitted(true);
      Alert.alert(
        "✅ Submitted",
        `${activeEntries.length} recipe shift entries logged successfully.`,
        [{ text: "OK", onPress: () => setSubmitted(false) }]
      );
    } catch (err) {
      Alert.alert("Error", String(err));
    }
  };

  if (recipesLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.base }]}>
        <ActivityIndicator size="large" color={colors.accentSky} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading menu items & recipes...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.base }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>📋 End of Shift Scrap Log</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        {new Date().toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </Text>

      {entries.map((entry, idx) => {
        const wasteRatio = entry.prepped_qty > 0 ? entry.waste_qty / entry.prepped_qty : 0;
        const isHighWaste = wasteRatio > 0.2;

        return (
          <View
            key={entry.recipe_id}
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: isHighWaste ? colors.accentRose : colors.border,
              },
              colors.shadowRaised,
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.recipeName, { color: colors.textPrimary }]}>{entry.recipe_name}</Text>
              {entry.prepped_qty > 0 && (
                <View
                  style={[
                    styles.wastePill,
                    {
                      backgroundColor: isHighWaste ? colors.accentRoseBg : colors.accentEmeraldBg,
                      borderColor: isHighWaste ? colors.accentRose : colors.accentEmerald,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.wastePercent,
                      { color: isHighWaste ? colors.accentRose : colors.accentEmerald },
                    ]}
                  >
                    Waste: {(wasteRatio * 100).toFixed(1)}% {isHighWaste ? "⚠️" : "✓"}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.row}>
              {/* Prepped Qty Field */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Prepped Portions</Text>
                <View style={[styles.stepperContainer, { backgroundColor: colors.sunken, borderColor: colors.borderSubtle }]}>
                  <TouchableOpacity
                    style={[styles.stepBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => handleAdjust(idx, "prepped_qty", -1)}
                  >
                    <Text style={[styles.stepBtnText, { color: colors.textPrimary }]}>−</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={[
                      styles.input,
                      { color: colors.textPrimary },
                      errors[`${idx}.prepped_qty`] ? { borderColor: colors.accentRose } : null,
                    ]}
                    value={entry.prepped_qty === 0 ? "" : String(entry.prepped_qty)}
                    onChangeText={(v) =>
                      updateEntry(idx, "prepped_qty", parseInt(v, 10) || 0)
                    }
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                  />
                  <TouchableOpacity
                    style={[styles.stepBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => handleAdjust(idx, "prepped_qty", 1)}
                  >
                    <Text style={[styles.stepBtnText, { color: colors.textPrimary }]}>+</Text>
                  </TouchableOpacity>
                </View>
                {errors[`${idx}.prepped_qty`] && (
                  <Text style={[styles.errorText, { color: colors.accentRose }]}>{errors[`${idx}.prepped_qty`]}</Text>
                )}
              </View>

              {/* Waste Qty Field */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Scrapped / Waste</Text>
                <View style={[styles.stepperContainer, { backgroundColor: colors.sunken, borderColor: colors.borderSubtle }]}>
                  <TouchableOpacity
                    style={[styles.stepBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => handleAdjust(idx, "waste_qty", -1)}
                  >
                    <Text style={[styles.stepBtnText, { color: colors.textPrimary }]}>−</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={[
                      styles.input,
                      { color: colors.textPrimary },
                      errors[`${idx}.waste_qty`] ? { borderColor: colors.accentRose } : null,
                    ]}
                    value={entry.waste_qty === 0 ? "" : String(entry.waste_qty)}
                    onChangeText={(v) =>
                      updateEntry(idx, "waste_qty", parseInt(v, 10) || 0)
                    }
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                  />
                  <TouchableOpacity
                    style={[styles.stepBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => handleAdjust(idx, "waste_qty", 1)}
                  >
                    <Text style={[styles.stepBtnText, { color: colors.textPrimary }]}>+</Text>
                  </TouchableOpacity>
                </View>
                {errors[`${idx}.waste_qty`] && (
                  <Text style={[styles.errorText, { color: colors.accentRose }]}>{errors[`${idx}.waste_qty`]}</Text>
                )}
              </View>
            </View>

            {/* Notes Inset Input */}
            <TextInput
              style={[
                styles.notesInput,
                {
                  backgroundColor: colors.sunken,
                  borderColor: colors.borderSubtle,
                  color: colors.textPrimary,
                },
              ]}
              value={entry.notes}
              onChangeText={(v) => updateEntry(idx, "notes", v)}
              placeholder="Shift notes (e.g. dropped on floor, overcooked, customer comp)..."
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={500}
            />
          </View>
        );
      })}

      {/* Submit Button */}
      <Pressable
        style={({ pressed }) => [
          styles.submitBtn,
          {
            opacity: pressed || logWaste.isPending ? 0.8 : 1,
            backgroundColor: submitted ? colors.accentEmerald : colors.accentSky,
            borderColor: "rgba(255, 255, 255, 0.3)",
          },
          colors.shadowRaisedLg,
        ]}
        onPress={handleSubmit}
        disabled={logWaste.isPending}
      >
        {logWaste.isPending ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitBtnText}>
            {submitted ? "✅ Log Submitted Successfully!" : "Submit Shift Scrap Log"}
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "700",
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 18,
    fontWeight: "500",
  },
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  recipeName: {
    fontSize: 16,
    fontWeight: "900",
    flex: 1,
  },
  wastePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  wastePercent: {
    fontSize: 11,
    fontWeight: "800",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  field: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    marginBottom: 6,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 3,
  },
  stepBtn: {
    width: 32,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBtnText: {
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 20,
  },
  input: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
    paddingVertical: 6,
  },
  errorText: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: "700",
  },
  notesInput: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 12,
    minHeight: 48,
  },
  submitBtn: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
});
