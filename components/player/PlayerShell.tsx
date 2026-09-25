import { useCallback, useRef } from "react";

import type { PlayerMedia } from "./types";
import { PlayerContainer } from "./PlayerContainer";
import { saveHistory } from "@/lib/api/history";
import { useAuth } from "@/components/auth/AuthProvider";

interface PlayerShellProps {
  title: string;
  subtitle?: string;
  media?: PlayerMedia;
  onBack?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onNavigateEpisode?: (seasonNumber: number, episodeNumber: number) => void;
}

export function PlayerShell({
  title,
  subtitle,
  media,
  onBack,
  onTimeUpdate,
  onEnded,
  onNavigateEpisode,
}: PlayerShellProps) {
  const { user } = useAuth();
  const lastSavedRef = useRef<{ time: number; seconds: number } | null>(null);

  const handleTimeUpdate = useCallback(
    (currentTime: number, duration: number, playback?: { seasonNumber?: number; episodeNumber?: number }) => {
      if (!media) return;

      // Playback Gating: Only record progress after at least 3 seconds of actual playback
      if (currentTime < 3) {
        onTimeUpdate?.(currentTime, duration);
        return;
      }

      const now = Date.now();
      const last = lastSavedRef.current;

      // Throttle: Save at most once every 5 seconds (or on significant seek)
      if (!last || now - last.time >= 5000 || Math.abs(currentTime - last.seconds) >= 10) {
        lastSavedRef.current = { time: now, seconds: currentTime };

        const calculatedPercent = Math.round((currentTime / Math.max(1, duration)) * 100);
        const effectiveProgress = currentTime > 5 && calculatedPercent === 0 ? 1 : calculatedPercent;

        saveHistory(
          {
            mediaType: media.mediaType,
            mediaId: media.mediaId,
            title,
            posterPath: media.posterPath ?? null,
            backdropPath: media.backdropPath ?? null,
            seasonNumber: playback?.seasonNumber ?? media.seasonNumber ?? null,
            episodeNumber: playback?.episodeNumber ?? media.episodeNumber ?? null,
            duration: media.duration ?? null,
            progress: effectiveProgress,
            progressSeconds: Math.floor(currentTime),
          },
          Boolean(user)
        ).catch(() => {});
      }

      onTimeUpdate?.(currentTime, duration);
    },
    [media, onTimeUpdate, title, user]
  );

  return (
    <PlayerContainer
      media={media ?? defaultMedia(title)}
      subtitle={subtitle}
      onBack={onBack}
      onTimeUpdate={handleTimeUpdate}
      onEnded={onEnded}
      onNavigateEpisode={onNavigateEpisode}
    />
  );
}

function defaultMedia(title: string): PlayerMedia {
  return {
    mediaType: "movie",
    mediaId: 0,
    title,
  };
}
