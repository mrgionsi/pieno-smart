import { StyleSheet, Text, View } from "react-native";

import { useI18n } from "../lib/i18n";
import type { NearbyStationItem, StationDetail } from "../lib/types";

export function NearbyMap({
  stations,
}: {
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
}) {
  const { t } = useI18n();

  return (
    <View style={styles.placeholder}>
      <Text style={styles.title}>{t("nativeMapPreview")}</Text>
      <Text style={styles.body}>
        {t("nativeMapPlaceholder")}
      </Text>
      <Text style={styles.count}>
        {stations.length} {t("stationsInAreaCount")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    minHeight: 320,
    borderRadius: 24,
    padding: 18,
    gap: 10,
    backgroundColor: "#edf3ef",
    borderWidth: 1,
    borderColor: "#d4dfd7",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#173528",
  },
  body: {
    color: "#51665b",
    lineHeight: 20,
  },
  count: {
    color: "#1f5137",
    fontWeight: "700",
  },
});
