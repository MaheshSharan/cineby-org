import { useCallback, useEffect, useState } from "react";

import {
  type CinebySettings,
  type AppearanceSettings,
  type PlaybackSettings,
  type SubtitlesSettings,
  DEFAULT_SETTINGS,
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

function writeSettingsToStorage(settings: CinebySettings): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new StorageEvent("storage", { key: SETTINGS_STORAGE_KEY }));
    window.dispatchEvent(new CustomEvent("cineby:settings-change", { detail: settings }));
  } catch {
    // Ignore quota or private browsing errors
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<CinebySettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setSettings(readSettingsFromStorage());
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === SETTINGS_STORAGE_KEY) {
        setSettings(readSettingsFromStorage());
      }
    };

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<CinebySettings>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      } else {
        setSettings(readSettingsFromStorage());
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("cineby:settings-change", handleCustomEvent);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("cineby:settings-change", handleCustomEvent);
    };
  }, []);

  const updateAppearance = useCallback((patch: Partial<AppearanceSettings>) => {
    setSettings((prev) => {
      const next: CinebySettings = {
        ...prev,
        appearance: {
          ...prev.appearance,
          ...patch,
        },
      };
      writeSettingsToStorage(next);
      return next;
    });
  }, []);

  const updatePlayback = useCallback((patch: Partial<PlaybackSettings>) => {
    setSettings((prev) => {
      const next: CinebySettings = {
        ...prev,
        playback: {
          ...prev.playback,
          ...patch,
        },
      };
      writeSettingsToStorage(next);
      return next;
    });
  }, []);

  const updateSubtitles = useCallback((patch: Partial<SubtitlesSettings>) => {
    setSettings((prev) => {
      const next: CinebySettings = {
        ...prev,
        subtitles: {
          ...prev.subtitles,
          ...patch,
        },
      };
      writeSettingsToStorage(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    writeSettingsToStorage(DEFAULT_SETTINGS);
  }, []);

  return {
    settings,
    isLoaded,
    updateAppearance,
    updatePlayback,
    updateSubtitles,
    resetSettings,
  };
}
