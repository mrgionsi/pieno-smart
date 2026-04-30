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
    gap: 16,
    paddingBottom: 28,
  },
  formPanel: {
    backgroundColor: "#fffdf8",
    borderRadius: 24,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "#e8dfcf",
  },
  heading: {
    fontSize: 22,
    fontWeight: "800",
    color: "#15231c",
  },
  subheading: {
    color: "#57665f",
    fontSize: 14,
    lineHeight: 20,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#55665d",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d8cebd",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fffaf2",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#efe9dc",
  },
  chipActive: {
    backgroundColor: "#163a2b",
  },
  chipText: {
    color: "#2c3f35",
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#fff8ee",
  },
  toggle: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#f0e7d8",
  },
  toggleActive: {
    backgroundColor: "#e6f2e8",
  },
  toggleText: {
    color: "#573f2a",
    fontWeight: "700",
  },
  toggleTextActive: {
    color: "#205035",
  },
  cta: {
    marginTop: 6,
    backgroundColor: "#be522f",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  ctaDisabled: {
    opacity: 0.55,
  },
  ctaText: {
    color: "#fffaf0",
    fontSize: 15,
    fontWeight: "800",
  },
  error: {
    color: "#9d2d22",
    fontSize: 13,
    lineHeight: 18,
  },
  listPanel: {
    gap: 12,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  listTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#19251f",
  },
  empty: {
    color: "#627168",
    fontSize: 14,
  },
  list: {
    gap: 12,
  },
  profileCard: {
    backgroundColor: "#fffdf8",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e8dfcf",
    gap: 10,
  },
  profileMeta: {
    gap: 4,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#15231c",
  },
  profileDetail: {
    color: "#56665e",
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
    borderRadius: 999,
    backgroundColor: "#163a2b",
    color: "#fff6ec",
    overflow: "hidden",
    fontSize: 12,
    fontWeight: "700",
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#fbe8e1",
  },
  deleteText: {
    color: "#a53620",
    fontWeight: "700",
  },
});
