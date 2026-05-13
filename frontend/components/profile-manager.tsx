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
import { translateFuelType, translateServiceMode, useI18n } from "../lib/i18n";
import type { FuelType, ServiceMode, VehicleProfile } from "../lib/types";
import { colors, radius, spacing, typography } from "../theme";

const FUEL_OPTIONS: FuelType[] = ["benzina", "diesel", "gpl", "metano", "gnl", "hvo"];
const SERVICE_OPTIONS: ServiceMode[] = ["self", "servito", "unknown"];

export function ProfileManager() {
  const { t, locale } = useI18n();
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
      setError(fetchError instanceof Error ? fetchError.message : loadProfilesError(locale));
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
      setError(fetchErrorMessage(createError, locale, "create"));
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
      setError(fetchErrorMessage(deleteError, locale, "delete"));
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.formPanel}>
        <Text style={styles.heading}>{t("vehicleProfiles")}</Text>
        <Text style={styles.subheading}>
          {t("profileManagerSubtitle")}
        </Text>

        <Field label={t("profileName")} value={name} onChangeText={setName} />
        <Field label={t("consumption")} value={consumption} onChangeText={setConsumption} />
        <Field label={t("tankCapacity")} value={tankCapacity} onChangeText={setTankCapacity} />

        <Text style={styles.label}>{t("fuelType")}</Text>
        <View style={styles.chipRow}>
          {FUEL_OPTIONS.map((option) => (
            <Chip key={option} label={translateFuelType(locale, option)} active={fuelType === option} onPress={() => setFuelType(option)} />
          ))}
        </View>

        <Text style={styles.label}>{t("preferredServiceMode")}</Text>
        <View style={styles.chipRow}>
          {SERVICE_OPTIONS.map((option) => (
            <Chip key={option} label={translateServiceMode(locale, option)} active={serviceMode === option} onPress={() => setServiceMode(option)} />
          ))}
        </View>

        <Pressable style={[styles.toggle, isDefault && styles.toggleActive]} onPress={() => setIsDefault((value) => !value)}>
          <Text style={[styles.toggleText, isDefault && styles.toggleTextActive]}>
            {isDefault ? t("willBecomeDefault") : t("createAsSecondaryProfile")}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.cta, (!name.trim() || submitting) && styles.ctaDisabled]}
          onPress={() => void handleCreate()}
          disabled={!name.trim() || submitting}
        >
          <Text style={styles.ctaText}>{submitting ? t("creating") : t("createVehicleProfile")}</Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.listPanel}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>{t("savedProfiles")}</Text>
          {loading ? <ActivityIndicator color={colors.primary} /> : null}
        </View>

        {profiles.length === 0 && !loading ? (
          <Text style={styles.empty}>{t("noSavedProfilesYet")}</Text>
        ) : null}

        <View style={styles.list}>
          {profiles.map((profile) => (
            <View key={profile.id} style={styles.profileCard}>
              <View style={styles.profileMeta}>
                <Text style={styles.profileName}>{profile.name}</Text>
                <Text style={styles.profileDetail}>
                  {translateFuelType(locale, profile.fuel_type)} · {translateServiceMode(locale, profile.preferred_service_mode)} · {profile.avg_consumption_l_per_100km} l/100km
                </Text>
              </View>
              <View style={styles.profileActions}>
                {profile.is_default ? <Text style={styles.defaultBadge}>{t("default")}</Text> : null}
                <Pressable style={styles.deleteButton} onPress={() => void handleDelete(profile.id)}>
                  <Text style={styles.deleteText}>{t("delete")}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function fetchErrorMessage(error: unknown, locale: "en" | "it", action: "create" | "delete") {
  if (error instanceof Error) {
    return error.message;
  }
  if (locale === "it") {
    return action === "create" ? "Impossibile creare il profilo" : "Impossibile eliminare il profilo";
  }
  return action === "create" ? "Unable to create profile" : "Unable to delete profile";
}

function loadProfilesError(locale: "en" | "it") {
  return locale === "it" ? "Impossibile caricare i profili" : "Unable to load profiles";
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
    backgroundColor: colors.dangerSurface,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  deleteText: {
    color: colors.danger,
    fontWeight: "700",
  },
});
