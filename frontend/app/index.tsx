import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { NearbyExplorer } from "../components/nearby-explorer";
import { AppShell } from "../components/shell";

export default function HomeScreen() {
  return (
    <AppShell
      title="Best refueling decision, not just the cheapest station"
      subtitle="Use nearby search now on the web, then reuse the same codebase for iPhone and Android later."
    >
      <View style={styles.navRow}>
        <Link href="/profiles" asChild>
          <Pressable style={styles.navButton}>
            <Text style={styles.navButtonText}>Manage vehicle profiles</Text>
          </Pressable>
        </Link>
      </View>
      <NearbyExplorer />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  navRow: {
    flexDirection: "row",
  },
  navButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fffdf8",
    borderWidth: 1,
    borderColor: "#dfd6c7",
  },
  navButtonText: {
    color: "#234535",
    fontWeight: "700",
  },
});
