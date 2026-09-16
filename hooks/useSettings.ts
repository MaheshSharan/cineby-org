import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import type { User } from "@/lib/db/types";
import {
  type CinebySettings,
  type AppearanceSettings,
  type PlaybackSettings,
  type SubtitlesSettings,
  DEFAULT_SETTINGS,
  normalizeApiSettings,
} from "@/lib/settings/types";

const SETTINGS_STORAGE_KEY = "cineby_settings";

function readSettingsFromStorage(): CinebySettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }

  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(raw) as Partial<CinebySettings>;
    return {
      appearance: {
        ...DEFAULT_SETTINGS.appearance,
        ...(parsed.appearance || {}),
      },
      playback: {
        ...DEFAULT_SETTINGS.playback,
        ...(parsed.playback || {}),
      },
      subtitles: {
        ...DEFAULT_SETTINGS.subtitles,
        ...(parsed.subtitles || {}),
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function applyTheme(theme: string): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme || "default");
}

function writeSettingsToStorage(settings: CinebySettings): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    applyTheme(settings.appearance.theme);
    window.dispatchEvent(new StorageEvent("storage", { key: SETTINGS_STORAGE_KEY }));
    window.dispatchEvent(new CustomEvent("cineby:settings-change", { detail: settings }));
  } catch {
    // Ignore quota or private browsing errors
  }
}

export function useSettings() {
  let user: User | null = null;
  try {
    const auth = useAuth();
    user = auth.user;
  } catch {
    user = null;
  }

  const [settings, setSettings] = useState<CinebySettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Background debounce sync to DB if user is logged in
  const syncToServer = useCallback(
    (nextSettings: CinebySettings) => {
      if (!user) return;

      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      syncTimeoutRef.current = setTimeout(async () => {
        try {
          await fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(nextSettings),
          });
        } catch {
          // Best effort sync; local storage remains responsive
        }
      }, 400);
    },
    [user]
  );

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // Initial load from localStorage
  useEffect(() => {
    const initial = readSettingsFromStorage();
    setSettings(initial);
    applyTheme(initial.appearance.theme);
    setIsLoaded(true);
  }, []);

  // Sync settings from server when user logs in or loads
  useEffect(() => {
    if (!user) return;

    let isCancelled = false;

    async function fetchServerSettings() {
      try {
        const response = await fetch("/api/settings");
        if (!response.ok || isCancelled) return;

        const data = (await response.json()) as unknown;
        const normalized = normalizeApiSettings(data);

        if (!isCancelled) {
          setSettings(normalized);
          writeSettingsToStorage(normalized);
        }
      } catch {
        // Fall back gracefully to localStorage
      }
    }

    void fetchServerSettings();

    return () => {
      isCancelled = true;
    };
  }, [user?.id]);

  // Sync across tabs and custom events
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === SETTINGS_STORAGE_KEY) {
        const next = readSettingsFromStorage();
        setSettings(next);
        applyTheme(next.appearance.theme);
      }
    };

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<CinebySettings>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
        applyTheme(customEvent.detail.appearance.theme);
      } else {
        const next = readSettingsFromStorage();
        setSettings(next);
        applyTheme(next.appearance.theme);
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("cineby:settings-change", handleCustomEvent);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("cineby:settings-change", handleCustomEvent);
    };
  }, []);

  const updateAppearance = useCallback(
    (patch: Partial<AppearanceSettings>) => {
      setSettings((prev) => {
        const next: CinebySettings = {
          ...prev,
          appearance: {
            ...prev.appearance,
            ...patch,
          },
        };
        writeSettingsToStorage(next);
        syncToServer(next);
        return next;
      });
    },
    [syncToServer]
  );

  const updatePlayback = useCallback(
    (patch: Partial<PlaybackSettings>) => {
      setSettings((prev) => {
        const next: CinebySettings = {
          ...prev,
          playback: {
            ...prev.playback,
            ...patch,
          },
        };
        writeSettingsToStorage(next);
        syncToServer(next);
        return next;
      });
    },
    [syncToServer]
  );

  const updateSubtitles = useCallback(
    (patch: Partial<SubtitlesSettings>) => {
      setSettings((prev) => {
        const next: CinebySettings = {
          ...prev,
          subtitles: {
            ...prev.subtitles,
            ...patch,
          },
        };
        writeSettingsToStorage(next);
        syncToServer(next);
        return next;
      });
    },
    [syncToServer]
  );

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    writeSettingsToStorage(DEFAULT_SETTINGS);
    syncToServer(DEFAULT_SETTINGS);
  }, [syncToServer]);

  return {
    settings,
    isLoaded,
    updateAppearance,
    updatePlayback,
    updateSubtitles,
    resetSettings,
  };
}

