import { StyleSheet, Text, View } from "react-native";

import { AppShell } from "../components/shell";
import { colors, radius, spacing, typography } from "../theme";

export default function FavoritesScreen() {
  return (
    <AppShell
      title="Favorites will keep your trusted stations close"
      subtitle="This section will collect saved stations and make nearby and trip decisions faster."
      headerVariant="compact"
    >
      <View style={styles.card}>
        <Text style={styles.title}>Favorites</Text>
        <Text style={styles.body}>
          The backend foundation is already in place. The next step here is the saved-station flow and favorite-aware recommendation.
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
