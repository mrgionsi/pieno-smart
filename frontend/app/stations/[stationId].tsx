import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { AppShell } from "../../components/shell";
import { getStationDetail } from "../../lib/api";
import type { StationDetail } from "../../lib/types";

export default function StationDetailScreen() {
  const { stationId } = useLocalSearchParams<{ stationId: string | string[] }>();
  const [detail, setDetail] = useState<StationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const resolvedStationId = Array.isArray(stationId) ? stationId[0] : stationId;
    if (!resolvedStationId) {
      setLoading(false);
      setDetail(null);
      setError("Missing station id");
      return;
    }
    setLoading(true);
    setError(null);
    void getStationDetail(resolvedStationId)
      .then((response) => setDetail(response))
      .catch((fetchError) => {
        setDetail(null);
        setError(fetchError instanceof Error ? fetchError.message : "Unable to load station");
      })
      .finally(() => setLoading(false));
  }, [stationId]);

  return (
    <AppShell
      title="Station detail"
      subtitle="See all current prices and freshness data before you decide where to stop."
    >
      <View style={styles.container}>
        {loading ? <ActivityIndicator color="#163a2b" /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {detail ? (
          <View style={styles.card}>
            <Text style={styles.name}>{detail.name ?? "Unnamed station"}</Text>
            <Text style={styles.meta}>
              {[detail.brand, detail.address, detail.comune, detail.provincia].filter(Boolean).join(" · ")}
            </Text>
            <Text style={styles.status}>Freshness: {detail.freshness_status}</Text>

            <View style={styles.priceList}>
              {detail.prices.map((price) => (
                <View key={`${price.fuel_type}-${price.service_mode}`} style={styles.priceRow}>
                  <View>
                    <Text style={styles.priceKey}>
                      {price.fuel_type} · {price.service_mode}
                    </Text>
                    <Text style={styles.timestamp}>{price.price_effective_at ?? "No timestamp"}</Text>
                  </View>
                  <Text style={styles.priceValue}>€{price.price}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 28,
  },
  card: {
    backgroundColor: "#fffdf8",
    borderRadius: 24,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "#e8dfcf",
  },
  name: {
    fontSize: 24,
    fontWeight: "800",
    color: "#15231c",
  },
  meta: {
    color: "#57665f",
    fontSize: 14,
    lineHeight: 20,
  },
  status: {
    color: "#2e5b48",
    fontWeight: "700",
  },
  priceList: {
    gap: 10,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#ece4d7",
  },
  priceKey: {
    fontWeight: "700",
    color: "#243730",
  },
  timestamp: {
    fontSize: 12,
    color: "#6f786f",
  },
  priceValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#12241c",
  },
  error: {
    color: "#9d2d22",
  },
});
