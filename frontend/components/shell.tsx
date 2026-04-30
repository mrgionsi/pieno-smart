import { PropsWithChildren } from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export function AppShell({
  title,
  subtitle,
  children,
}: PropsWithChildren<{ title: string; subtitle: string }>) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>PienoSmart</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <View style={styles.content}>{children}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f6f3ea",
  },
  page: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 18,
  },
  hero: {
    padding: 20,
    borderRadius: 28,
    backgroundColor: "#163a2b",
    gap: 8,
  },
  eyebrow: {
    color: "#d6e8de",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    color: "#fffaf1",
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 36,
  },
  subtitle: {
    color: "#d8eadf",
    fontSize: 15,
    lineHeight: 21,
  },
  content: {
    flex: 1,
    gap: 16,
  },
});
