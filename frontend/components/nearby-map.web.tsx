import "maplibre-gl/dist/maplibre-gl.css";

import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";
import maplibre from "maplibre-gl";
import { StyleSheet, Text, View } from "react-native";

import type { NearbyStationItem } from "../lib/types";

type NearbyMapProps = {
  stations: NearbyStationItem[];
  selectedStationId: number | null;
  center: { lat: number; lon: number };
  radiusMeters: number;
  onSelectStation: (stationId: number) => void;
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
  onSelectStation,
}: NearbyMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const mapLoadedRef = useRef(false);
  const markersRef = useRef<Map<number, any>>(new Map());

  useEffect(() => {
    let cancelled = false;

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
        zoom: 12.5,
      });

      map.addControl(new maplibre.NavigationControl({ visualizePitch: true }), "top-right");
      map.on("load", () => {
        mapLoadedRef.current = true;
        syncSearchArea(map, center, radiusMeters);
      });

      mapRef.current = map;
    }

    setupMap();

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
      if (mapRef.current) {
        mapLoadedRef.current = false;
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [center.lat, center.lon, radiusMeters]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) {
      return;
    }
    syncSearchArea(map, center, radiusMeters);
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
      element.onclick = () => onSelectStation(station.id);

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

    if (stations.length === 1) {
      map.easeTo({
        center: [stations[0].longitude, stations[0].latitude],
        zoom: 14,
        duration: 600,
      });
      return;
    }

    if (stations.length > 1) {
      const bounds = stations.reduce(
        (acc, station) =>
          acc.extend([station.longitude, station.latitude] as [number, number]),
        new maplibre.LngLatBounds([center.lon, center.lat], [center.lon, center.lat]),
      );
      map.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 700 });
    } else {
      map.easeTo({ center: [center.lon, center.lat], zoom: 12.5, duration: 600 });
    }
  }, [stations, selectedStationId, center.lat, center.lon, onSelectStation]);

  useEffect(() => {
    const map = mapRef.current;
    const selectedStation = stations.find((station) => station.id === selectedStationId);
    if (!map || !mapLoadedRef.current || !selectedStation) {
      return;
    }
    map.easeTo({
      center: [selectedStation.longitude, selectedStation.latitude],
      zoom: Math.max(map.getZoom(), 13.5),
      duration: 500,
    });
  }, [selectedStationId, stations]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Map view</Text>
          <Text style={styles.subtitle}>
            {stations.length} station{stations.length === 1 ? "" : "s"} in the selected area
          </Text>
        </View>
        <Text style={styles.radiusBadge}>{Math.round(radiusMeters / 100) / 10} km radius</Text>
      </View>
      <div ref={containerRef} style={mapContainerStyle} />
    </View>
  );
}

function syncSearchArea(map: any, center: { lat: number; lon: number }, radiusMeters: number) {
  const searchArea = createCircleFeature(center.lat, center.lon, radiusMeters);

  if (!map.getSource("search-area")) {
    map.addSource("search-area", {
      type: "geojson",
      data: searchArea,
    });
    map.addLayer({
      id: "search-area-fill",
      type: "fill",
      source: "search-area",
      paint: {
        "fill-color": "#be522f",
        "fill-opacity": 0.1,
      },
    });
    map.addLayer({
      id: "search-area-line",
      type: "line",
      source: "search-area",
      paint: {
        "line-color": "#be522f",
        "line-width": 2,
        "line-dasharray": [2, 2],
      },
    });
  } else {
    map.getSource("search-area").setData(searchArea);
  }
}

function createCircleFeature(lat: number, lon: number, radiusMeters: number) {
  const coordinates: [number, number][] = [];
  const earthRadiusMeters = 6378137;

  for (let index = 0; index <= 64; index += 1) {
    const angle = (index / 64) * Math.PI * 2;
    const deltaLat = (radiusMeters / earthRadiusMeters) * (180 / Math.PI) * Math.sin(angle);
    const deltaLon =
      ((radiusMeters / earthRadiusMeters) * (180 / Math.PI) * Math.cos(angle)) /
      Math.cos((lat * Math.PI) / 180);
    coordinates.push([lon + deltaLon, lat + deltaLat]);
  }

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [coordinates],
    },
    properties: {},
  };
}

function createMarkerElement(station: NearbyStationItem, selected: boolean) {
  const element = document.createElement("button");
  element.type = "button";
  element.setAttribute("aria-label", station.name ?? "station marker");
  element.style.width = selected ? "22px" : "18px";
  element.style.height = selected ? "22px" : "18px";
  element.style.borderRadius = "999px";
  element.style.border = selected ? "3px solid #fff7ec" : "2px solid #fff7ec";
  element.style.background = selected ? "#be522f" : "#163a2b";
  element.style.boxShadow = selected ? "0 0 0 6px rgba(190, 82, 47, 0.2)" : "0 6px 14px rgba(14, 35, 28, 0.22)";
  element.style.cursor = "pointer";
  element.style.padding = "0";
  return element;
}

const mapContainerStyle: CSSProperties = {
  width: "100%",
  minHeight: 360,
  borderRadius: 24,
  overflow: "hidden",
  border: "1px solid #e0d8ca",
};

const styles = StyleSheet.create({
  wrapper: {
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#18261f",
  },
  subtitle: {
    marginTop: 4,
    color: "#5d6d65",
    fontSize: 14,
  },
  radiusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#fff4ea",
    color: "#8c4327",
    fontWeight: "700",
    overflow: "hidden",
  },
});
