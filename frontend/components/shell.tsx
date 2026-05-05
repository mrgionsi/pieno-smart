import { Link, usePathname } from "expo-router";
import { PropsWithChildren, useState } from "react";
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, elevation, radius, spacing, typography } from "../theme";

const logo = require("../assets/pienosmart_logo.png");
const favicon = require("../favicon.png");

const NAV_ITEMS = [
  { href: "/", label: "Nearby", icon: "⌖" },
  { href: "/profiles", label: "Profiles", icon: "◫" },
  { href: "/trips", label: "Trips", icon: "↗" },
  { href: "/favorites", label: "Favorites", icon: "♡" },
] as const;

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
  const [menuOpen, setMenuOpen] = useState(false);
  const currentSection = pathname === "/" ? "/" : `/${pathname.split("/").filter(Boolean)[0] ?? ""}`;
  const headerStyle = StyleSheet.flatten([styles.headerBar, headerVariant === "compact" && styles.headerBarCompact]);
  const titleStyle = StyleSheet.flatten([styles.title, headerVariant === "compact" && styles.titleCompact]);
  const subtitleStyle = StyleSheet.flatten([styles.subtitle, headerVariant === "compact" && styles.subtitleCompact]);
  const shellContent = (
    <>
      <View style={headerStyle}>
        <View style={styles.topRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={menuOpen ? "Close menu" : "Open menu"}
            style={({ pressed }) => [styles.menuToggle, pressed && styles.menuTogglePressed]}
            onPress={() => setMenuOpen((value) => !value)}
          >
            <View style={styles.menuIcon}>
              <View style={styles.menuIconLine} />
              <View style={styles.menuIconLine} />
              <View style={styles.menuIconLine} />
            </View>
          </Pressable>

          <View style={styles.headerActionBadge}>
            <Image source={favicon} style={styles.headerActionImage} resizeMode="contain" />
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
            Better than a plain fuel list: compare stations using distance, freshness, convenience, and trip context.
          </Text>
        </View>
      </View>
      <View style={styles.content}>{children}</View>
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {scrollEnabled ? (
        <ScrollView contentContainerStyle={styles.page}>{shellContent}</ScrollView>
      ) : (
        <View style={styles.page}>{shellContent}</View>
      )}
      {menuOpen ? (
        <View style={styles.menuOverlay}>
          <View style={styles.menuOverlayHeader}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close menu"
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
            {NAV_ITEMS.map((item) => {
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
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primaryDark,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  headerBarCompact: {
    paddingVertical: spacing.md,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
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
    padding: spacing.md,
  },
  brandBlock: {
    gap: spacing.xs,
    flex: 1,
    justifyContent: "center",
  },
  logo: {
    width: 108,
    height: 108,
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
    fontSize: 14,
    lineHeight: 19,
  },
  valueLine: {
    marginTop: spacing.sm,
    color: colors.secondary,
    fontSize: 13,
    lineHeight: 18,
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
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(217, 228, 241, 0.18)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    ...elevation.focus,
  },
  headerActionImage: {
    width: 22,
    height: 22,
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
});
