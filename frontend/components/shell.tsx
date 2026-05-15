import { Link, usePathname } from "expo-router";
import { PropsWithChildren, useState } from "react";
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { AnalyticsConsentBanner } from "../components/analytics-consent-banner";
import { useAnalyticsConsent } from "../lib/analytics-consent";
import { Locale, useI18n } from "../lib/i18n";
import { colors, elevation, radius, spacing, typography } from "../theme";

const logo = require("../assets/pienosmart_logo.png");

export function AppShell({
  title,
  subtitle,
  headerVariant = "hero",
  scrollEnabled = true,
  children,
}: PropsWithChildren<{
  title: string;
  subtitle: string;
  headerVariant?: "hero" | "compact";
  scrollEnabled?: boolean;
}>) {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const [menuOpen, setMenuOpen] = useState(false);
  const { locale, setLocale, t } = useI18n();
  const {
    enabled: analyticsEnabled,
    requiresConsent,
    status: analyticsConsentStatus,
    reset: resetAnalyticsConsent,
  } = useAnalyticsConsent();
  const currentSection = pathname === "/" ? "/" : `/${pathname.split("/").filter(Boolean)[0] ?? ""}`;
  const isDesktopHeader = width >= 980;
  const navItems = [
    { href: "/", label: t("navNearby"), icon: "⌖" },
    { href: "/profiles", label: t("navProfiles"), icon: "◫" },
    { href: "/trips", label: t("navTrips"), icon: "↗" },
    { href: "/favorites", label: t("navFavorites"), icon: "♡" },
  ] as const;
  const headerStyle = StyleSheet.flatten([styles.headerBar, headerVariant === "compact" && styles.headerBarCompact]);
  const titleStyle = StyleSheet.flatten([styles.title, headerVariant === "compact" && styles.titleCompact]);
  const subtitleStyle = StyleSheet.flatten([styles.subtitle, headerVariant === "compact" && styles.subtitleCompact]);
  const shellContent = (
    <>
      <View style={headerStyle}>
        <View style={styles.topRow}>
          {isDesktopHeader ? (
            <View style={styles.inlineMenuRow}>
              {navItems.map((item) => {
                const isActive = currentSection === item.href;
                const menuItemStyle = StyleSheet.flatten([styles.inlineMenuItem, isActive && styles.inlineMenuItemActive]);
                const menuItemTextStyle = StyleSheet.flatten([styles.inlineMenuItemText, isActive && styles.inlineMenuItemTextActive]);

                return (
                  <Link key={item.href} href={item.href} asChild>
                    <Pressable style={menuItemStyle}>
                      <Text style={styles.inlineMenuItemIcon}>{item.icon}</Text>
                      <Text style={menuItemTextStyle}>{item.label}</Text>
                    </Pressable>
                  </Link>
                );
              })}
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={menuOpen ? t("closeMenu") : t("openMenu")}
              style={({ pressed }) => [styles.menuToggle, pressed && styles.menuTogglePressed]}
              onPress={() => setMenuOpen((value) => !value)}
            >
              <View style={styles.menuIcon}>
                <View style={styles.menuIconLine} />
                <View style={styles.menuIconLine} />
                <View style={styles.menuIconLine} />
              </View>
            </Pressable>
          )}

          <View style={styles.headerActions}>
            {isDesktopHeader ? <LanguageSelector locale={locale} onSelect={setLocale} /> : null}
            <View style={styles.headerActionBadge}>
              <Image source={logo} style={styles.headerActionImage} resizeMode="contain" />
            </View>
          </View>
        </View>


      </View>
      <View style={styles.heroRow}>
        <View style={styles.logoPanel}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        </View>

        <View style={styles.brandBlock}>
          <Text style={styles.eyebrow}>PienoSmart</Text>

          <Text style={titleStyle}>{title}</Text>

          <Text style={subtitleStyle}>{subtitle}</Text>

          <Text style={styles.valueLine}>
            {t("shellValueLine")}
          </Text>
        </View>
      </View>
      <View style={styles.content}>{children}</View>
      <AnalyticsConsentBanner />
      {analyticsEnabled && requiresConsent && analyticsConsentStatus !== "pending" ? (
        <View style={styles.footerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityHint={t("analyticsPreferencesHint")}
            onPress={resetAnalyticsConsent}
            style={({ pressed }) => [styles.footerLink, pressed && styles.footerLinkPressed]}
          >
            <Text style={styles.footerLinkText}>{t("analyticsPreferences")}</Text>
          </Pressable>
        </View>
      ) : null}
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {scrollEnabled ? (
        <ScrollView contentContainerStyle={styles.page}>{shellContent}</ScrollView>
      ) : (
        <View style={styles.page}>{shellContent}</View>
      )}
      {menuOpen && !isDesktopHeader ? (
        <View style={styles.menuOverlay}>
          <View style={styles.menuOverlayHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("closeMenu")}
              style={({ pressed }) => [styles.menuToggle, pressed && styles.menuTogglePressed]}
              onPress={() => setMenuOpen(false)}
            >
              <View style={styles.menuIcon}>
                <View style={styles.menuIconLine} />
                <View style={styles.menuIconLine} />
                <View style={styles.menuIconLine} />
              </View>
            </Pressable>
          </View>

          <View style={styles.menuOverlayContent}>
            <View style={styles.mobileLanguageSection}>
              <Text style={styles.mobileLanguageLabel}>{t("language")}</Text>
              <LanguageSelector locale={locale} onSelect={setLocale} mobile />
            </View>

            {navItems.map((item) => {
              const isActive = currentSection === item.href;
              const menuItemStyle = StyleSheet.flatten([styles.menuItem, isActive && styles.menuItemActive]);
              const menuItemTextStyle = StyleSheet.flatten([styles.menuItemText, isActive && styles.menuItemTextActive]);

              return (
                <Link key={item.href} href={item.href} asChild>
                  <Pressable style={menuItemStyle} onPress={() => setMenuOpen(false)}>
                    <View style={styles.menuItemInner}>
                      <Text style={[styles.menuItemIcon, isActive && styles.menuItemIconActive]}>{item.icon}</Text>
                      <Text style={menuItemTextStyle}>{item.label}</Text>
                    </View>
                  </Pressable>
                </Link>
              );
            })}
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function LanguageSelector({
  locale,
  onSelect,
  mobile = false,
}: {
  locale: Locale;
  onSelect: (locale: Locale) => void;
  mobile?: boolean;
}) {
  const { t } = useI18n();

  return (
    <View style={[styles.languageSelector, mobile && styles.languageSelectorMobile]}>
      <Pressable
        style={[styles.languageOption, locale === "en" && styles.languageOptionActive]}
        onPress={() => onSelect("en")}
      >
        <Text style={[styles.languageOptionText, locale === "en" && styles.languageOptionTextActive]}>EN</Text>
      </Pressable>
      <Pressable
        style={[styles.languageOption, locale === "it" && styles.languageOptionActive]}
        onPress={() => onSelect("it")}
      >
        <Text style={[styles.languageOptionText, locale === "it" && styles.languageOptionTextActive]}>IT</Text>
      </Pressable>
      {mobile ? (
        <View style={styles.languageLegend}>
          <Text style={styles.languageLegendText}>{t("english")} / {t("italian")}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  page: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  headerBar: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primaryDark,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  headerBarCompact: {
    paddingVertical: spacing.xs,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  inlineMenuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  inlineMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(217, 228, 241, 0.16)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  inlineMenuItemActive: {
    borderColor: colors.accentWarm,
    backgroundColor: "rgba(217, 142, 61, 0.12)",
  },
  inlineMenuItemIcon: {
    color: "#D9E4F1",
    fontSize: 12,
    lineHeight: 14,
  },
  inlineMenuItemText: {
    color: "#D9E4F1",
    ...typography.caption,
    fontWeight: "700",
  },
  inlineMenuItemTextActive: {
    color: colors.inverseText,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.lg,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...elevation.focus,
  },
  logoPanel: {
    borderWidth: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.borderWarm,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.sm,
  },
  brandBlock: {
    gap: spacing.xs,
    flex: 1,
    justifyContent: "center",
  },
  logo: {
    width: 90,
    height: 90,
  },
  eyebrow: {
    color: colors.primary,
    ...typography.eyebrow,
  },
  title: {
    color: colors.text,
    ...typography.pageTitle,
  },
  titleCompact: {
    fontSize: 18,
    lineHeight: 22,
  },
  subtitle: {
    color: colors.textMuted,
    ...typography.body,
  },
  subtitleCompact: {
    fontSize: 13,
    lineHeight: 17,
  },
  valueLine: {
    marginTop: spacing.xs,
    color: colors.secondary,
    fontSize: 12,
    lineHeight: 16,
  },
  menuToggle: {
    width: 38,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(217, 228, 241, 0.2)",
    backgroundColor: "rgba(255,255,255,0.05)",
    ...elevation.focus,
  },
  menuTogglePressed: {
    opacity: 0.82,
  },
  menuIcon: {
    gap: 3,
  },
  menuIconLine: {
    width: 16,
    height: 2,
    borderRadius: 999,
    backgroundColor: "#D9E4F1",
  },
  headerActionBadge: {
    width: 130,
    height: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(217, 228, 241, 0.18)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    ...elevation.focus,
  },
  headerActionImage: {
    width: 108,
    height: 30,
  },
  languageSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  languageSelectorMobile: {
    alignSelf: "flex-start",
  },
  languageOption: {
    minWidth: 42,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(217, 228, 241, 0.18)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
  },
  languageOptionActive: {
    borderColor: colors.accentWarm,
    backgroundColor: "rgba(217, 142, 61, 0.12)",
  },
  languageOptionText: {
    color: "#D9E4F1",
    ...typography.caption,
    fontWeight: "700",
  },
  languageOptionTextActive: {
    color: colors.inverseText,
  },
  languageLegend: {
    marginLeft: spacing.sm,
  },
  languageLegendText: {
    color: "#D9E4F1",
    ...typography.caption,
  },
  menuOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 50,
    backgroundColor: "rgba(16, 43, 70, 0.96)",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  menuOverlayHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuOverlayContent: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.md,
  },
  mobileLanguageSection: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  mobileLanguageLabel: {
    color: "#D9E4F1",
    ...typography.eyebrow,
  },
  menuItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(217, 228, 241, 0.12)",
    backgroundColor: "transparent",
  },
  menuItemInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  menuItemActive: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderBottomColor: colors.accentWarm,
  },
  menuItemIcon: {
    width: 24,
    color: "#AFC7DE",
    fontSize: 22,
    lineHeight: 24,
    textAlign: "center",
  },
  menuItemIconActive: {
    color: colors.accentWarm,
  },
  menuItemText: {
    color: colors.inverseText,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
  },
  menuItemTextActive: {
    color: colors.accentWarm,
  },
  content: {
    gap: spacing.md,
  },
  footerRow: {
    marginTop: spacing.sm,
    alignItems: "flex-end",
  },
  footerLink: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  footerLinkPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  footerLinkText: {
    color: colors.secondary,
    ...typography.caption,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
