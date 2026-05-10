import { StyleSheet, Text, View } from "react-native";

import { AppShell } from "../components/shell";
import { colors, radius, spacing, typography } from "../theme";

export default function FavoritesScreen() {
  return (
    <AppShell
      title="Favorites Will Keep Your Trusted Stations Close"
      subtitle="This Section Will Collect Saved Stations And Make Nearby And Trip Decisions Faster."
      headerVariant="compact"
    >
      <View style={styles.card}>
        <Text style={styles.title}>Favorites</Text>
        <Text style={styles.body}>
          The Backend Foundation Is Already In Place. The Next Step Here Is The Saved-Station Flow And Favorite-Aware Recommendation.
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
