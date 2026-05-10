import { StyleSheet, Text, View } from "react-native";

import { AppShell } from "../components/shell";
import { colors, radius, spacing, typography } from "../theme";

export default function TripsScreen() {
  return (
    <AppShell
      title="Trip Planning Is the Next Major Product Surface"
      subtitle="This Section Will Turn Route-Aware Refueling into a First-Class Decision Flow."
      headerVariant="compact"
    >
      <View style={styles.card}>
        <Text style={styles.title}>Trips</Text>
        <Text style={styles.body}>
          This Screen Is the Placeholder for the Route-Based Refuel Planner. It Gives the Web App a Clear Information Architecture Now, Even Before the Full Trip Flow Lands on This Branch.
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
