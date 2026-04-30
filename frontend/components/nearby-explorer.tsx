"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [openedStationId, setOpenedStationId] = useState<number | null>(null);
  const [stationDetail, setStationDetail] = useState<StationDetail | null>(null);
  const [stationDetailLoading, setStationDetailLoading] = useState(false);
  const [stationDetailError, setStationDetailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { width } = useWindowDimensions();

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
  const isWideLayout = width >= 1040;

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
      setResults(response.items);
      setSelectedStationId((current) => {
        if (current && response.items.some((station) => station.id === current)) {
          return current;
        }
        return null;
      });
    } catch (fetchError) {
      setResults([]);
      setSelectedStationId(null);
      setError(fetchError instanceof Error ? fetchError.message : "Search failed");
    } finally {
      setLoading(false);
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
    setOpenedStationId(stationId);
    setSelectedStationId(stationId);
    setStationDetailLoading(true);
    setStationDetailError(null);
    setStationDetail(null);
    try {
      const detail = await getStationDetail(stationId);
      setStationDetail(detail);
    } catch (fetchError) {
      setStationDetailError(fetchError instanceof Error ? fetchError.message : "Unable to load station");
    } finally {
      setStationDetailLoading(false);
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
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Nearby search</Text>
        <Text style={styles.panelSubtitle}>
          Start from your current position or search for an Italian town, then refine the nearby fuel recommendations.
        </Text>

        <View style={styles.locationRow}>
          <Pressable
            style={[styles.locationButton, locatingUser && styles.locationButtonDisabled]}
            onPress={() => void useBrowserLocation()}
            disabled={locatingUser}
          >
            <Text style={styles.locationButtonText}>
              {locatingUser ? "Locating…" : "Use my location"}
            </Text>
          </Pressable>
          <View style={styles.locationField}>
            <Text style={styles.label}>Search town</Text>
            <TextInput
              value={locationQuery}
              onChangeText={setLocationQuery}
              style={styles.input}
              placeholder="Recale, CE"
              placeholderTextColor="#8b8f88"
            />
            {selectedLocationLabel ? (
              <Text style={styles.locationHint}>Searching around: {selectedLocationLabel}</Text>
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
        </View>

        <Text style={styles.viewportHint}>
          Move or zoom the map to change the search area.
        </Text>

        <FilterRow label="Sort">
          {SORT_OPTIONS.map((option) => (
            <Chip
              key={option}
              label={option}
              active={sort === option}
              stretch
              onPress={() => setSort(option)}
            />
          ))}
        </FilterRow>

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
          <>
            <FilterRow label="Fuel type">
              {FUEL_OPTIONS.map((option) => (
                <Chip
                  key={option}
                  label={option}
                  active={fuelType === option}
                  stretch
                  onPress={() => setFuelType(option)}
                />
              ))}
            </FilterRow>

            <FilterRow label="Service mode">
              {SERVICE_OPTIONS.map((option) => (
                <Chip
                  key={option || "any"}
                  label={option || "any"}
                  active={serviceMode === option}
                  stretch
                  onPress={() => setServiceMode(option)}
                />
              ))}
            </FilterRow>
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

        <View style={[styles.discoveryLayout, isWideLayout && styles.discoveryLayoutWide]}>
          <View style={[styles.mapPanel, isWideLayout && styles.mapPanelWide]}>
            <NearbyMap
              stations={results}
              selectedStationId={selectedStationId}
              center={{ lat: Number(lat), lon: Number(lon) }}
              radiusMeters={radiusMeters}
              currentUserLocation={currentUserLocation}
              onSelectStation={setSelectedStationId}
              onOpenStation={(stationId) => void openStationDetails(stationId)}
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
                  selected={station.id === selectedStationId}
                  onHoverIn={() => setSelectedStationId(station.id)}
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

const styles = StyleSheet.create({
  container: {
    gap: 12,
    paddingBottom: 28,
  },
  panel: {
    backgroundColor: "#fffdf8",
    borderRadius: 20,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "#e8dfcf",
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#15231c",
  },
  panelSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: "#57665f",
  },
  locationRow: {
    gap: 12,
  },
  locationButton: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#163a2b",
  },
  locationButtonDisabled: {
    opacity: 0.7,
  },
  locationButtonText: {
    color: "#fff8ee",
    fontWeight: "800",
    fontSize: 14,
  },
  locationField: {
    gap: 6,
  },
  inputRow: {
    width: "100%",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    color: "#55665d",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d8cebd",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: "#fffaf2",
    width: "100%",
    fontSize: 14,
  },
  locationHint: {
    color: "#1f5137",
    fontSize: 12,
    fontWeight: "600",
  },
  searchingHint: {
    color: "#6d6f65",
    fontSize: 12,
  },
  viewportHint: {
    color: "#51665b",
    fontSize: 12,
    lineHeight: 17,
  },
  suggestionsPanel: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#ded4c4",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#fffdf8",
  },
  suggestionItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ece4d7",
  },
  suggestionLabel: {
    color: "#20352c",
    fontWeight: "600",
  },
  chipRow: {
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
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    color: "#55665d",
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#efe9dc",
  },
  chipStretch: {
    flexGrow: 1,
    flexBasis: 88,
    alignItems: "center",
  },
  chipActive: {
    backgroundColor: "#163a2b",
  },
  chipText: {
    color: "#2c3f35",
    fontWeight: "600",
    fontSize: 12,
  },
  chipTextActive: {
    color: "#fff8ee",
  },
  profileHint: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: "#edf7ef",
  },
  profileHintText: {
    color: "#1f5137",
    fontSize: 12,
    fontWeight: "600",
  },
  cta: {
    marginTop: 6,
    backgroundColor: "#be522f",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  ctaText: {
    color: "#fffaf0",
    fontSize: 14,
    fontWeight: "800",
  },
  helper: {
    color: "#6d6f65",
    fontSize: 12,
    lineHeight: 17,
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
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    color: "#5a6a61",
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultsTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#19251f",
  },
  empty: {
    color: "#627168",
    fontSize: 12,
  },
  error: {
    color: "#9d2d22",
    fontSize: 12,
    lineHeight: 17,
  },
  resultsList: {
    gap: 10,
  },
});
