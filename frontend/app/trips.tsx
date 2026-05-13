import { StyleSheet, Text, View } from "react-native";

import { AppShell } from "../components/shell";
import { useI18n } from "../lib/i18n";
import { colors, radius, spacing, typography } from "../theme";

export default function TripsScreen() {
  const { t } = useI18n();

  return (
    <AppShell
      title={t("tripsTitle")}
      subtitle={t("tripsSubtitle")}
      headerVariant="compact"
    >
      <View style={styles.card}>
        <Text style={styles.title}>{t("navTrips")}</Text>
        <Text style={styles.body}>{t("tripsBody")}</Text>
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
