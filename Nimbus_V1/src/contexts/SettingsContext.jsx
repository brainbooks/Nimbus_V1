import { createContext, useContext, useState, useEffect, useCallback } from "react";

// ==================================================
// SETTINGS CONTEXT — NIMBUS
// ==================================================
// Provides app-wide settings with localStorage persistence.
// Consumed by any component that needs to react to
// user preferences (accent color, layout, etc.)
// ==================================================

const STORAGE_KEY = "nimbus_settings";

const ACCENT_COLORS = [
  { id: "cyan",    label: "Cyan",    hue: 187, hex: "#00d4ff" },
  { id: "purple",  label: "Purple",  hue: 270, hex: "#a855f7" },
  { id: "emerald", label: "Emerald", hue: 155, hex: "#10b981" },
  { id: "rose",    label: "Rose",    hue: 350, hex: "#f43f5e" },
  { id: "amber",   label: "Amber",   hue: 38,  hex: "#f59e0b" },
  { id: "blue",    label: "Blue",    hue: 217, hex: "#3b82f6" },
];

const DEFAULT_SETTINGS = {
  // Appearance
  accentColor: "cyan",   // id from ACCENT_COLORS
  // Layout
  gridColumns: 4,        // 3 | 4 | 5
  cardSize: "medium",    // "small" | "medium" | "large"
  // Storage
  autoDeleteTrash: true, // auto-delete trash after 30 days
  trashRetentionDays: 30,
  defaultSort: "date",   // "date" | "name" | "size"
  // Notifications
  showUploadToast: true,
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      // corrupt localStorage — use defaults
    }
    return { ...DEFAULT_SETTINGS };
  });

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // storage full or unavailable
    }
  }, [settings]);

  // Apply accent color CSS variables
  useEffect(() => {
    const accent = ACCENT_COLORS.find((c) => c.id === settings.accentColor) || ACCENT_COLORS[0];
    document.documentElement.style.setProperty("--accent-hue", accent.hue);
  }, [settings.accentColor]);

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  const value = {
    settings,
    updateSetting,
    resetSettings,
    ACCENT_COLORS,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return ctx;
}

export default SettingsContext;
