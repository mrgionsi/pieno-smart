import { Link, usePathname } from "expo-router";
import { PropsWithChildren } from "react";
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../theme";

const logo = require("../assets/pienosmart_logo.png");

const NAV_ITEMS = [
  { href: "/", label: "Nearby" },
  { href: "/profiles", label: "Profiles" },
  { href: "/trips", label: "Trips" },
  { href: "/favorites", label: "Favorites" },
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
  const headerStyle = StyleSheet.flatten([styles.headerBar, headerVariant === "compact" && styles.headerBarCompact]);
  const titleStyle = StyleSheet.flatten([styles.title, headerVariant === "compact" && styles.titleCompact]);
  const subtitleStyle = StyleSheet.flatten([styles.subtitle, headerVariant === "compact" && styles.subtitleCompact]);
  const shellContent = (
    <>
      <View style={headerStyle}>
        <View style={styles.brandRow}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />

          <View style={styles.brandBlock}>
            <Text style={styles.eyebrow}>PienoSmart</Text>

            <Text style={titleStyle}>{title}</Text>

            <Text style={subtitleStyle}>{subtitle}</Text>
          </View>
        </View>

        <View style={styles.menuRow}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const menuItemStyle = StyleSheet.flatten([styles.menuItem, isActive && styles.menuItemActive]);
            const menuItemTextStyle = StyleSheet.flatten([styles.menuItemText, isActive && styles.menuItemTextActive]);

            return (
              <Link key={item.href} href={item.href} asChild>
                <Pressable style={menuItemStyle}>
                  <Text style={menuItemTextStyle}>{item.label}</Text>
                </Pressable>
              </Link>
            );
          })}
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
    paddingVertical: spacing.sm,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  logo: {
    width: 52,
    height: 52,
  },
  brandBlock: {
    gap: 2,
    flex: 1,
  },
  eyebrow: {
    color: "#D9E4F1",
    ...typography.eyebrow,
  },
  title: {
    color: colors.inverseText,
    ...typography.pageTitle,
  },
  titleCompact: {
    fontSize: 18,
    lineHeight: 22,
  },
  subtitle: {
    color: "#D4E0EC",
    ...typography.body,
  },
  subtitleCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
  menuRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  menuItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(217, 228, 241, 0.18)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  menuItemActive: {
    backgroundColor: colors.surface,
    borderColor: colors.surface,
  },
  menuItemText: {
    color: "#D9E4F1",
    ...typography.caption,
    fontWeight: "700",
  },
  menuItemTextActive: {
    color: colors.primary,
  },
  content: {
    gap: spacing.md,
  },
});
