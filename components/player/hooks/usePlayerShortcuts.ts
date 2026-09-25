import { useCallback, useEffect, useState } from "react";

export interface SeekFeedbackState {
  side: "left" | "right";
  seconds: number;
  key: number;
}

interface UsePlayerShortcutsOptions {
  isQualityOpen: boolean;
  isAudioSubtitlesOpen: boolean;
  isEpisodesOpen: boolean;
  onClosePopovers: () => void;
  onSeekBy?: (seconds: number) => void;
}

export interface UsePlayerShortcutsResult {
  seekFeedback: SeekFeedbackState | null;
  handleDoubleTapSeek: (seconds: number, side: "left" | "right") => void;
}

export function usePlayerShortcuts({
  isQualityOpen,
  isAudioSubtitlesOpen,
  isEpisodesOpen,
  onClosePopovers,
  onSeekBy,
}: UsePlayerShortcutsOptions): UsePlayerShortcutsResult {
  const [seekFeedback, setSeekFeedback] = useState<SeekFeedbackState | null>(null);

  const handleDoubleTapSeek = useCallback(
    (seconds: number, side: "left" | "right") => {
      onSeekBy?.(seconds);
      setSeekFeedback({ side, seconds: Math.abs(seconds), key: Date.now() });
    },
    [onSeekBy]
  );

  // Auto-dismiss double-tap seek feedback indicator
  useEffect(() => {
    if (!seekFeedback) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSeekFeedback(null);
    }, 650);

    return () => window.clearTimeout(timer);
  }, [seekFeedback]);

  // Close open popovers with Escape
  useEffect(() => {
    if (!isQualityOpen && !isAudioSubtitlesOpen && !isEpisodesOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClosePopovers();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isQualityOpen, isAudioSubtitlesOpen, isEpisodesOpen, onClosePopovers]);

  // Unlock orientation when fullscreen exits (e.g. back gesture or button)
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        try {
          const orientation = window.screen.orientation as {
            unlock?: () => void;
          };
          if (typeof orientation?.unlock === "function") {
            orientation.unlock();
          }
        } catch {
          // Orientation unlock may not be supported
        }
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  return {
    seekFeedback,
    handleDoubleTapSeek,
  };
}
