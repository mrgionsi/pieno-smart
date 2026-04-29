import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: "#163a2b",
          headerStyle: {
            backgroundColor: "#f6f3ea",
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: "#f6f3ea",
          },
        }}
      />
    </>
  );
}
