import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";

import {
  clarityEnabled,
  clarityRequiresConsent,
  getClarityProjectId,
  grantClarityAnalyticsConsent,
  loadClarity,
} from "./clarity";

type ConsentStatus = "pending" | "granted" | "denied" | "not_required";

type AnalyticsConsentContextValue = {
  enabled: boolean;
  requiresConsent: boolean;
  status: ConsentStatus;
  accept: () => void;
  decline: () => void;
  reset: () => void;
};

const STORAGE_KEY = "pienosmart.analytics-consent.v1";

const AnalyticsConsentContext = createContext<AnalyticsConsentContextValue | null>(null);

export function AnalyticsConsentProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<ConsentStatus>(() => {
    if (!clarityEnabled()) {
      return "denied";
    }
    if (!clarityRequiresConsent()) {
      return "not_required";
    }
    return "pending";
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!clarityEnabled()) {
      setStatus("denied");
      return;
    }
    if (!clarityRequiresConsent()) {
      setStatus("not_required");
      return;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "granted" || stored === "denied") {
      setStatus(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !clarityEnabled()) {
      return;
    }

    const projectId = getClarityProjectId();
    if (!projectId) {
      return;
    }

    if (status === "granted") {
      if (__DEV__) {
        console.info("Clarity enabled");
        console.info("Clarity consent granted");
      }
      loadClarity(projectId);
      grantClarityAnalyticsConsent();
      return;
    }

    if (status === "not_required") {
      if (__DEV__) {
        console.info("Clarity enabled");
      }
      loadClarity(projectId);
    }
  }, [status]);

  const value = useMemo<AnalyticsConsentContextValue>(
    () => ({
      enabled: clarityEnabled(),
      requiresConsent: clarityRequiresConsent(),
      status,
      accept: () => {
        setStatus("granted");
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, "granted");
        }
      },
      decline: () => {
        setStatus("denied");
        if (typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, "denied");
        }
      },
      reset: () => {
        if (!clarityEnabled()) {
          return;
        }
        const nextStatus = clarityRequiresConsent() ? "pending" : "not_required";
        setStatus(nextStatus);
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      },
    }),
    [status],
  );

  return <AnalyticsConsentContext.Provider value={value}>{children}</AnalyticsConsentContext.Provider>;
}

export function useAnalyticsConsent() {
  const context = useContext(AnalyticsConsentContext);
  if (!context) {
    throw new Error("useAnalyticsConsent must be used within an AnalyticsConsentProvider");
  }
  return context;
}
