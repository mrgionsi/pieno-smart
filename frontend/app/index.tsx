import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { NearbyExplorer } from "../components/nearby-explorer";
import { AppShell } from "../components/shell";
import { colors, radius, spacing, typography } from "../theme";

export default function HomeScreen() {
  return (
    <AppShell
      title="Best refueling decision, not just the cheapest station"
      subtitle="Use nearby search now on the web, then reuse the same codebase for iPhone and Android later."
      headerVariant="compact"
    >
      <View style={styles.navRow}>
        <Link href="/profiles" asChild>
          <Pressable style={styles.navButton}>
            <Text style={styles.navButtonText}>Manage vehicle profiles</Text>
          </Pressable>
        </Link>
        <Link href="/trips" asChild>
          <Pressable style={styles.navButton}>
            <Text style={styles.navButtonText}>Plan trip fuel</Text>
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
    gap: spacing.sm,
  },
  navButton: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navButtonText: {
    color: colors.primary,
    ...typography.caption,
    fontWeight: "700",
  },
});
