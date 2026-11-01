import { useCallback, useRef, useState, useEffect } from "react";
import { useRouter } from "next/router";

import type { PlayerMedia } from "./types";
import { EmbedPlayer } from "./EmbedPlayer";
import { saveHistory } from "@/lib/api/history";
import { useAuth } from "@/components/auth/AuthProvider";
import type { PlayerModeConfig } from "@/lib/player/modeConfig";

interface PlayerShellProps {
  title: string;
  subtitle?: string;
  media?: PlayerMedia;
  modeConfig?: PlayerModeConfig;
  onBack?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onNavigateEpisode?: (seasonNumber: number, episodeNumber: number) => void;
}

export function PlayerShell({
  title,
  subtitle,
  media,
  modeConfig,
  onBack,
  onTimeUpdate,
  onEnded,
  onNavigateEpisode,
}: PlayerShellProps) {
  const router = useRouter();
  const { user } = useAuth();
  const lastSavedRef = useRef<{ time: number; seconds: number } | null>(null);

  // Read initial server from query (?server=...) or modeConfig default
  const queryServer = typeof router.query.server === "string" ? router.query.server.trim() : null;
  const initialServer =
    queryServer ||
    modeConfig?.defaultServer ||
    modeConfig?.servers[0]?.id ||
    "vidy";

  const [currentServerId, setCurrentServerId] = useState<string>(initialServer);

  useEffect(() => {
    if (queryServer && queryServer !== currentServerId) {
      setCurrentServerId(queryServer);
    }
  }, [queryServer, currentServerId]);

  const handleSelectServer = useCallback(
    (newServerId: string) => {
      setCurrentServerId(newServerId);
      const url = new URL(window.location.href);
      url.searchParams.set("server", newServerId);
      router.replace(url.pathname + url.search, undefined, { shallow: true });
    },
    [router]
  );

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

      // Hard minimum throttle: never hit the API more often than once every 10 seconds, even on seeks
      const timeSinceLastSave = last ? now - last.time : Infinity;
      if (timeSinceLastSave < 10000) {
        onTimeUpdate?.(currentTime, duration);
        return;
      }

      // Polling interval: Save every 30 seconds (or after 10s if a significant 15s+ seek occurred)
      const isSignificantSeek = last ? Math.abs(currentTime - last.seconds) >= 15 : false;
      const shouldSave = !last || timeSinceLastSave >= 30000 || isSignificantSeek;

      if (shouldSave) {
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

  const queryTime = typeof router.query.t === "string" ? Number.parseInt(router.query.t, 10) || 0 : 0;
  const initialTimeSec =
    queryTime > 0
      ? queryTime
      : media?.progressSeconds && media.progressSeconds > 0
      ? media.progressSeconds
      : media?.progress && media.runtime
      ? Math.round((media.progress / 100) * media.runtime * 60)
      : 0;
  const servers = modeConfig?.servers ?? [
    { id: "vidy", name: "Server 1 (Vidy)", type: "embed", startAtSupported: true, eventsSupported: true },
    { id: "vidnest", name: "Server 2 (VidNest)", type: "embed", startAtSupported: true, eventsSupported: true },
    { id: "vixsrc", name: "Server 3 (VixSrc)", type: "embed", startAtSupported: true, eventsSupported: true },
  ];

  return (
    <EmbedPlayer
      media={media ?? defaultMedia(title)}
      subtitle={subtitle}
      servers={servers}
      currentServerId={currentServerId}
      loadTimeoutMs={modeConfig?.loadTimeoutMs ?? 12000}
      initialTime={initialTimeSec}
      onBack={onBack}
      onSelectServer={handleSelectServer}
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
