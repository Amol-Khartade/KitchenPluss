// ============================================================
// KitchenPulse Mobile — End of Day Waste Form
// Zod validation, multi-recipe waste entries
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
} from "react-native";
import { z } from "zod";
import { useRecipes } from "../hooks/useQueries";
import { useLogWaste } from "../hooks/useQueries";
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
    "Waste cannot exceed prepped quantity"
  );

// ── Component ──────────────────────────────────────────────

export default function WasteFormScreen() {
  const { data: recipes, isLoading: recipesLoading } = useRecipes();
  const logWaste = useLogWaste();

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
        `${activeEntries.length} recipe entries logged successfully.`,
        [{ text: "OK", onPress: () => setSubmitted(false) }]
      );
    } catch (err) {
      Alert.alert("Error", String(err));
    }
  };

  if (recipesLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading recipes...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>📋 End of Day Waste Log</Text>
      <Text style={styles.subtitle}>
        {new Date().toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </Text>

      {entries.map((entry, idx) => (
        <View key={entry.recipe_id} style={styles.card}>
          <Text style={styles.recipeName}>{entry.recipe_name}</Text>

          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={styles.label}>Prepped Qty</Text>
              <TextInput
                style={[
                  styles.input,
                  errors[`${idx}.prepped_qty`] ? styles.inputError : null,
                ]}
                value={entry.prepped_qty === 0 ? "" : String(entry.prepped_qty)}
                onChangeText={(v) =>
                  updateEntry(idx, "prepped_qty", parseInt(v, 10) || 0)
                }
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#475569"
              />
              {errors[`${idx}.prepped_qty`] && (
                <Text style={styles.errorText}>{errors[`${idx}.prepped_qty`]}</Text>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Waste Qty</Text>
              <TextInput
                style={[
                  styles.input,
                  errors[`${idx}.waste_qty`] ? styles.inputError : null,
                ]}
                value={entry.waste_qty === 0 ? "" : String(entry.waste_qty)}
                onChangeText={(v) =>
                  updateEntry(idx, "waste_qty", parseInt(v, 10) || 0)
                }
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#475569"
              />
              {errors[`${idx}.waste_qty`] && (
                <Text style={styles.errorText}>{errors[`${idx}.waste_qty`]}</Text>
              )}
            </View>
          </View>

          {/* Waste % indicator */}
          {entry.prepped_qty > 0 && (
            <Text
              style={[
                styles.wastePercent,
                {
                  color:
                    entry.waste_qty / entry.prepped_qty > 0.2
                      ? "#EF4444"
                      : "#10B981",
                },
              ]}
            >
              Waste:{" "}
              {((entry.waste_qty / entry.prepped_qty) * 100).toFixed(1)}%
              {entry.waste_qty / entry.prepped_qty > 0.2 ? " ⚠️" : " ✓"}
            </Text>
          )}

          <TextInput
            style={styles.notesInput}
            value={entry.notes}
            onChangeText={(v) => updateEntry(idx, "notes", v)}
            placeholder="Notes (optional)"
            placeholderTextColor="#475569"
            multiline
            maxLength={500}
          />
        </View>
      ))}

      <Pressable
        style={({ pressed }) => [
          styles.submitBtn,
          {
            opacity: pressed || logWaste.isPending ? 0.75 : 1,
            backgroundColor: submitted ? "#10B981" : "#3B82F6",
          },
        ]}
        onPress={handleSubmit}
        disabled={logWaste.isPending}
      >
        {logWaste.isPending ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitBtnText}>
            {submitted ? "✅ Submitted!" : "Submit End of Day Log"}
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F172A",
    gap: 12,
  },
  loadingText: {
    color: "#94A3B8",
    fontSize: 14,
  },
  title: {
    color: "#F1F5F9",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 14,
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  recipeName: {
    color: "#F1F5F9",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  field: {
    flex: 1,
  },
  label: {
    color: "#94A3B8",
    fontSize: 12,
    marginBottom: 6,
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#F1F5F9",
    fontSize: 16,
    fontWeight: "600",
  },
  inputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 11,
    marginTop: 4,
  },
  wastePercent: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
  },
  notesInput: {
    marginTop: 10,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#94A3B8",
    fontSize: 13,
    minHeight: 56,
  },
  submitBtn: {
    marginTop: 24,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
