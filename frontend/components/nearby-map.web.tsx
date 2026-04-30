import "maplibre-gl/dist/maplibre-gl.css";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import maplibre from "maplibre-gl";
import { StyleSheet, Text, View } from "react-native";

import type { FuelType, NearbyStationItem } from "../lib/types";

type NearbyMapProps = {
  stations: NearbyStationItem[];
  selectedStationId: number | null;
  center: { lat: number; lon: number };
  radiusMeters: number;
  currentUserLocation: { lat: number; lon: number } | null;
  onSelectStation: (stationId: number) => void;
  onOpenStation: (stationId: number) => void;
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
  onViewportChange,
}: NearbyMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const mapLoadedRef = useRef(false);
  const markersRef = useRef<Map<number, any>>(new Map());
  const currentLocationMarkerRef = useRef<any>(null);
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

  }, [stations, selectedStationId, onSelectStation]);

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
    gap: 10,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendText: {
    fontSize: 11,
    color: "#4b5c54",
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
    gap: 12,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#18261f",
  },
  subtitle: {
    marginTop: 4,
    color: "#5d6d65",
    fontSize: 12,
  },
  distanceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#fff4ea",
    color: "#8c4327",
    fontWeight: "700",
    fontSize: 12,
    overflow: "hidden",
  },
});
