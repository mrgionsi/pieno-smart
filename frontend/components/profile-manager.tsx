"use client";

import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { createVehicleProfile, deleteVehicleProfile, getVehicleProfiles } from "../lib/api";
import type { FuelType, ServiceMode, VehicleProfile } from "../lib/types";
import { colors, radius, spacing, typography } from "../theme";

const FUEL_OPTIONS: FuelType[] = ["benzina", "diesel", "gpl", "metano", "gnl", "hvo"];
const SERVICE_OPTIONS: ServiceMode[] = ["self", "servito", "unknown"];

export function ProfileManager() {
  const [profiles, setProfiles] = useState<VehicleProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [consumption, setConsumption] = useState("5.40");
  const [tankCapacity, setTankCapacity] = useState("45.00");
  const [fuelType, setFuelType] = useState<FuelType>("diesel");
  const [serviceMode, setServiceMode] = useState<ServiceMode>("self");
  const [isDefault, setIsDefault] = useState(false);

  async function loadProfiles() {
    setLoading(true);
    setError(null);
    try {
      const response = await getVehicleProfiles();
      setProfiles(response.items);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load profiles");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfiles();
  }, []);

  async function handleCreate() {
    setSubmitting(true);
    setError(null);
    try {
      await createVehicleProfile({
        name,
        fuel_type: fuelType,
        avg_consumption_l_per_100km: consumption,
        tank_capacity_liters: tankCapacity || undefined,
        preferred_service_mode: serviceMode,
        preferred_brands: [],
        excluded_brands: [],
        is_default: isDefault,
      });
      setName("");
      setConsumption("5.40");
      setTankCapacity("45.00");
      setFuelType("diesel");
      setServiceMode("self");
      setIsDefault(false);
      await loadProfiles();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create profile");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(profileId: string) {
    setError(null);
    try {
      await deleteVehicleProfile(profileId);
      await loadProfiles();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete profile");
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.formPanel}>
        <Text style={styles.heading}>Vehicle profiles</Text>
        <Text style={styles.subheading}>
          These profiles personalize recommendation defaults for fuel and service mode.
        </Text>

        <Field label="Profile name" value={name} onChangeText={setName} />
        <Field label="Consumption (l/100km)" value={consumption} onChangeText={setConsumption} />
        <Field label="Tank capacity (liters)" value={tankCapacity} onChangeText={setTankCapacity} />

        <Text style={styles.label}>Fuel type</Text>
        <View style={styles.chipRow}>
          {FUEL_OPTIONS.map((option) => (
            <Chip key={option} label={option} active={fuelType === option} onPress={() => setFuelType(option)} />
          ))}
        </View>

        <Text style={styles.label}>Preferred service mode</Text>
        <View style={styles.chipRow}>
          {SERVICE_OPTIONS.map((option) => (
            <Chip key={option} label={option} active={serviceMode === option} onPress={() => setServiceMode(option)} />
          ))}
        </View>

        <Pressable style={[styles.toggle, isDefault && styles.toggleActive]} onPress={() => setIsDefault((value) => !value)}>
          <Text style={[styles.toggleText, isDefault && styles.toggleTextActive]}>
            {isDefault ? "Will become default" : "Create as secondary profile"}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.cta, (!name.trim() || submitting) && styles.ctaDisabled]}
          onPress={() => void handleCreate()}
          disabled={!name.trim() || submitting}
        >
          <Text style={styles.ctaText}>{submitting ? "Creating…" : "Create vehicle profile"}</Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.listPanel}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Saved profiles</Text>
          {loading ? <ActivityIndicator color="#163a2b" /> : null}
        </View>

        {profiles.length === 0 && !loading ? (
          <Text style={styles.empty}>No saved profiles yet.</Text>
        ) : null}

        <View style={styles.list}>
          {profiles.map((profile) => (
            <View key={profile.id} style={styles.profileCard}>
              <View style={styles.profileMeta}>
                <Text style={styles.profileName}>{profile.name}</Text>
                <Text style={styles.profileDetail}>
                  {profile.fuel_type} · {profile.preferred_service_mode} · {profile.avg_consumption_l_per_100km} l/100km
                </Text>
              </View>
              <View style={styles.profileActions}>
                {profile.is_default ? <Text style={styles.defaultBadge}>default</Text> : null}
                <Pressable style={styles.deleteButton} onPress={() => void handleDelete(profile.id)}>
                  <Text style={styles.deleteText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} style={styles.input} />
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    paddingBottom: 28,
  },
  formPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.panel,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderWarm,
  },
  heading: {
    color: colors.text,
    ...typography.sectionTitle,
  },
  subheading: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  field: {
    gap: 6,
  },
  label: {
    color: colors.textMuted,
    ...typography.eyebrow,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.surfaceWarm,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.chip,
    backgroundColor: colors.surfaceMuted,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    color: colors.text,
    fontWeight: "600",
  },
  chipTextActive: {
    color: colors.inverseText,
  },
  toggle: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleActive: {
    backgroundColor: colors.selection,
    borderColor: colors.selectionBorder,
  },
  toggleText: {
    color: colors.text,
    fontWeight: "700",
  },
  toggleTextActive: {
    color: colors.accent,
  },
  cta: {
    marginTop: 6,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: "center",
  },
  ctaDisabled: {
    opacity: 0.55,
  },
  ctaText: {
    color: colors.inverseText,
    fontSize: 15,
    fontWeight: "800",
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  listPanel: {
    gap: spacing.md,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  empty: {
    color: colors.textMuted,
    fontSize: 14,
  },
  list: {
    gap: spacing.md,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.panel,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderWarm,
    gap: 10,
  },
  profileMeta: {
    gap: 4,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  profileDetail: {
    color: colors.textMuted,
    fontSize: 13,
  },
  profileActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  defaultBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.chip,
    backgroundColor: colors.primary,
    color: colors.inverseText,
    overflow: "hidden",
    fontSize: 12,
    fontWeight: "700",
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: "#F8ECE9",
    borderWidth: 1,
    borderColor: "#E8C9C0",
  },
  deleteText: {
    color: colors.danger,
    fontWeight: "700",
  },
});
