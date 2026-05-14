import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AnalyticsConsentBanner } from "../components/analytics-consent-banner";
import { AnalyticsConsentProvider } from "../lib/analytics-consent";
import { I18nProvider } from "../lib/i18n";

export default function RootLayout() {
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
        <AnalyticsConsentBanner />
      </AnalyticsConsentProvider>
    </I18nProvider>
  );
}
