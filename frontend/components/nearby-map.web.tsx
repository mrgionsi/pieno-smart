import "maplibre-gl/dist/maplibre-gl.css";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import maplibre from "maplibre-gl";
import { StyleSheet, Text, View } from "react-native";

import type { FuelType, NearbyStationItem, StationDetail } from "../lib/types";
import { colors, radius, spacing, typography } from "../theme";

type NearbyMapProps = {
  stations: NearbyStationItem[];
  selectedStationId: number | null;
  center: { lat: number; lon: number };
  radiusMeters: number;
  currentUserLocation: { lat: number; lon: number } | null;
  onSelectStation: (stationId: number) => void;
  onOpenStation: (stationId: number) => void;
  onHoverStation: (stationId: number | null) => void;
  onEnsureStationPreview: (stationId: number) => void;
  stationPreviews: Record<number, StationDetail | undefined>;
  onViewportChange: (viewport: { lat: number; lon: number; radiusMeters: number }) => void;
};

const RASTER_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
    },
  ],
} as const;

export function NearbyMap({
  stations,
  selectedStationId,
  center,
  radiusMeters,
  currentUserLocation,
  onSelectStation,
  onOpenStation,
  onHoverStation,
  onEnsureStationPreview,
  stationPreviews,
  onViewportChange,
}: NearbyMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const mapLoadedRef = useRef(false);
  const markersRef = useRef<Map<number, any>>(new Map());
  const currentLocationMarkerRef = useRef<any>(null);
  const popupRef = useRef<any>(null);
  const hoveredStationIdRef = useRef<number | null>(null);
  const suppressViewportEventRef = useRef(false);
  const lastViewportSignatureRef = useRef<string>("");
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    function emitViewportChange(map: any) {
      if (!mapLoadedRef.current) {
        return;
      }
      if (suppressViewportEventRef.current) {
        suppressViewportEventRef.current = false;
        return;
      }

      const mapCenter = map.getCenter();
      const bounds = map.getBounds();
      const nextRadius = viewportRadiusFromBounds(mapCenter.lat, mapCenter.lng, bounds);
      const signature = `${mapCenter.lat.toFixed(5)}:${mapCenter.lng.toFixed(5)}:${nextRadius}`;
      if (signature === lastViewportSignatureRef.current) {
        return;
      }
      lastViewportSignatureRef.current = signature;

      onViewportChange({
        lat: mapCenter.lat,
        lon: mapCenter.lng,
        radiusMeters: nextRadius,
      });
    }

    function setupMap() {
      if (!containerRef.current || mapRef.current) {
        return;
      }
      if (cancelled || !containerRef.current) {
        return;
      }

      const map = new maplibre.Map({
        container: containerRef.current,
        style: RASTER_STYLE as never,
        center: [center.lon, center.lat],
        zoom: zoomForRadius(radiusMeters, center.lat),
      });

      map.addControl(new maplibre.NavigationControl({ visualizePitch: true }), "top-right");
      map.on("load", () => {
        mapLoadedRef.current = true;
        setMapReady(true);
      });
      map.on("zoomend", () => emitViewportChange(map));
      map.on("dragend", () => emitViewportChange(map));

      mapRef.current = map;
    }

    setupMap();

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
      if (currentLocationMarkerRef.current) {
        currentLocationMarkerRef.current.remove();
        currentLocationMarkerRef.current = null;
      }
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
      lastViewportSignatureRef.current = "";
      if (mapRef.current) {
        mapLoadedRef.current = false;
        setMapReady(false);
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [center.lat, center.lon, radiusMeters]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) {
      return;
    }
    suppressViewportEventRef.current = true;
    map.easeTo({
      center: [center.lon, center.lat],
      zoom: zoomForRadius(radiusMeters, center.lat),
      duration: 500,
    });
  }, [center.lat, center.lon, radiusMeters]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) {
      return;
    }

    const nextIds = new Set(stations.map((station) => station.id));
    for (const [stationId, marker] of markersRef.current.entries()) {
      if (!nextIds.has(stationId)) {
        marker.remove();
        markersRef.current.delete(stationId);
      }
    }

    for (const station of stations) {
      const element = createMarkerElement(station, station.id === selectedStationId);
      element.onclick = () => {
        onSelectStation(station.id);
        onOpenStation(station.id);
      };
      element.onmouseenter = () => {
        hoveredStationIdRef.current = station.id;
        onHoverStation(station.id);
        onEnsureStationPreview(station.id);
        showStationPopup({
          map,
          popupRef,
          station,
          detail: stationPreviews[station.id],
        });
      };
      element.onmouseleave = () => {
        hoveredStationIdRef.current = null;
        onHoverStation(null);
        if (popupRef.current) {
          popupRef.current.remove();
          popupRef.current = null;
        }
      };

      const currentMarker = markersRef.current.get(station.id);
      if (currentMarker) {
        currentMarker.remove();
        const marker = new maplibre.Marker({ element, anchor: "bottom" })
          .setLngLat([station.longitude, station.latitude])
          .addTo(map);
        markersRef.current.set(station.id, marker);
      } else {
        const marker = new maplibre.Marker({ element, anchor: "bottom" })
          .setLngLat([station.longitude, station.latitude])
          .addTo(map);
        markersRef.current.set(station.id, marker);
      }
    }

  }, [
    stations,
    selectedStationId,
    onSelectStation,
    onOpenStation,
    onHoverStation,
    onEnsureStationPreview,
    stationPreviews,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) {
      return;
    }

    if (!currentUserLocation) {
      if (currentLocationMarkerRef.current) {
        currentLocationMarkerRef.current.remove();
        currentLocationMarkerRef.current = null;
      }
      return;
    }

    const element = createCurrentLocationElement();
    const marker = new maplibre.Marker({ element, anchor: "center" })
      .setLngLat([currentUserLocation.lon, currentUserLocation.lat])
      .addTo(map);

    if (currentLocationMarkerRef.current) {
      currentLocationMarkerRef.current.remove();
    }
    currentLocationMarkerRef.current = marker;
  }, [currentUserLocation, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const hoveredStationId = hoveredStationIdRef.current;
    if (!map || !hoveredStationId) {
      return;
    }
    const station = stations.find((item) => item.id === hoveredStationId);
    if (!station) {
      return;
    }
    showStationPopup({
      map,
      popupRef,
      station,
      detail: stationPreviews[hoveredStationId],
    });
  }, [stationPreviews, stations]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Map view</Text>
          <Text style={styles.subtitle}>
            {stations.length} station{stations.length === 1 ? "" : "s"} in the selected area
          </Text>
        </View>
        <Text style={styles.distanceBadge}>{Math.round(radiusMeters / 100) / 10} km range</Text>
      </View>
      <View style={styles.legend}>
        <LegendItem label="You" swatchStyle={styles.userLegendDot} />
        <LegendItem label="Benzina" swatchStyle={[styles.fuelLegendDot, { backgroundColor: "#c25a2a" }]} />
        <LegendItem label="Diesel" swatchStyle={[styles.fuelLegendDot, { backgroundColor: "#1f4b99" }]} />
        <LegendItem label="GPL" swatchStyle={[styles.fuelLegendDot, { backgroundColor: "#7c3aed" }]} />
        <LegendItem label="Metano" swatchStyle={[styles.fuelLegendDot, { backgroundColor: "#15803d" }]} />
        <LegendItem label="GNL" swatchStyle={[styles.fuelLegendDot, { backgroundColor: "#0f766e" }]} />
        <LegendItem label="HVO" swatchStyle={[styles.fuelLegendDot, { backgroundColor: "#3f7d20" }]} />
      </View>
      <div ref={containerRef} style={mapContainerStyle} />
    </View>
  );
}

