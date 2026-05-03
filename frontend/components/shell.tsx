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
  children,
}: PropsWithChildren<{ title: string; subtitle: string; headerVariant?: "hero" | "compact" }>) {
  const pathname = usePathname();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={StyleSheet.flatten([styles.headerBar, headerVariant === "compact" && styles.headerBarCompact])}>
          <View style={styles.brandRow}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />

            <View style={styles.brandBlock}>
              <Text style={styles.eyebrow}>PienoSmart</Text>

              <Text style={StyleSheet.flatten([styles.title, headerVariant === "compact" && styles.titleCompact])}>
                {title}
              </Text>

              <Text
                style={StyleSheet.flatten([styles.subtitle, headerVariant === "compact" && styles.subtitleCompact])}
              >
                {subtitle}
              </Text>
            </View>
          </View>

          <View style={styles.menuRow}>
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link key={item.href} href={item.href} asChild>
                  <Pressable style={StyleSheet.flatten([styles.menuItem, isActive && styles.menuItemActive])}>
                    <Text style={StyleSheet.flatten([styles.menuItemText, isActive && styles.menuItemTextActive])}>
                      {item.label}
                    </Text>
                  </Pressable>
                </Link>
              );
            })}
          </View>
        </View>

        <View style={styles.content}>{children}</View>
      </ScrollView>
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