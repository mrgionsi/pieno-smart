import { StyleSheet, Text, View } from "react-native";

import { AppShell } from "../components/shell";
import { colors, radius, spacing, typography } from "../theme";

export default function TripsScreen() {
  return (
    <AppShell
      title="Trip planning is the next major product surface"
      subtitle="This section will turn route-aware refueling into a first-class decision flow."
      headerVariant="compact"
    >
      <View style={styles.card}>
        <Text style={styles.title}>Trips</Text>
        <Text style={styles.body}>
          This screen is the placeholder for the route-based refuel planner. It gives the web app a clear information architecture now, even before the full trip flow lands on this branch.
        </Text>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.panel,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderWarm,
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    ...typography.sectionTitle,
  },
  body: {
    color: colors.textMuted,
    ...typography.body,
  },
});
