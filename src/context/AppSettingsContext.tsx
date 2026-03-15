import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { PaymentMethodType, TransactionType } from "../types";
import { useAuth } from "./AuthContext";

const APP_SETTINGS_STORAGE_KEY = "expense-tracker-app-settings-v1";

export interface AppSettings {
  defaultTransactionType: TransactionType;
  defaultPaymentMethodType: PaymentMethodType;
  autoScanReceiptOnUpload: boolean;
  compactNumberFormatting: boolean;
  weekStartsOnMonday: boolean;
  reducedMotion: boolean;
  mobileNavbarFixed: boolean;
  showFloatingAddButton: boolean;
  showPwaInstallPrompt: boolean;
  showSidebarTipCard: boolean;
  compactLayout: boolean;
}

const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultTransactionType: "expense",
  defaultPaymentMethodType: "cash",
  autoScanReceiptOnUpload: false,
  compactNumberFormatting: false,
  weekStartsOnMonday: false,
  reducedMotion: false,
  mobileNavbarFixed: true,
  showFloatingAddButton: true,
  showPwaInstallPrompt: true,
  showSidebarTipCard: true,
  compactLayout: false,
};

interface AppSettingsContextValue {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
  applyPreset: (preset: "balanced" | "power" | "minimal") => void;
  exportSettings: () => string;
  importSettings: (raw: string) => boolean;
}

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

function loadInitialSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_APP_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return { ...DEFAULT_APP_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const { user, userData, loading, updateUserProfile } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(loadInitialSettings);
  const settingsRef = useRef(settings);
  const hasHydratedFromCloudRef = useRef(false);
  const lastSyncedRef = useRef<string>("");

  useEffect(() => {
    try {
      localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore storage errors
    }
  }, [settings]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      hasHydratedFromCloudRef.current = true;
      lastSyncedRef.current = "";
      return;
    }

    if (!userData) return;

    const cloudSettings = userData.appSettings;
    if (cloudSettings) {
      const merged = { ...DEFAULT_APP_SETTINGS, ...cloudSettings };
      const mergedPayload = JSON.stringify(merged);
      if (mergedPayload !== JSON.stringify(settingsRef.current)) {
        setSettings(merged);
      }
      lastSyncedRef.current = mergedPayload;
      hasHydratedFromCloudRef.current = true;
      return;
    }

    // First login on this device/account without cloud settings: upload local settings once.
    hasHydratedFromCloudRef.current = true;
    const payload = JSON.stringify(settingsRef.current);
    lastSyncedRef.current = payload;
    void updateUserProfile({ appSettings: settingsRef.current });
  }, [loading, user, userData, updateUserProfile]);

  useEffect(() => {
    if (!user || !hasHydratedFromCloudRef.current) return;
    const payload = JSON.stringify(settings);
    if (payload === lastSyncedRef.current) return;
    lastSyncedRef.current = payload;
    void updateUserProfile({ appSettings: settings });
  }, [settings, user, updateUserProfile]);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.reducedMotion) root.classList.add("reduce-motion");
    else root.classList.remove("reduce-motion");
  }, [settings.reducedMotion]);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.compactLayout) root.classList.add("app-compact");
    else root.classList.remove("app-compact");
  }, [settings.compactLayout]);

  const applyPreset = useCallback((preset: "balanced" | "power" | "minimal") => {
    if (preset === "power") {
      setSettings({
        ...DEFAULT_APP_SETTINGS,
        autoScanReceiptOnUpload: true,
        compactNumberFormatting: true,
        weekStartsOnMonday: true,
        mobileNavbarFixed: true,
        compactLayout: true,
        showSidebarTipCard: false,
      });
      return;
    }
    if (preset === "minimal") {
      setSettings({
        ...DEFAULT_APP_SETTINGS,
        reducedMotion: true,
        showFloatingAddButton: false,
        showPwaInstallPrompt: false,
        showSidebarTipCard: false,
        compactLayout: true,
      });
      return;
    }
    setSettings(DEFAULT_APP_SETTINGS);
  }, []);

  const exportSettings = useCallback(() => JSON.stringify(settings, null, 2), [settings]);

  const importSettings = useCallback((raw: string) => {
    try {
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      setSettings({ ...DEFAULT_APP_SETTINGS, ...parsed });
      return true;
    } catch {
      return false;
    }
  }, []);

  const value = useMemo<AppSettingsContextValue>(
    () => ({
      settings,
      updateSettings: (updates) => setSettings((prev) => ({ ...prev, ...updates })),
      resetSettings: () => setSettings(DEFAULT_APP_SETTINGS),
      applyPreset,
      exportSettings,
      importSettings,
    }),
    [settings, applyPreset, exportSettings, importSettings],
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error("useAppSettings must be used within AppSettingsProvider");
  return ctx;
}
