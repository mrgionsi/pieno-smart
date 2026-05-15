import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAnalyticsConsent } from "../lib/analytics-consent";
import { useI18n } from "../lib/i18n";
import { colors, elevation, radius, spacing, typography } from "../theme";

export function AnalyticsConsentBanner() {
  const { enabled, status, accept, decline } = useAnalyticsConsent();
  const { t } = useI18n();

  if (!enabled || status !== "pending") {
    return null;
  }

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.banner}>
        <Text style={styles.title}>{t("analyticsConsentTitle")}</Text>
        <Text style={styles.body}>{t("analyticsConsentBody")}</Text>
        <View style={styles.actions}>
          <Pressable style={styles.secondaryButton} onPress={decline}>
            <Text style={styles.secondaryButtonText}>{t("analyticsDecline")}</Text>
          </Pressable>
          <Pressable style={styles.primaryButton} onPress={accept}>
            <Text style={styles.primaryButtonText}>{t("analyticsAccept")}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: spacing.md,
  },
  banner: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    ...elevation.focus,
  },
  title: {
    color: colors.text,
    ...typography.cardTitle,
    fontWeight: "800",
  },
  body: {
    color: colors.textMuted,
    ...typography.body,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  secondaryButton: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceMuted,
  },
  secondaryButtonText: {
    color: colors.text,
    ...typography.caption,
    fontWeight: "700",
  },
  primaryButton: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: colors.inverseText,
    ...typography.caption,
    fontWeight: "700",
  },
});
