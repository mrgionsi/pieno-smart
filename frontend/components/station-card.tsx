import { Pressable, StyleSheet, Text, View } from "react-native";

import { translateFreshness, translateFuelType, translateServiceMode, useI18n } from "../lib/i18n";
import type { NearbyStationItem } from "../lib/types";
import { colors, elevation, radius, spacing, typography } from "../theme";

export function StationCard({
  station,
  selected = false,
  onHoverIn,
  onHoverOut,
  onPressIn,
  onOpen,
}: {
  station: NearbyStationItem;
  selected?: boolean;
  onHoverIn?: () => void;
  onHoverOut?: () => void;
  onPressIn?: () => void;
  onOpen?: () => void;
}) {
  const { t, locale } = useI18n();

  return (
    <Pressable
      style={[styles.card, selected && styles.cardSelected]}
      onHoverIn={onHoverIn}
      onHoverOut={onHoverOut}
      onPressIn={onPressIn}
      onPress={onOpen}
    >
      <View style={styles.header}>
        <View style={styles.identity}>
          <Text style={styles.name}>{station.name ?? t("unnamedStation")}</Text>
          <Text style={styles.meta}>
            {[station.brand, station.comune, station.provincia].filter(Boolean).join(" · ")}
          </Text>
        </View>
        <View style={styles.badges}>
          <Text style={styles.distance}>{Math.round(station.distance_meters)} m</Text>
          <Text style={styles.freshness}>{translateFreshness(locale, station.freshness_status)}</Text>
        </View>
      </View>

      <Text style={styles.address}>{station.address ?? t("noAddressAvailable")}</Text>

      <View style={styles.priceRow}>
        <View>
          <Text style={styles.priceLabel}>
            {station.selected_fuel_type && station.selected_service_mode
              ? `${translateFuelType(locale, station.selected_fuel_type)} · ${translateServiceMode(locale, station.selected_service_mode)}`
              : t("noPrice")}
          </Text>
          <Text style={styles.priceValue}>
            {station.current_price ? `€${station.current_price}` : t("priceUnavailable")}
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
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 11,
    gap: 7,
    borderWidth: 1,
    borderColor: colors.borderWarm,
  },
  cardSelected: {
    borderColor: colors.selectionBorder,
    backgroundColor: colors.selection,
    ...elevation.selected,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  identity: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  meta: {
    color: colors.textMuted,
    ...typography.caption,
  },
  badges: {
    alignItems: "flex-end",
    gap: 6,
  },
  distance: {
    color: colors.accent,
    ...typography.caption,
    fontWeight: "700",
  },
  freshness: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    color: colors.warning,
  },
  address: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  priceLabel: {
    fontSize: 10,
    color: colors.textSoft,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  scorePill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.chip,
  },
  scoreText: {
    color: colors.inverseText,
    fontSize: 13,
    fontWeight: "800",
  },
  reasons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reason: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.chip,
    backgroundColor: colors.surfaceMuted,
    color: colors.accent,
    fontSize: 10,
    overflow: "hidden",
  },
});
