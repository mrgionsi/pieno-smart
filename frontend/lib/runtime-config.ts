type AppRuntimeConfig = {
  API_BASE_URL?: string;
  DEV_USER_EMAIL?: string;
  DEV_USER_DISPLAY_NAME?: string;
  DEV_USER_SUBJECT?: string;
  CLARITY_PROJECT_ID?: string;
  CLARITY_REQUIRE_CONSENT?: string;
};

declare global {
  interface Window {
    __APP_CONFIG__?: AppRuntimeConfig;
  }
}

function readRuntimeConfig(): AppRuntimeConfig {
  if (typeof window === "undefined") {
    return {};
  }
  return window.__APP_CONFIG__ ?? {};
}

function readConfigValue(runtimeValue: string | undefined, fallbackValue: string | undefined) {
  const runtime = runtimeValue?.trim();
  if (runtime) {
    return runtime;
  }

  const fallback = fallbackValue?.trim();
  if (fallback) {
    return fallback;
  }

  return "";
}

export function getApiBaseUrlConfig() {
  const runtime = readRuntimeConfig();
  return readConfigValue(runtime.API_BASE_URL, process.env.EXPO_PUBLIC_API_BASE_URL) || "/api";
}

export function getDevUserConfig() {
  const runtime = readRuntimeConfig();
  return {
    email: readConfigValue(runtime.DEV_USER_EMAIL, process.env.EXPO_PUBLIC_DEV_USER_EMAIL),
    displayName: readConfigValue(
      runtime.DEV_USER_DISPLAY_NAME,
      process.env.EXPO_PUBLIC_DEV_USER_DISPLAY_NAME,
    ),
    subject: readConfigValue(runtime.DEV_USER_SUBJECT, process.env.EXPO_PUBLIC_DEV_USER_SUBJECT),
  };
}

export function getClarityRuntimeConfig() {
  const runtime = readRuntimeConfig();
  return {
    projectId: readConfigValue(
      runtime.CLARITY_PROJECT_ID,
      process.env.EXPO_PUBLIC_CLARITY_PROJECT_ID,
    ),
    requireConsent:
      readConfigValue(
        runtime.CLARITY_REQUIRE_CONSENT,
        process.env.EXPO_PUBLIC_CLARITY_REQUIRE_CONSENT,
      ) || "true",
  };
}
