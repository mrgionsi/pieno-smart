import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { AppShell } from "../../components/shell";
import { getStationDetail } from "../../lib/api";
import type { StationDetail } from "../../lib/types";
import { colors, radius, spacing, typography } from "../../theme";

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
        {loading ? <ActivityIndicator color={colors.primary} /> : null}
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
    backgroundColor: colors.surfaceWarm,
    borderRadius: radius.panel,
    padding: spacing.lg,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.borderWarm,
  },
  name: {
    color: colors.text,
    ...typography.pageTitle,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  status: {
    color: colors.primary,
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
    borderTopColor: colors.borderWarm,
  },
  priceKey: {
    fontWeight: "700",
    color: colors.text,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textSoft,
  },
  priceValue: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.primaryDark,
  },
  error: {
    color: colors.danger,
  },
});
