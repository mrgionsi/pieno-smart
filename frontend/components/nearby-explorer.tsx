"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { searchNearby, getVehicleProfiles, getStationDetail } from "../lib/api";
import { reverseItalianPlace, searchItalianPlaces } from "../lib/places";
import type {
  FuelType,
  NearbySort,
  ServiceMode,
  VehicleProfile,
  NearbyStationItem,
  PlaceSuggestion,
  StationDetail,
} from "../lib/types";
import { colors, radius, spacing, typography } from "../theme";
import { NearbyMap } from "./nearby-map";
import { StationCard } from "./station-card";
import { StationDetailModal } from "./station-detail-modal";

const SORT_OPTIONS: NearbySort[] = ["distance", "price", "convenience"];
const FUEL_OPTIONS: FuelType[] = ["benzina", "diesel", "gpl", "metano", "gnl", "hvo"];
const SERVICE_OPTIONS: Array<ServiceMode | ""> = ["", "self", "servito"];

export function NearbyExplorer() {
  const [lat, setLat] = useState("41.0586");
  const [lon, setLon] = useState("14.3027");
  const [locationQuery, setLocationQuery] = useState("Recale, CE");
  const [selectedLocationLabel, setSelectedLocationLabel] = useState("Recale, CE");
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [locatingUser, setLocatingUser] = useState(false);
  const [currentUserLocation, setCurrentUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [radiusMeters, setRadiusMeters] = useState(5000);
  const [fuelType, setFuelType] = useState<FuelType>("benzina");
  const [serviceMode, setServiceMode] = useState<ServiceMode | "">("self");
  const [sort, setSort] = useState<NearbySort>("convenience");
  const [vehicleProfileId, setVehicleProfileId] = useState("");
  const [profiles, setProfiles] = useState<VehicleProfile[]>([]);
  const [results, setResults] = useState<NearbyStationItem[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [hoveredStationId, setHoveredStationId] = useState<number | null>(null);
  const [openedStationId, setOpenedStationId] = useState<number | null>(null);
  const [stationDetail, setStationDetail] = useState<StationDetail | null>(null);
  const [stationPreviewCache, setStationPreviewCache] = useState<Record<number, StationDetail | undefined>>({});
  const [stationDetailLoading, setStationDetailLoading] = useState(false);
  const [stationDetailError, setStationDetailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const { width } = useWindowDimensions();
  const searchRequestIdRef = useRef(0);
  const stationDetailRequestIdRef = useRef(0);

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
  const highlightedStationId = hoveredStationId ?? selectedStationId;
  const isWideLayout = width >= 1040;
  const isToolbarLayout = width >= 860;

  useEffect(() => {
    const normalizedQuery = locationQuery.trim();
    if (normalizedQuery.length < 2 || normalizedQuery === selectedLocationLabel) {
      setPlaceSuggestions([]);
      setSearchingPlaces(false);
      return;
    }

    let active = true;
    setSearchingPlaces(true);
    const timer = setTimeout(() => {
      void searchItalianPlaces(normalizedQuery)
        .then((results) => {
          if (!active) return;
          setPlaceSuggestions(results);
        })
        .catch(() => {
          if (!active) return;
          setPlaceSuggestions([]);
        })
        .finally(() => {
          if (!active) return;
          setSearchingPlaces(false);
        });
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [locationQuery, selectedLocationLabel]);

  async function runSearch(nextLocation?: { lat: string; lon: string; radiusMeters?: number }) {
    const effectiveLat = nextLocation?.lat ?? lat;
    const effectiveLon = nextLocation?.lon ?? lon;
    const effectiveRadiusMeters = nextLocation?.radiusMeters ?? radiusMeters;
    const requestId = ++searchRequestIdRef.current;

    setLoading(true);
    setError(null);
    try {
      const response = await searchNearby({
        lat: effectiveLat,
        lon: effectiveLon,
        radius_meters: effectiveRadiusMeters,
        fuel_type: vehicleProfileId ? undefined : fuelType,
        service_mode: vehicleProfileId || !serviceMode ? undefined : serviceMode,
        vehicle_profile_id: vehicleProfileId || undefined,
        sort,
        limit: 20,
      });
      if (requestId !== searchRequestIdRef.current) {
        return;
      }
      setResults(response.items);
      setStationPreviewCache((current) => {
        const next: Record<number, StationDetail | undefined> = {};
        for (const station of response.items) {
          if (current[station.id]) {
            next[station.id] = current[station.id];
          }
        }
        return next;
      });
      setSelectedStationId((current) => {
        if (current && response.items.some((station) => station.id === current)) {
          return current;
        }
        return null;
      });
    } catch (fetchError) {
      if (requestId !== searchRequestIdRef.current) {
        return;
      }
      setResults([]);
      setSelectedStationId(null);
      setError(fetchError instanceof Error ? fetchError.message : "Search failed");
    } finally {
      if (requestId === searchRequestIdRef.current) {
        setLoading(false);
      }
    }
  }

  async function ensureStationPreview(stationId: number) {
    if (stationPreviewCache[stationId]) {
      return;
    }
    try {
      const detail = await getStationDetail(stationId);
      setStationPreviewCache((current) => {
        if (current[stationId]) {
          return current;
        }
        return { ...current, [stationId]: detail };
      });
    } catch {
      setStationPreviewCache((current) => ({ ...current, [stationId]: undefined }));
    }
  }

  async function applyPlaceSuggestion(place: PlaceSuggestion) {
    const nextLat = String(place.latitude);
    const nextLon = String(place.longitude);
    setCurrentUserLocation(null);
    setLat(nextLat);
    setLon(nextLon);
    setLocationQuery(place.label);
    setSelectedLocationLabel(place.label);
    setPlaceSuggestions([]);
    await runSearch({ lat: nextLat, lon: nextLon });
  }

  async function handleViewportChange(viewport: {
    lat: number;
    lon: number;
    radiusMeters: number;
  }) {
    const nextLat = String(viewport.lat);
    const nextLon = String(viewport.lon);
    setLat(nextLat);
    setLon(nextLon);
    setRadiusMeters(viewport.radiusMeters);
    await runSearch({ lat: nextLat, lon: nextLon, radiusMeters: viewport.radiusMeters });
  }

  async function openStationDetails(stationId: number) {
    const requestId = ++stationDetailRequestIdRef.current;
    setOpenedStationId(stationId);
    setSelectedStationId(stationId);
    setStationDetailLoading(true);
    setStationDetailError(null);
    setStationDetail(null);
    try {
      const detail = await getStationDetail(stationId);
      if (stationDetailRequestIdRef.current === requestId) {
        setStationDetail(detail);
      }
    } catch (fetchError) {
      if (stationDetailRequestIdRef.current === requestId) {
        setStationDetailError(fetchError instanceof Error ? fetchError.message : "Unable to load station");
      }
    } finally {
      if (stationDetailRequestIdRef.current === requestId) {
        setStationDetailLoading(false);
      }
    }
  }

  async function resolveQueryAndSearch() {
    const normalizedQuery = locationQuery.trim();
    if (!normalizedQuery || normalizedQuery === selectedLocationLabel) {
      await runSearch();
      return;
    }

    setSearchingPlaces(true);
    setError(null);
    try {
      const suggestions = await searchItalianPlaces(normalizedQuery);
      if (!suggestions.length) {
        setError("Select a suggested place before refreshing the map.");
        return;
      }
      await applyPlaceSuggestion(suggestions[0]);
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : "Unable to resolve the typed location");
    } finally {
      setSearchingPlaces(false);
    }
  }

  async function useBrowserLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Geolocation is not available in this browser");
      return;
    }

    setLocatingUser(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLatitude = position.coords.latitude;
        const nextLongitude = position.coords.longitude;
        const nextLat = String(nextLatitude);
        const nextLon = String(nextLongitude);
        setCurrentUserLocation({ lat: nextLatitude, lon: nextLongitude });
        setLat(nextLat);
        setLon(nextLon);
        setPlaceSuggestions([]);
        void (async () => {
          try {
            const place = await reverseItalianPlace(nextLatitude, nextLongitude);
            const nextLabel = place?.label ?? "Current location";
            setLocationQuery(nextLabel);
            setSelectedLocationLabel(nextLabel);
          } catch {
            setLocationQuery("Current location");
            setSelectedLocationLabel("Current location");
          } finally {
            await runSearch({ lat: nextLat, lon: nextLon });
            setLocatingUser(false);
          }
        })();
      },
      (geoError) => {
        setLocatingUser(false);
        setError(geoError.message || "Unable to get your current location");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.controlsPanel}>
        <View style={[styles.controlsTopRow, isToolbarLayout && styles.controlsTopRowWide]}>
          <View style={[styles.locationFieldCompact, isToolbarLayout && styles.locationFieldCompactWide]}>
            <TextInput
              value={locationQuery}
              onChangeText={setLocationQuery}
              style={styles.input}
              placeholder="Search town"
              placeholderTextColor="#8b8f88"
            />
            {selectedLocationLabel ? (
              <Text style={styles.locationHint}>Area: {selectedLocationLabel}</Text>
            ) : null}
            {searchingPlaces ? <Text style={styles.searchingHint}>Searching places…</Text> : null}
            {placeSuggestions.length > 0 ? (
              <View style={styles.suggestionsPanel}>
                {placeSuggestions.map((place) => (
                  <Pressable
                    key={place.id}
                    style={styles.suggestionItem}
                    onPress={() => void applyPlaceSuggestion(place)}
                  >
                    <Text style={styles.suggestionLabel}>{place.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          <Pressable
            style={[styles.secondaryButton, locatingUser && styles.locationButtonDisabled]}
            onPress={() => void useBrowserLocation()}
            disabled={locatingUser}
          >
            <Text style={styles.secondaryButtonText}>{locatingUser ? "Locating…" : "My location"}</Text>
          </Pressable>

          <Pressable style={styles.primaryButton} onPress={() => void resolveQueryAndSearch()}>
            <Text style={styles.primaryButtonText}>Refresh</Text>
          </Pressable>
        </View>

        <View style={[styles.quickFiltersRow, isToolbarLayout && styles.quickFiltersRowWide]}>
          <CompactFilter label="Sort" wide={isToolbarLayout}>
            {SORT_OPTIONS.map((option) => (
              <Chip key={option} label={option} active={sort === option} onPress={() => setSort(option)} />
            ))}
          </CompactFilter>

          {!vehicleProfileId ? (
            <CompactFilter label="Fuel" wide={isToolbarLayout}>
              {FUEL_OPTIONS.map((option) => (
                <Chip key={option} label={option} active={fuelType === option} onPress={() => setFuelType(option)} />
              ))}
            </CompactFilter>
          ) : null}

          <Pressable
            style={styles.moreFiltersButton}
            onPress={() => setShowAdvancedFilters((value) => !value)}
          >
            <Text style={styles.moreFiltersButtonText}>
              {showAdvancedFilters ? "Hide filters" : "More filters"}
            </Text>
          </Pressable>
        </View>

        {showAdvancedFilters ? (
          <View style={styles.advancedFilters}>
            <FilterRow label="Vehicle profile">
              <Chip
                label="manual filters"
                active={!vehicleProfileId}
                stretch
                onPress={() => setVehicleProfileId("")}
              />
              {profiles.map((profile) => (
                <Chip
                  key={profile.id}
                  label={profile.name}
                  active={vehicleProfileId === profile.id}
                  stretch
                  onPress={() => setVehicleProfileId(profile.id)}
                />
              ))}
            </FilterRow>

            {vehicleProfileId && selectedProfile ? (
              <View style={styles.profileHint}>
                <Text style={styles.profileHintText}>
                  Using profile defaults: {selectedProfile.fuel_type} · {selectedProfile.preferred_service_mode}
                </Text>
              </View>
            ) : (
              <FilterRow label="Service mode">
                {SERVICE_OPTIONS.map((option) => (
                  <Chip
                    key={option || "any"}
                    label={option || "any"}
                    stretch
                    active={serviceMode === option}
                    onPress={() => setServiceMode(option)}
                  />
                ))}
              </FilterRow>
            )}

            {!vehicleProfileId ? (
              <Text style={styles.viewportHint}>Move or zoom the map to change the search area.</Text>
            ) : null}
          </View>
        ) : null}

        {canUseProfile ? null : (
          <Text style={styles.helper}>No saved profiles yet. You can still search anonymously with manual fuel filters.</Text>
        )}
      </View>

      <View style={styles.resultsPanel}>
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>Nearby stations</Text>
          {loading ? <ActivityIndicator color={colors.primary} /> : null}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {results.length === 0 && !loading && !error ? (
          <Text style={styles.empty}>Run a search to see nearby stations and convenience suggestions.</Text>
        ) : null}

        <View style={[styles.discoveryLayout, isWideLayout && styles.discoveryLayoutWide]}>
          <View style={[styles.mapPanel, isWideLayout && styles.mapPanelWide]}>
            <NearbyMap
              stations={results}
              selectedStationId={highlightedStationId}
              center={{ lat: Number(lat), lon: Number(lon) }}
              radiusMeters={radiusMeters}
              currentUserLocation={currentUserLocation}
              onSelectStation={setSelectedStationId}
              onOpenStation={(stationId) => void openStationDetails(stationId)}
              onHoverStation={setHoveredStationId}
              onEnsureStationPreview={(stationId) => void ensureStationPreview(stationId)}
              stationPreviews={stationPreviewCache}
              onViewportChange={(viewport) => void handleViewportChange(viewport)}
            />
          </View>

          <View style={[styles.listPanel, isWideLayout && styles.listPanelWide]}>
            <Text style={styles.listLabel}>Stations in the selected area</Text>
            <View style={styles.resultsList}>
              {results.map((station) => (
                <StationCard
                  key={station.id}
                  station={station}
                  selected={station.id === highlightedStationId}
                  onHoverIn={() => {
                    setHoveredStationId(station.id);
                    void ensureStationPreview(station.id);
                  }}
                  onHoverOut={() => setHoveredStationId(null)}
                  onPressIn={() => setSelectedStationId(station.id)}
                  onOpen={() => void openStationDetails(station.id)}
                />
              ))}
            </View>
          </View>
        </View>
      </View>

      <StationDetailModal
        visible={openedStationId !== null}
        detail={stationDetail}
        loading={stationDetailLoading}
        error={stationDetailError}
        onClose={() => {
          stationDetailRequestIdRef.current += 1;
          setOpenedStationId(null);
          setStationDetail(null);
          setStationDetailError(null);
          setStationDetailLoading(false);
        }}
      />
    </View>
  );
}

function Chip({
  label,
  active,
  stretch = false,
  onPress,
}: {
  label: string;
  active: boolean;
  stretch?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.chip, stretch && styles.chipStretch, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.filterRow}>
      <Text style={styles.filterRowLabel}>{label}</Text>
      <View style={styles.filterRowOptions}>{children}</View>
    </View>
  );
}

function CompactFilter({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <View style={[styles.compactFilter, wide && styles.compactFilterWide]}>
      <Text style={styles.compactFilterLabel}>{label}</Text>
      <View style={styles.compactFilterOptions}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingBottom: 28,
  },
  controlsPanel: {
    backgroundColor: colors.surface,
    borderRadius: radius.panel,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderWarm,
  },
  controlsTopRow: {
    gap: spacing.sm,
  },
  controlsTopRowWide: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  locationFieldCompact: {
    gap: spacing.xs,
    flex: 1,
  },
  locationFieldCompactWide: {
    minWidth: 320,
  },
  primaryButton: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: colors.inverseText,
    fontWeight: "800",
    fontSize: 13,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  inputRow: {
    width: "100%",
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
    paddingVertical: 11,
    backgroundColor: colors.surfaceWarm,
    width: "100%",
    fontSize: 14,
    color: colors.text,
  },
  locationHint: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "600",
  },
  searchingHint: {
    color: colors.textSoft,
    fontSize: 12,
  },
  viewportHint: {
    color: colors.textMuted,
    ...typography.caption,
  },
  suggestionsPanel: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.borderWarm,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  suggestionItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderWarm,
  },
  suggestionLabel: {
    color: colors.text,
    fontWeight: "600",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  quickFiltersRow: {
    gap: spacing.sm,
  },
  quickFiltersRowWide: {
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  compactFilter: {
    gap: 6,
  },
  compactFilterWide: {
    flex: 1,
    minWidth: 220,
  },
  compactFilterLabel: {
    color: colors.textMuted,
    ...typography.eyebrow,
  },
  compactFilterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  filterRow: {
    width: "100%",
    display: "flex" as never,
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 6,
  },
  filterRowLabel: {
    color: colors.textMuted,
    ...typography.eyebrow,
  },
  filterRowOptions: {
    width: "100%",
    display: "flex" as never,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
    justifyContent: "space-between",
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.chip,
    backgroundColor: colors.surfaceMuted,
  },
  chipStretch: {
    flexGrow: 1,
    flexBasis: 88,
    alignItems: "center",
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 11,
  },
  chipTextActive: {
    color: colors.inverseText,
  },
  profileHint: {
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.selection,
    borderWidth: 1,
    borderColor: colors.selectionBorder,
  },
  profileHintText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "600",
  },
  helper: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: 17,
  },
  advancedFilters: {
    gap: spacing.sm,
  },
  moreFiltersButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  moreFiltersButtonText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 12,
  },
  resultsPanel: {
    gap: 10,
  },
  discoveryLayout: {
    gap: 12,
  },
  discoveryLayoutWide: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  mapPanel: {
    gap: 12,
  },
  mapPanelWide: {
    flex: 0.7,
  },
  listPanel: {
    gap: 10,
  },
  listPanelWide: {
    flex: 0.3,
  },
  listLabel: {
    color: colors.textMuted,
    ...typography.eyebrow,
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultsTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
  empty: {
    color: colors.textMuted,
    fontSize: 12,
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 17,
  },
  resultsList: {
    gap: 10,
  },
});
