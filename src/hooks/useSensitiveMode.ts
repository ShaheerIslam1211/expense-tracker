import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

const SENSITIVE_MODE_STORAGE_KEY = "expense-tracker-hide-sensitive-values";

function loadHiddenDefault(): boolean {
  try {
    const raw = localStorage.getItem(SENSITIVE_MODE_STORAGE_KEY);
    // Hidden by default for safer app sharing.
    if (raw == null) return true;
    return raw === "true";
  } catch {
    return true;
  }
}

export function useSensitiveMode() {
  const { user, userData, loading, updateUserProfile } = useAuth();
  const [hideSensitiveValues, setHideSensitiveValues] = useState<boolean>(loadHiddenDefault);
  const hideSensitiveValuesRef = useRef(hideSensitiveValues);
  const hasHydratedFromCloudRef = useRef(false);
  const lastSyncedRef = useRef<boolean | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(SENSITIVE_MODE_STORAGE_KEY, String(hideSensitiveValues));
    } catch {
      // Ignore storage errors.
    }
  }, [hideSensitiveValues]);

  useEffect(() => {
    hideSensitiveValuesRef.current = hideSensitiveValues;
  }, [hideSensitiveValues]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      hasHydratedFromCloudRef.current = true;
      lastSyncedRef.current = null;
      return;
    }

    if (!userData) return;

    if (typeof userData.hideSensitiveValues === "boolean") {
      setHideSensitiveValues(userData.hideSensitiveValues);
      hasHydratedFromCloudRef.current = true;
      lastSyncedRef.current = userData.hideSensitiveValues;
      return;
    }

    // No cloud value yet: seed from current local value.
    hasHydratedFromCloudRef.current = true;
    lastSyncedRef.current = hideSensitiveValuesRef.current;
    void updateUserProfile({ hideSensitiveValues: hideSensitiveValuesRef.current });
  }, [loading, user, userData, updateUserProfile]);

  useEffect(() => {
    if (!user || !hasHydratedFromCloudRef.current) return;
    if (lastSyncedRef.current === hideSensitiveValues) return;
    lastSyncedRef.current = hideSensitiveValues;
    void updateUserProfile({ hideSensitiveValues });
  }, [hideSensitiveValues, user, updateUserProfile]);

  const toggleSensitiveValues = () => setHideSensitiveValues((prev) => !prev);

  return { hideSensitiveValues, toggleSensitiveValues };
}

export function maskAmount(visibleValue: string, hidden = true): string {
  return hidden ? "••••••" : visibleValue;
}
