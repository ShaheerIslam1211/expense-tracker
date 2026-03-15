import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  actualTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, userData, loading, updateUserProfile } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => {
    // Try to get theme from localStorage first, fallback to system
    try {
      const stored = localStorage.getItem("theme") as Theme;
      return stored || "system";
    } catch {
      return "system";
    }
  });

  const [actualTheme, setActualTheme] = useState<"light" | "dark">("light");

  const applyTheme = useCallback((newTheme: Theme) => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    let actual: "light" | "dark";

    if (newTheme === "system") {
      actual = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } else {
      actual = newTheme;
    }

    root.classList.add(actual);
    setActualTheme(actual);

    // Store theme preference
    try {
      localStorage.setItem("theme", newTheme);
    } catch {
      // ignore
    }
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    if (user) {
      void updateUserProfile({ theme: newTheme });
    }
  }, [applyTheme, updateUserProfile, user]);

  // Apply theme on mount and when theme changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // Hydrate theme from Firebase profile for cross-device consistency.
  useEffect(() => {
    if (loading) return;
    if (!user) return;
    const cloudTheme = userData?.theme;
    if (!cloudTheme) return;
    if (cloudTheme === theme) return;
    setThemeState(cloudTheme);
    applyTheme(cloudTheme);
  }, [loading, user, userData?.theme, theme, applyTheme]);

  // Listen for system theme changes when theme is "system"
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      applyTheme("system");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, applyTheme]);

  const value = {
    theme,
    actualTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}