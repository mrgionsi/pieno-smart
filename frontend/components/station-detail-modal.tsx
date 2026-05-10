import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { StationDetail } from "../lib/types";
import { colors, radius, spacing, typography } from "../theme";

export function StationDetailModal({
  visible,
  detail,
  loading,
  error,
  onClose,
}: {
  visible: boolean;
  detail: StationDetail | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>Station Details</Text>
              <Text style={styles.title}>{detail?.name ?? "Station Details"}</Text>
            </View>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeLabel}>Close</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {loading ? <ActivityIndicator color={colors.primary} /> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {detail ? (
              <View style={styles.card}>
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
                        <Text style={styles.timestamp}>{price.price_effective_at ?? "No Timestamp"}</Text>
                      </View>
                      <Text style={styles.priceValue}>€{price.price}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  sheet: {
    width: "100%",
    maxWidth: 720,
    maxHeight: "88%",
    backgroundColor: colors.surfaceWarm,
    borderRadius: radius.panel,
    borderWidth: 1,
    borderColor: colors.borderWarm,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.primaryDark,
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    color: "#D9E4F1",
    ...typography.eyebrow,
  },
  title: {
    color: colors.inverseText,
    fontSize: 22,
    fontWeight: "800",
  },
  closeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeLabel: {
    color: colors.primary,
    fontWeight: "700",
    ...typography.caption,
  },
  content: {
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.panel,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderWarm,
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
    color: colors.text,
  },
  error: {
    color: colors.danger,
  },
});