function LegendItem({
  label,
  swatchStyle,
}: {
  label: string;
  swatchStyle: object;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={swatchStyle} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function zoomForRadius(radiusMeters: number, latitude: number) {
  const safeRadius = Math.max(radiusMeters, 500);
  const metersPerPixelAtZoom0 = 156543.03392 * Math.cos((latitude * Math.PI) / 180);
  const targetDiameterPixels = 420;
  const zoom = Math.log2((metersPerPixelAtZoom0 * targetDiameterPixels) / (safeRadius * 2));
  return Math.max(8, Math.min(16, zoom));
}

function viewportRadiusFromBounds(centerLat: number, centerLon: number, bounds: any) {
  const northEast = bounds.getNorthEast();
  const southWest = bounds.getSouthWest();
  const northWest = { lat: northEast.lat, lon: southWest.lng };
  const southEast = { lat: southWest.lat, lon: northEast.lng };

  const distances = [
    haversineMeters(centerLat, centerLon, northEast.lat, northEast.lng),
    haversineMeters(centerLat, centerLon, northWest.lat, northWest.lon),
    haversineMeters(centerLat, centerLon, southWest.lat, southWest.lng),
    haversineMeters(centerLat, centerLon, southEast.lat, southEast.lon),
  ];

  return Math.round(Math.max(...distances));
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

function createMarkerElement(station: NearbyStationItem, selected: boolean) {
  const fuelMeta = fuelMarkerMeta(station.selected_fuel_type);
  const element = document.createElement("button");
  element.type = "button";
  element.setAttribute("aria-label", station.name ?? "station marker");
  element.style.display = "flex";
  element.style.alignItems = "center";
  element.style.justifyContent = "center";
  element.style.minWidth = fuelMeta.long ? "44px" : "30px";
  element.style.height = selected ? "32px" : "28px";
  element.style.padding = fuelMeta.long ? "0 10px" : "0 8px";
  element.style.borderRadius = "999px";
  element.style.border = selected ? "3px solid #fff7ec" : "2px solid #fff7ec";
  element.style.background = selected ? "#be522f" : fuelMeta.background;
  element.style.color = "#fffaf2";
  element.style.fontSize = fuelMeta.long ? "10px" : "12px";
  element.style.fontWeight = "800";
  element.style.letterSpacing = "0.3px";
  element.style.boxShadow = selected ? "0 0 0 6px rgba(190, 82, 47, 0.2)" : "0 6px 14px rgba(14, 35, 28, 0.22)";
  element.style.cursor = "pointer";
  element.style.paddingTop = "0";
  element.style.paddingBottom = "0";
  element.textContent = fuelMeta.label;
  return element;
}

function createCurrentLocationElement() {
  const element = document.createElement("div");
  element.setAttribute("aria-label", "your position");
  element.style.width = "34px";
  element.style.height = "34px";
  element.style.borderRadius = "999px";
  element.style.background = "#2563eb";
  element.style.border = "3px solid #eff6ff";
  element.style.display = "flex";
  element.style.alignItems = "center";
  element.style.justifyContent = "center";
  element.style.boxShadow = "0 0 0 8px rgba(37, 99, 235, 0.18)";
  element.style.zIndex = "3";
  element.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="7" r="3.2" fill="#ffffff"></circle>
      <path d="M12 11.5c-2.9 0-5.2 2.35-5.2 5.25V19h10.4v-2.25c0-2.9-2.3-5.25-5.2-5.25Z" fill="#ffffff"></path>
    </svg>
  `;
  return element;
}

function showStationPopup({
  map,
  popupRef,
  station,
  detail,
}: {
  map: any;
  popupRef: React.MutableRefObject<any>;
  station: NearbyStationItem;
  detail: StationDetail | undefined;
}) {
  if (popupRef.current) {
    popupRef.current.remove();
  }

  const popupElement = document.createElement("div");
  popupElement.style.display = "flex";
  popupElement.style.flexDirection = "column";
  popupElement.style.gap = "5px";
  popupElement.style.minWidth = "180px";

  const title = document.createElement("div");
  title.style.fontWeight = "800";
  title.style.fontSize = "12px";
  title.style.color = "#173528";
  title.textContent = station.name ?? "Unnamed station";
  popupElement.appendChild(title);

  const priceGrid = document.createElement("div");
  priceGrid.style.display = "grid";
  priceGrid.style.gridTemplateColumns = "1fr auto";
  priceGrid.style.gap = "3px 8px";

  if (detail?.prices?.length) {
    detail.prices.forEach((price) => {
      const label = document.createElement("div");
      label.style.fontSize = "10px";
      label.style.color = "#4b5c54";
      label.textContent = `${shortFuelLabel(price.fuel_type)} · ${price.service_mode}`;

      const value = document.createElement("div");
      value.style.fontSize = "10px";
      value.style.fontWeight = "700";
      value.style.color = "#173528";
      value.textContent = `€${price.price}`;

      priceGrid.appendChild(label);
      priceGrid.appendChild(value);
    });
  } else {
    const loading = document.createElement("div");
    loading.style.fontSize = "10px";
    loading.style.color = "#6f786f";
    loading.textContent = "Loading prices…";
    priceGrid.appendChild(loading);
  }

  popupElement.appendChild(priceGrid);
  popupRef.current = new maplibre.Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 16,
  })
    .setLngLat([station.longitude, station.latitude])
    .setDOMContent(popupElement)
    .addTo(map);
}

function shortFuelLabel(fuelType: FuelType) {
  switch (fuelType) {
    case "benzina":
      return "Benzina";
    case "diesel":
      return "Diesel";
    case "gpl":
      return "GPL";
    case "metano":
      return "Metano";
    case "gnl":
      return "GNL";
    case "hvo":
      return "HVO";
    default:
      return fuelType;
  }
}

function fuelMarkerMeta(fuelType: FuelType | null) {
  switch (fuelType) {
    case "benzina":
      return { label: "⛽ B", background: "#c25a2a", long: false };
    case "diesel":
      return { label: "D", background: "#1f4b99", long: false };
    case "gpl":
      return { label: "🔥 GPL", background: "#7c3aed", long: true };
    case "metano":
      return { label: "🍃 M", background: "#15803d", long: false };
    case "gnl":
      return { label: "💨 GNL", background: "#0f766e", long: true };
    case "hvo":
      return { label: "🌿 HVO", background: "#3f7d20", long: true };
    default:
      return { label: "•", background: "#163a2b", long: false };
  }
}

const mapContainerStyle: CSSProperties = {
  width: "100%",
  minHeight: 460,
  borderRadius: 20,
  overflow: "hidden",
  border: "1px solid #e0d8ca",
};

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    alignItems: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendText: {
    color: colors.textMuted,
    ...typography.caption,
    fontWeight: "600",
  },
  userLegendDot: {
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: "#2563eb",
    borderWidth: 2,
    borderColor: "#eff6ff",
  },
  fuelLegendDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 4,
    color: colors.textMuted,
    ...typography.caption,
  },
  distanceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.chip,
    backgroundColor: colors.surfaceMuted,
    color: colors.primary,
    fontWeight: "700",
    fontSize: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
});
