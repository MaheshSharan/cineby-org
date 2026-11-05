import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { getJson, sendJson } from "@/lib/api/client";
import type { User } from "@/lib/db/types";
import { readSessionSnapshot, updateSessionSettings } from "@/lib/session/sessionStore";
import {
  type CinebySettings,
  type AppearanceSettings,
  type PlaybackSettings,
  type SubtitlesSettings,
  DEFAULT_SETTINGS,
  normalizeApiSettings,
} from "@/lib/settings/types";

const SETTINGS_STORAGE_KEY = "cineby_settings";
// Settings are edited in bursts (sliders, color pickers), so wait for the user to settle.
const SETTINGS_SYNC_DEBOUNCE_MS = 3000;

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

  // Keep the session snapshot in step, or the next page load would restore the previous settings.
  updateSessionSettings(settings);

  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    applyTheme(settings.appearance.theme);
    window.dispatchEvent(new CustomEvent("cineby:settings-change", { detail: settings }));
  } catch {
    // Ignore quota or private browsing errors
  }
}

interface SettingsContextType {
  settings: CinebySettings;
  isLoaded: boolean;
  updateAppearance: (patch: Partial<AppearanceSettings>) => void;
  updatePlayback: (patch: Partial<PlaybackSettings>) => void;
  updateSubtitles: (patch: Partial<SubtitlesSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
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
  const settingsRef = useRef<CinebySettings>(DEFAULT_SETTINGS);
  // Serialized settings the server is known to have, so identical saves are never sent.
  const lastSyncedRef = useRef<string | null>(null);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const userRef = useRef<User | null>(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const sendSettingsToServer = useCallback(async (keepalive: boolean) => {
    const serialized = JSON.stringify(settingsRef.current);
    if (!userRef.current || serialized === lastSyncedRef.current) return;

    try {
      const response = await sendJson("/api/settings", "POST", settingsRef.current, { keepalive });
      if (response.ok) {
        lastSyncedRef.current = serialized;
      }
    } catch {
      // Best effort sync; local storage remains responsive and the next change retries.
    }
  }, []);

  // Background debounce sync to DB if user is logged in
  const syncToServer = useCallback(() => {
    if (!userRef.current) return;

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      syncTimeoutRef.current = null;
      void sendSettingsToServer(false);
    }, SETTINGS_SYNC_DEBOUNCE_MS);
  }, [sendSettingsToServer]);

  // Send a pending change right away when the page is hidden or the provider unmounts,
  // so the longer debounce never drops an edit.
  useEffect(() => {
    function flushPendingSync(keepalive: boolean) {
      if (!syncTimeoutRef.current) return;
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
      void sendSettingsToServer(keepalive);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") flushPendingSync(true);
    }

    function handlePageHide() {
      flushPendingSync(true);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      flushPendingSync(false);
    };
  }, [sendSettingsToServer]);

  // Initial load from localStorage
  useEffect(() => {
    const initial = readSettingsFromStorage();
    settingsRef.current = initial;
    setSettings(initial);
    applyTheme(initial.appearance.theme);
    setIsLoaded(true);
  }, []);

  // Sync settings from server ONCE when user logs in or loads
  useEffect(() => {
    if (!user) return;

    let isCancelled = false;

    async function fetchServerSettings() {
      try {
        // The session snapshot already carries this user's settings, so a page load needs no request.
        const snapshot = readSessionSnapshot();
        const normalized =
          snapshot && snapshot.user.id === userRef.current?.id
            ? snapshot.settings
            : normalizeApiSettings(await getJson<unknown>("/api/settings"));
        if (isCancelled) return;

        if (!isCancelled) {
          settingsRef.current = normalized;
          lastSyncedRef.current = JSON.stringify(normalized);
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
        settingsRef.current = next;
        setSettings(next);
        applyTheme(next.appearance.theme);
      }
    };

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<CinebySettings>;
      if (customEvent.detail) {
        settingsRef.current = customEvent.detail;
        setSettings(customEvent.detail);
        applyTheme(customEvent.detail.appearance.theme);
      } else {
        const next = readSettingsFromStorage();
        settingsRef.current = next;
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
      const current = settingsRef.current;
      const next: CinebySettings = {
        ...current,
        appearance: {
          ...current.appearance,
          ...patch,
        },
      };
      settingsRef.current = next;
      setSettings(next);
      writeSettingsToStorage(next);
      syncToServer();
    },
    [syncToServer]
  );

  const updatePlayback = useCallback(
    (patch: Partial<PlaybackSettings>) => {
      const current = settingsRef.current;
      const next: CinebySettings = {
        ...current,
        playback: {
          ...current.playback,
          ...patch,
        },
      };
      settingsRef.current = next;
      setSettings(next);
      writeSettingsToStorage(next);
      syncToServer();
    },
    [syncToServer]
  );

  const updateSubtitles = useCallback(
    (patch: Partial<SubtitlesSettings>) => {
      const current = settingsRef.current;
      const next: CinebySettings = {
        ...current,
        subtitles: {
          ...current.subtitles,
          ...patch,
        },
      };
      settingsRef.current = next;
      setSettings(next);
      writeSettingsToStorage(next);
      syncToServer();
    },
    [syncToServer]
  );

  const resetSettings = useCallback(() => {
    settingsRef.current = DEFAULT_SETTINGS;
    setSettings(DEFAULT_SETTINGS);
    writeSettingsToStorage(DEFAULT_SETTINGS);
    syncToServer();
  }, [syncToServer]);

  const contextValue = useMemo<SettingsContextType>(
    () => ({
      settings,
      isLoaded,
      updateAppearance,
      updatePlayback,
      updateSubtitles,
      resetSettings,
    }),
    [
      settings,
      isLoaded,
      updateAppearance,
      updatePlayback,
      updateSubtitles,
      resetSettings,
    ]
  );

  return createElement(
    SettingsContext.Provider,
    {
      value: contextValue,
    },
    children
  );
}

export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  if (!context) {
    return {
      settings: DEFAULT_SETTINGS,
      isLoaded: true,
      updateAppearance: () => {},
      updatePlayback: () => {},
      updateSubtitles: () => {},
      resetSettings: () => {},
    };
  }
  return context;
}

