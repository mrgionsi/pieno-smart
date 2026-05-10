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
  const [showSortInfo, setShowSortInfo] = useState(false);
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
      setError(fetchError instanceof Error ? fetchError.message : "Search Failed");
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
        setStationDetailError(fetchError instanceof Error ? fetchError.message : "Unable To Load Station");
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
        setError("Select A Suggested Place Before Refreshing The Map.");
        return;
      }
      await applyPlaceSuggestion(suggestions[0]);
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : "Unable To Resolve The Typed Location");
    } finally {
      setSearchingPlaces(false);
    }
  }

  async function useBrowserLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Geolocation Is Not Available In This Browser");
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
        setError(geoError.message || "Unable To Get Your Current Location");
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
        <View style={[styles.controlsDesktopLayout, width >= 1180 && styles.controlsDesktopLayoutWide]}>
          <View style={[styles.controlsColumn, width >= 1180 && styles.controlsColumnWide]}>
            <View
              style={[
                styles.controlsTopRow,
                isToolbarLayout && styles.controlsTopRowWide,
              ]}
            >
              <View style={[styles.locationFieldCompact, isToolbarLayout && styles.locationFieldCompactWide]}>
                <View style={styles.locationInputRow}>
                  <Text style={styles.locationInputIcon}>⌕</Text>
                  <TextInput
                    value={locationQuery}
                    onChangeText={setLocationQuery}
                    style={styles.input}
                    placeholder="Search City Or Street"
                    placeholderTextColor="#8b8f88"
                  />
                </View>
                {selectedLocationLabel ? (
                  <Text style={styles.locationHint}>Area: {selectedLocationLabel}</Text>
                ) : null}
                <Text style={styles.searchHelper}>Example: Via Roma, Napoli</Text>
                {searchingPlaces ? <Text style={styles.searchingHint}>Searching Places…</Text> : null}
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
            </View>

            <View
              style={[
                styles.quickFiltersRow,
                width >= 1180 ? styles.quickFiltersRowColumn : isToolbarLayout && styles.quickFiltersRowWide,
              ]}
            >
          <View style={[styles.compactFilter, !(width >= 1180) && isToolbarLayout && styles.compactFilterWide]}>
            <View style={styles.compactFilterHeader}>
              <Text style={styles.compactFilterIcon}>⇅</Text>
              <Text style={styles.compactFilterLabel}>Sort</Text>
              <Pressable
                style={styles.sortInfoButton}
                onPress={() => setShowSortInfo((value) => !value)}
                accessibilityRole="button"
                accessibilityLabel="Explain Sort Options"
                accessibilityHint="Shows Or Hides An Explanation For Each Sort Mode"
                accessibilityState={{ expanded: showSortInfo }}
              >
                <Text style={styles.sortInfoButtonText}>ⓘ</Text>
              </Pressable>
            </View>
            <View style={styles.compactFilterOptions}>
              {SORT_OPTIONS.map((option) => (
                <Chip key={option} label={titleCase(option)} active={sort === option} onPress={() => setSort(option)} />
              ))}
            </View>
            {showSortInfo ? (
              <View style={styles.sortInfoPanel}>
                <Text style={styles.sortInfoLine}>
                  <Text style={styles.sortInfoTitle}>Distance:</Text> Shows The Nearest Stations First.
                </Text>
                <Text style={styles.sortInfoLine}>
                  <Text style={styles.sortInfoTitle}>Price:</Text> Shows The Lowest Matching Fuel Price First.
                </Text>
                <Text style={styles.sortInfoLine}>
                  <Text style={styles.sortInfoTitle}>Convenience:</Text> Prioritizes The Best Overall Choice Using Distance, Price, Freshness, And Practicality.
                </Text>
              </View>
            ) : null}
          </View>

          {!vehicleProfileId ? (
            <CompactFilter label="Fuel" icon="⛽" wide={!(width >= 1180) && isToolbarLayout}>
              {FUEL_OPTIONS.map((option) => (
                <Chip
                  key={option}
                  label={fuelOptionLabel(option)}
                  active={fuelType === option}
                  onPress={() => setFuelType(option)}
                />
              ))}
            </CompactFilter>
          ) : null}

          <Pressable
            style={styles.moreFiltersButton}
            onPress={() => setShowAdvancedFilters((value) => !value)}
          >
            <Text style={styles.moreFiltersButtonIcon}>{showAdvancedFilters ? "▴" : "▾"}</Text>
              <Text style={styles.moreFiltersButtonText}>
                {showAdvancedFilters ? "Hide Filters" : "More Filters"}
              </Text>
          </Pressable>
            </View>

            {showAdvancedFilters ? (
              <View style={styles.advancedFilters}>
            <FilterRow label="Vehicle profile" icon="◫">
              <Chip
                    label="Manual Filters"
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
              <FilterRow label="Service mode" icon="⚙">
                {SERVICE_OPTIONS.map((option) => (
                      <Chip
                        key={option || "any"}
                        label={option ? titleCase(option) : "Any"}
                        stretch
                        active={serviceMode === option}
                        onPress={() => setServiceMode(option)}
                  />
                ))}
              </FilterRow>
            )}

            {!vehicleProfileId ? (
                  <Text style={styles.viewportHint}>Move Or Zoom The Map To Change The Search Area.</Text>
            ) : null}
              </View>
            ) : null}

            <View style={[styles.actionsRow, width >= 1180 && styles.actionsRowWide]}>
          <Pressable
            style={[styles.secondaryButton, locatingUser && styles.locationButtonDisabled]}
            onPress={() => void useBrowserLocation()}
            disabled={locatingUser}
          >
            <Text style={styles.secondaryButtonIcon}>◎</Text>
            <Text style={styles.secondaryButtonText}>{locatingUser ? "Locating…" : "Use My Location"}</Text>
          </Pressable>

          <Pressable style={styles.primaryButton} onPress={() => void resolveQueryAndSearch()}>
            <Text style={styles.primaryButtonIcon}>↻</Text>
            <Text style={styles.primaryButtonText}>Search</Text>
          </Pressable>
            </View>
          </View>

          {width >= 1180 ? (
            <View style={styles.summaryPanel}>
              <Text style={styles.summaryEyebrow}>Search Summary</Text>
              <Text style={styles.summaryLine}>
                Area: <Text style={styles.summaryValue}>{selectedLocationLabel || "Not Selected"}</Text>
              </Text>
              <Text style={styles.summaryLine}>
                Sort: <Text style={styles.summaryValue}>{titleCase(sort)}</Text>
              </Text>
              <Text style={styles.summaryLine}>
                Fuel: <Text style={styles.summaryValue}>{vehicleProfileId ? titleCase(selectedProfile?.fuel_type ?? "profile") : titleCase(fuelType)}</Text>
              </Text>
              <Text style={styles.summaryLine}>
                Mode: <Text style={styles.summaryValue}>{vehicleProfileId ? titleCase(selectedProfile?.preferred_service_mode ?? "profile") : titleCase(serviceMode || "any")}</Text>
              </Text>
              <Text style={styles.summaryLine}>
                Results: <Text style={styles.summaryValue}>{results.length}</Text>
              </Text>
              <Text style={styles.summaryHint}>Use The Filters On The Left, Then Compare Results In The Map And List Below.</Text>
            </View>
          ) : null}
        </View>

        {/*       {canUseProfile ? null : (
          <Text style={styles.helper}>No saved profiles yet. You can still search anonymously with manual fuel filters.</Text>
        )} */}
      </View>

      <View style={styles.resultsPanel}>
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>Nearby Stations</Text>
          {loading ? <ActivityIndicator color={colors.primary} /> : null}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {results.length === 0 && !loading && !error ? (
          <Text style={styles.empty}>Run A Search To See Nearby Stations And Convenience Suggestions.</Text>
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
            <Text style={styles.listLabel}>Stations In The Selected Area</Text>
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
  icon,
  children,
}: {
  label: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.filterRow}>
      <View style={styles.filterRowHeader}>
        <Text style={styles.filterRowIcon}>{icon}</Text>
        <Text style={styles.filterRowLabel}>{label}</Text>
      </View>
      <View style={styles.filterRowOptions}>{children}</View>
    </View>
  );
}

