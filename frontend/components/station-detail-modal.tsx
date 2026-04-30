import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { StationDetail } from "../lib/types";

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
              <Text style={styles.eyebrow}>Station details</Text>
              <Text style={styles.title}>{detail?.name ?? "Station details"}</Text>
            </View>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeLabel}>Close</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {loading ? <ActivityIndicator color="#163a2b" /> : null}
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
                        <Text style={styles.timestamp}>{price.price_effective_at ?? "No timestamp"}</Text>
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
    backgroundColor: "rgba(16, 24, 20, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  sheet: {
    width: "100%",
    maxWidth: 720,
    maxHeight: "88%",
    backgroundColor: "#f8f4ea",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#ddd4c5",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    backgroundColor: "#163a2b",
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    color: "#c9ddd0",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  title: {
    color: "#fffaf1",
    fontSize: 22,
    fontWeight: "800",
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#f6f3ea",
  },
  closeLabel: {
    color: "#173528",
    fontWeight: "700",
    fontSize: 12,
  },
  content: {
    padding: 18,
  },
  card: {
    backgroundColor: "#fffdf8",
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#e8dfcf",
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
