"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { searchNearby, getVehicleProfiles } from "../lib/api";
import type { FuelType, NearbySort, ServiceMode, VehicleProfile, NearbyStationItem } from "../lib/types";
import { StationCard } from "./station-card";

const SORT_OPTIONS: NearbySort[] = ["distance", "price", "convenience"];
const FUEL_OPTIONS: FuelType[] = ["benzina", "diesel", "gpl", "metano", "gnl", "hvo"];
const SERVICE_OPTIONS: Array<ServiceMode | ""> = ["", "self", "servito"];

export function NearbyExplorer() {
  const [lat, setLat] = useState("41.0586");
  const [lon, setLon] = useState("14.3027");
  const [radius, setRadius] = useState("5000");
  const [fuelType, setFuelType] = useState<FuelType>("benzina");
  const [serviceMode, setServiceMode] = useState<ServiceMode | "">("self");
  const [sort, setSort] = useState<NearbySort>("convenience");
  const [vehicleProfileId, setVehicleProfileId] = useState("");
  const [profiles, setProfiles] = useState<VehicleProfile[]>([]);
  const [results, setResults] = useState<NearbyStationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getVehicleProfiles()
      .then((response) => {
        setProfiles(response.items);
        if (response.default_vehicle_profile_id) {
          setVehicleProfileId(response.default_vehicle_profile_id);
        }
      })
      .catch(() => {
        setProfiles([]);
      });
  }, []);

  const canUseProfile = profiles.length > 0;

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === vehicleProfileId) ?? null,
    [profiles, vehicleProfileId],
  );

  async function runSearch() {
    setLoading(true);
    setError(null);
    try {
      const response = await searchNearby({
        lat,
        lon,
        radius_meters: radius,
        fuel_type: vehicleProfileId ? undefined : fuelType,
        service_mode: vehicleProfileId || !serviceMode ? undefined : serviceMode,
        vehicle_profile_id: vehicleProfileId || undefined,
        sort,
        limit: 20,
      });
      setResults(response.items);
    } catch (fetchError) {
      setResults([]);
      setError(fetchError instanceof Error ? fetchError.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Nearby search</Text>
        <Text style={styles.panelSubtitle}>
          Start with explicit fuel filters, or use a saved vehicle profile to personalize convenience ranking.
        </Text>

        <View style={styles.inputRow}>
          <Field label="Latitude" value={lat} onChangeText={setLat} />
          <Field label="Longitude" value={lon} onChangeText={setLon} />
        </View>

        <View style={styles.inputRow}>
          <Field label="Radius (m)" value={radius} onChangeText={setRadius} />
        </View>

        <Text style={styles.label}>Sort</Text>
        <View style={styles.chipRow}>
          {SORT_OPTIONS.map((option) => (
            <Chip
              key={option}
              label={option}
              active={sort === option}
              onPress={() => setSort(option)}
            />
          ))}
        </View>

        <Text style={styles.label}>Vehicle profile</Text>
        <View style={styles.chipRow}>
          <Chip
            label="manual filters"
            active={!vehicleProfileId}
            onPress={() => setVehicleProfileId("")}
          />
          {profiles.map((profile) => (
            <Chip
              key={profile.id}
              label={profile.name}
              active={vehicleProfileId === profile.id}
              onPress={() => setVehicleProfileId(profile.id)}
            />
          ))}
        </View>

        {vehicleProfileId && selectedProfile ? (
          <View style={styles.profileHint}>
            <Text style={styles.profileHintText}>
              Using profile defaults: {selectedProfile.fuel_type} · {selectedProfile.preferred_service_mode}
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.label}>Fuel type</Text>
            <View style={styles.chipRow}>
              {FUEL_OPTIONS.map((option) => (
                <Chip
                  key={option}
                  label={option}
                  active={fuelType === option}
                  onPress={() => setFuelType(option)}
                />
              ))}
            </View>

            <Text style={styles.label}>Service mode</Text>
            <View style={styles.chipRow}>
              {SERVICE_OPTIONS.map((option) => (
                <Chip
                  key={option || "any"}
                  label={option || "any"}
                  active={serviceMode === option}
                  onPress={() => setServiceMode(option)}
                />
              ))}
            </View>
          </>
        )}

        <Pressable style={styles.cta} onPress={() => void runSearch()}>
          <Text style={styles.ctaText}>Search nearby stations</Text>
        </Pressable>

        {canUseProfile ? null : (
          <Text style={styles.helper}>No saved profiles yet. You can still search anonymously with manual fuel filters.</Text>
        )}
      </View>

      <View style={styles.resultsPanel}>
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>Results</Text>
          {loading ? <ActivityIndicator color="#163a2b" /> : null}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {results.length === 0 && !loading && !error ? (
          <Text style={styles.empty}>Run a search to see nearby stations and convenience suggestions.</Text>
        ) : null}

        <View style={styles.resultsList}>
          {results.map((station) => (
            <StationCard key={station.id} station={station} />
          ))}
        </View>
      </View>
    </ScrollView>
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
  panel: {
    backgroundColor: "#fffdf8",
    borderRadius: 24,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "#e8dfcf",
  },
  panelTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#15231c",
  },
  panelSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#57665f",
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  field: {
    flex: 1,
    minWidth: 140,
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
  profileHint: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#edf7ef",
  },
  profileHintText: {
    color: "#1f5137",
    fontSize: 13,
    fontWeight: "600",
  },
  cta: {
    marginTop: 6,
    backgroundColor: "#be522f",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  ctaText: {
    color: "#fffaf0",
    fontSize: 15,
    fontWeight: "800",
  },
  helper: {
    color: "#6d6f65",
    fontSize: 13,
    lineHeight: 18,
  },
  resultsPanel: {
    gap: 12,
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#19251f",
  },
  empty: {
    color: "#627168",
    fontSize: 14,
  },
  error: {
    color: "#9d2d22",
    fontSize: 13,
    lineHeight: 18,
  },
  resultsList: {
    gap: 12,
  },
});