function CompactFilter({
  label,
  icon,
  children,
  wide = false,
}: {
  label: string;
  icon: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <View style={[styles.compactFilter, wide && styles.compactFilterWide]}>
      <View style={styles.compactFilterHeader}>
        <Text style={styles.compactFilterIcon}>{icon}</Text>
        <Text style={styles.compactFilterLabel}>{label}</Text>
      </View>
      <View style={styles.compactFilterOptions}>{children}</View>
    </View>
  );
}

function fuelOptionLabel(fuelType: FuelType) {
  switch (fuelType) {
    case "benzina":
      return "⛽ Benzina";
    case "diesel":
      return "🛢 Diesel";
    case "gpl":
      return "🔥 Gpl";
    case "metano":
      return "🍃 Metano";
    case "gnl":
      return "💨 Gnl";
    case "hvo":
      return "🌿 Hvo";
    default:
      return titleCase(fuelType);
  }
}

function titleCase(value: string) {
  return value
    .split(" ")
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(" ");
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
  controlsDesktopLayout: {
    gap: spacing.sm,
  },
  controlsDesktopLayoutWide: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xl,
  },
  controlsColumn: {
    gap: spacing.sm,
  },
  controlsColumnWide: {
    width: "58%",
    maxWidth: 700,
  },
  controlsTopRow: {
    gap: spacing.sm,
  },
  controlsTopRowWide: {
    width: "100%",
  },
  locationFieldCompact: {
    gap: spacing.xs,
    flex: 1,
  },
  locationFieldCompactWide: {
    minWidth: 320,
    width: "100%",
  },
  locationInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    //backgroundColor: colors.surfaceWarm,
  },
  locationInputIcon: {
    color: colors.primary,
    fontSize: 17,
    lineHeight: 20,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
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
  primaryButtonIcon: {
    color: colors.inverseText,
    fontSize: 13,
    lineHeight: 14,
    fontWeight: "800",
  },
  secondaryButtonText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 13,
  },
  secondaryButtonIcon: {
    color: colors.primary,
    fontSize: 13,
    lineHeight: 14,
    fontWeight: "800",
  },
  inputRow: {
    width: "100%",
  },
  label: {
    color: colors.textMuted,
    ...typography.eyebrow,
  },
  input: {
    //borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 2,
    paddingVertical: 1,
    backgroundColor: "transparent",
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  locationHint: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "600",
    marginTop: spacing.xs,
  },
  searchingHint: {
    color: colors.textSoft,
    fontSize: 12,
  },
  searchHelper: {
    color: colors.textSoft,
    fontSize: 11,
    lineHeight: 15,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  actionsRowWide: {
    justifyContent: "flex-start",
  },
  summaryPanel: {
    flex: 1,
    minWidth: 240,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceWarm,
    gap: spacing.sm,
  },
  summaryEyebrow: {
    color: colors.primary,
    ...typography.eyebrow,
  },
  summaryLine: {
    color: colors.textMuted,
    ...typography.body,
  },
  summaryValue: {
    color: colors.text,
    fontWeight: "700",
  },
  summaryHint: {
    color: colors.secondary,
    fontSize: 12,
    lineHeight: 17,
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
  quickFiltersRowColumn: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: spacing.sm,
  },
  compactFilter: {
    gap: 6,
  },
  compactFilterWide: {
    flex: 1,
    minWidth: 220,
  },
  compactFilterHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  compactFilterIcon: {
    color: colors.primary,
    fontSize: 12,
    lineHeight: 14,
  },
  compactFilterLabel: {
    color: colors.textMuted,
    ...typography.eyebrow,
  },
  sortInfoButton: {
    marginLeft: "auto",
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  sortInfoButtonText: {
    color: colors.primary,
    fontSize: 11,
    lineHeight: 12,
    fontWeight: "700",
  },
  compactFilterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  sortInfoPanel: {
    gap: 6,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceWarm,
  },
  sortInfoLine: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  sortInfoTitle: {
    color: colors.text,
    fontWeight: "700",
  },
  filterRow: {
    width: "100%",
    display: "flex" as never,
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 6,
  },
  filterRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  filterRowIcon: {
    color: colors.primary,
    fontSize: 12,
    lineHeight: 14,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  moreFiltersButtonIcon: {
    color: colors.primary,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "700",
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
