import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";

import { AnalyticsConsentProvider } from "../lib/analytics-consent";
import { I18nProvider } from "../lib/i18n";
import { colors } from "../theme";

export default function RootLayout() {
  const [runtimeConfigReady, setRuntimeConfigReady] = useState(typeof window === "undefined");

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    if (window.__APP_CONFIG__) {
      setRuntimeConfigReady(true);
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-runtime-config="true"]');
    if (existing) {
      const handleLoad = () => setRuntimeConfigReady(true);
      existing.addEventListener("load", handleLoad, { once: true });
      return () => existing.removeEventListener("load", handleLoad);
    }

    const script = document.createElement("script");
    script.src = `/runtime-config.js?v=${Date.now()}`;
    script.async = false;
    script.dataset.runtimeConfig = "true";
    script.onload = () => setRuntimeConfigReady(true);
    script.onerror = () => setRuntimeConfigReady(true);
    document.head.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, []);

  if (!runtimeConfigReady) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <I18nProvider>
      <AnalyticsConsentProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: "#f6f3ea",
            },
          }}
        />
      </AnalyticsConsentProvider>
    </I18nProvider>
  );
}
