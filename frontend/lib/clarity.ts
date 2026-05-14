declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

const CLARITY_SCRIPT_ID = "pienosmart-clarity";

export function getClarityProjectId() {
  return process.env.EXPO_PUBLIC_CLARITY_PROJECT_ID?.trim() ?? "";
}

export function clarityEnabled() {
  return Boolean(getClarityProjectId());
}

export function clarityRequiresConsent() {
  return (process.env.EXPO_PUBLIC_CLARITY_REQUIRE_CONSENT ?? "true").toLowerCase() !== "false";
}

export function loadClarity(projectId: string) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  if (document.getElementById(CLARITY_SCRIPT_ID)) {
    return;
  }

  ((c: Window & { clarity?: ((...args: unknown[]) => void) & { q?: unknown[][] } }, l: Document, r: string, i: string, t?: HTMLScriptElement, y?: HTMLScriptElement) => {
    c.clarity =
      c.clarity ||
      function (...args: unknown[]) {
        (c.clarity!.q = c.clarity!.q || []).push(args);
      };
    t = l.createElement(r) as HTMLScriptElement;
    t.async = true;
    t.id = CLARITY_SCRIPT_ID;
    t.src = `https://www.clarity.ms/tag/${i}`;
    y = l.getElementsByTagName(r)[0] as HTMLScriptElement;
    y.parentNode?.insertBefore(t, y);
  })(window, document, "script", projectId);
}

export function grantClarityAnalyticsConsent() {
  if (typeof window === "undefined" || !window.clarity) {
    return;
  }

  window.clarity("consentv2", {
    ad_Storage: "denied",
    analytics_Storage: "granted",
  });
}
