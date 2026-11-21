import { useCallback, useRef, useState, useEffect } from "react";
import { useRouter } from "next/router";

import type { PlayerMedia } from "./types";
import { EmbedPlayer } from "./EmbedPlayer";
import { useHistoryFlush } from "./hooks/useHistoryFlush";
import { queueHistorySave } from "@/lib/history/writeQueue";
import { useAuth } from "@/components/auth/AuthProvider";
import { resolveResumeSeconds } from "@/lib/history/resumePosition";
import type { PlayerModeConfig } from "@/lib/player/modeConfig";

const MIN_PLAYBACK_SECONDS = 3;
const MIN_CAPTURE_GAP_MS = 10_000;
const CAPTURE_INTERVAL_MS = 30_000;
const SIGNIFICANT_SEEK_SECONDS = 15;

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

  useHistoryFlush();

  // Read initial server from query (?server=...) or modeConfig default
  const queryServer = typeof router.query.server === "string" ? router.query.server.trim() : null;
  const initialServer =
    queryServer ||
    modeConfig?.defaultServer ||
    modeConfig?.servers[0]?.id ||
    "vidbolt";

  const [currentServerId, setCurrentServerId] = useState<string>(initialServer);

  useEffect(() => {
    if (queryServer && queryServer !== currentServerId) {
      setCurrentServerId(queryServer);
    }
  }, [queryServer, currentServerId]);

  // Where the reloaded player continues after a server switch; undefined until the viewer switches.
  const [switchResumeSeconds, setSwitchResumeSeconds] = useState<number | undefined>(undefined);

  // A resume position belongs to one title; another episode or movie starts from its own saved position.
  useEffect(() => {
    setSwitchResumeSeconds(undefined);
  }, [media?.mediaId, media?.seasonNumber, media?.episodeNumber]);

  const handleSelectServer = useCallback(
    async (newServerId: string, liveSeconds: number) => {
      if (media) {
        const resumeSeconds = await resolveResumeSeconds(media, liveSeconds, Boolean(user));
        setSwitchResumeSeconds(resumeSeconds);
      }

      setCurrentServerId(newServerId);
      const url = new URL(window.location.href);
      url.searchParams.set("server", newServerId);
      router.replace(url.pathname + url.search, undefined, { shallow: true });
    },
    [router, media, user]
  );

  const handleTimeUpdate = useCallback(
    (currentTime: number, duration: number, playback?: { seasonNumber?: number; episodeNumber?: number }) => {
      if (!media) return;

      // Playback Gating: Only record progress after a few seconds of actual playback
      if (currentTime < MIN_PLAYBACK_SECONDS) {
        onTimeUpdate?.(currentTime, duration);
        return;
      }

      const now = Date.now();
      const last = lastSavedRef.current;

      // Hard minimum throttle between captures, even on seeks
      const timeSinceLastSave = last ? now - last.time : Infinity;
      if (timeSinceLastSave < MIN_CAPTURE_GAP_MS) {
        onTimeUpdate?.(currentTime, duration);
        return;
      }

      // Capture progress into the history queue; the queue decides when it actually reaches the server
      const isSignificantSeek = last ? Math.abs(currentTime - last.seconds) >= SIGNIFICANT_SEEK_SECONDS : false;
      const shouldSave = !last || timeSinceLastSave >= CAPTURE_INTERVAL_MS || isSignificantSeek;

      if (shouldSave) {
        lastSavedRef.current = { time: now, seconds: currentTime };

        const totalDuration =
          duration > 0
            ? duration
            : media.runtime && media.runtime > 0
            ? media.runtime * 60
            : 0;

        const calculatedPercent =
          totalDuration > 0
            ? Math.min(100, Math.round((currentTime / totalDuration) * 100))
            : currentTime > 5
            ? 1
            : 0;

        const effectiveProgress = currentTime > 5 && calculatedPercent === 0 ? 1 : calculatedPercent;

        void queueHistorySave(
          {
            mediaType: media.mediaType,
            mediaId: media.mediaId,
            title,
            posterPath: media.posterPath ?? null,
            backdropPath: media.backdropPath ?? null,
            titleBackdropPath: media.titleBackdropPath ?? null,
            seasonNumber: playback?.seasonNumber ?? media.seasonNumber ?? null,
            episodeNumber: playback?.episodeNumber ?? media.episodeNumber ?? null,
            duration: media.duration ?? null,
            progress: effectiveProgress,
            progressSeconds: Math.floor(currentTime),
          },
          Boolean(user)
        );
      }

      onTimeUpdate?.(currentTime, duration);
    },
    [media, onTimeUpdate, title, user]
  );

  const queryTime = typeof router.query.t === "string" ? Number.parseInt(router.query.t, 10) || 0 : 0;
  // An explicit start time (Resume = N seconds, Start Over = 0) beats the URL, which beats saved progress.
  const initialTimeSec =
    media?.progressSeconds != null
      ? media.progressSeconds
      : queryTime > 0
      ? queryTime
      : media?.progress && media.runtime
      ? Math.round((media.progress / 100) * media.runtime * 60)
      : 0;
  const servers = modeConfig?.servers ?? [
    { id: "vidbolt", name: "VidBolt", type: "embed", startAtSupported: true, eventsSupported: true },
    { id: "vidy", name: "Vidy", type: "embed", startAtSupported: true, eventsSupported: true },
    { id: "vixsrc", name: "Vixsrc", type: "embed", startAtSupported: true, eventsSupported: true },
    { id: "framextv", name: "FrameXTV", type: "embed", startAtSupported: true, eventsSupported: true },
    { id: "vidrift", name: "VidRift", type: "embed", startAtSupported: true, eventsSupported: true },
    { id: "vidnest", name: "VidNest", type: "embed", startAtSupported: true, eventsSupported: true },
  ];

  return (
    <EmbedPlayer
      media={media ?? defaultMedia(title)}
      subtitle={subtitle}
      servers={servers}
      currentServerId={currentServerId}
      loadTimeoutMs={modeConfig?.loadTimeoutMs ?? 8000}
      initialTime={switchResumeSeconds ?? initialTimeSec}
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
