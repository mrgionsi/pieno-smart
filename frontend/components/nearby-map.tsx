import { StyleSheet, Text, View } from "react-native";

import type { NearbyStationItem } from "../lib/types";

export function NearbyMap({
  stations,
}: {
  stations: NearbyStationItem[];
  selectedStationId: number | null;
  center: { lat: number; lon: number };
  radiusMeters: number;
  onSelectStation: (stationId: number) => void;
}) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.title}>Map preview</Text>
      <Text style={styles.body}>
        Native map support will be added later. The web app currently uses a web-only MapLibre implementation.
      </Text>
      <Text style={styles.count}>{stations.length} stations in the selected area</Text>
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
