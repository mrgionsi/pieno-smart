import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { NearbyStationItem } from "../lib/types";

export function StationCard({
  station,
  selected = false,
  onHoverIn,
  onPressIn,
}: {
  station: NearbyStationItem;
  selected?: boolean;
  onHoverIn?: () => void;
  onPressIn?: () => void;
}) {
  const router = useRouter();

  return (
    <Pressable
      style={[styles.card, selected && styles.cardSelected]}
      onHoverIn={onHoverIn}
      onPressIn={onPressIn}
      onPress={() => router.push(`/stations/${station.id}`)}
    >
      <View style={styles.header}>
        <View style={styles.identity}>
          <Text style={styles.name}>{station.name ?? "Unnamed station"}</Text>
          <Text style={styles.meta}>
            {[station.brand, station.comune, station.provincia].filter(Boolean).join(" · ")}
          </Text>
        </View>
        <View style={styles.badges}>
          <Text style={styles.distance}>{Math.round(station.distance_meters)} m</Text>
          <Text style={styles.freshness}>{station.freshness_status}</Text>
        </View>
      </View>

      <Text style={styles.address}>{station.address ?? "No address available"}</Text>

      <View style={styles.priceRow}>
        <View>
          <Text style={styles.priceLabel}>
            {[station.selected_fuel_type, station.selected_service_mode].filter(Boolean).join(" · ") || "No price"}
          </Text>
          <Text style={styles.priceValue}>
            {station.current_price ? `€${station.current_price}` : "Price unavailable"}
          </Text>
        </View>
        {station.score !== null && station.score !== undefined ? (
          <View style={styles.scorePill}>
            <Text style={styles.scoreText}>{station.score.toFixed(1)}</Text>
          </View>
        ) : null}
      </View>

      {station.match_reasons.length > 0 ? (
        <View style={styles.reasons}>
          {station.match_reasons.map((reason) => (
            <Text key={reason} style={styles.reason}>
              {reason}
            </Text>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fffdf8",
    borderRadius: 22,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "#e8e0d0",
  },
  cardSelected: {
    borderColor: "#be522f",
    shadowColor: "#73301a",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  identity: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 17,
    fontWeight: "700",
    color: "#16241d",
  },
  meta: {
    fontSize: 12,
    color: "#53655b",
  },
  badges: {
    alignItems: "flex-end",
    gap: 6,
  },
  distance: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2a5a47",
  },
  freshness: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#8a5d21",
  },
  address: {
    color: "#3a463f",
    fontSize: 14,
    lineHeight: 20,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  priceLabel: {
    fontSize: 12,
    color: "#69746e",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f231c",
  },
  scorePill: {
    backgroundColor: "#163a2b",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  scoreText: {
    color: "#f9f6ec",
    fontSize: 16,
    fontWeight: "800",
  },
  reasons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reason: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#eef5ef",
    color: "#244634",
    fontSize: 12,
    overflow: "hidden",
  },
});
