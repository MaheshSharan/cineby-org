import React, { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { buildImageUrl } from "@/lib/tmdb/image";

import type { PlayerMedia } from "../types";
import { PlayerHeader } from "./ui/PlayerHeader";
import { ServerDrawer } from "./ui/ServerDrawer";
import { useEmbedBridge } from "./hooks/useEmbedBridge";
import { getEmbedProvider } from "@/lib/embeds/registry";
import type { PlayerServerOption } from "@/lib/player/modeConfig";

interface EmbedPlayerProps {
  media: PlayerMedia;
  subtitle?: string;
  servers: PlayerServerOption[];
  currentServerId: string;
  loadTimeoutMs: number;
  initialTime?: number;
  onBack?: () => void;
  onSelectServer: (serverId: string) => void;
  onTimeUpdate?: (currentTime: number, duration: number, playback?: { seasonNumber?: number; episodeNumber?: number }) => void;
  onEnded?: () => void;
  onNavigateEpisode?: (seasonNumber: number, episodeNumber: number) => void;
}

export function EmbedPlayer({
  media,
  subtitle,
  servers,
  currentServerId,
  loadTimeoutMs,
  initialTime = 0,
  onBack,
  onSelectServer,
  onTimeUpdate,
  onEnded,
  onNavigateEpisode,
}: EmbedPlayerProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const provider = useMemo(() => getEmbedProvider(currentServerId), [currentServerId]);

  // Construct iframe URL
  const embedUrl = useMemo(() => {
    if (!provider) return "";
    return provider.buildUrl({
      type: media.mediaType,
      tmdbId: media.mediaId,
      imdbId: media.imdbId,
      season: media.seasonNumber ?? 1,
      episode: media.episodeNumber ?? 1,
      startAtSec: initialTime > 0 ? initialTime : undefined,
      autoplay: true,
      lang: "en",
    });
  }, [provider, media, initialTime]);

  // Handle load timeout
  useEffect(() => {
    setIsLoaded(false);
    setHasTimedOut(false);

    const timer = setTimeout(() => {
      setIsLoaded((loaded) => {
        if (!loaded) {
          setHasTimedOut(true);
        }
        return loaded;
      });
    }, loadTimeoutMs || 12000);

    return () => clearTimeout(timer);
  }, [embedUrl, loadTimeoutMs]);

  // Fallback 60s progress check for providers without events
  useEffect(() => {
    if (provider?.capabilities.events) return;

    // After 60 seconds of playback, register that it started
    const timer = setTimeout(() => {
      onTimeUpdate?.(60, 0, {
        seasonNumber: media.seasonNumber,
        episodeNumber: media.episodeNumber,
      });
    }, 60000);

    return () => clearTimeout(timer);
  }, [provider, media, onTimeUpdate]);

  // Bridge postMessage events
  useEmbedBridge({
    serverId: currentServerId,
    iframeRef,
    onTimeUpdate: (current, duration) => {
      setIsLoaded(true);
      setHasTimedOut(false);
      onTimeUpdate?.(current, duration, {
        seasonNumber: media.seasonNumber,
        episodeNumber: media.episodeNumber,
      });
    },
    onEnded: () => {
      onEnded?.();
      // Auto navigate to next episode if available
      if (media.mediaType === "tv" && media.seasonNumber && media.episodeNumber && onNavigateEpisode) {
        onNavigateEpisode(media.seasonNumber, media.episodeNumber + 1);
      }
    },
  });

  const nextServer = useMemo(() => {
    const currentIndex = servers.findIndex((s) => s.id === currentServerId);
    if (currentIndex >= 0 && currentIndex + 1 < servers.length) {
      return servers[currentIndex + 1];
    }
    return servers.find((s) => s.id !== currentServerId);
  }, [servers, currentServerId]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none">
      {/* Header with Server selector */}
      <PlayerHeader
        title={media.title}
        subtitle={subtitle}
        onBack={onBack}
        visible={true}
        variant="touch"
        rightSlot={
          <div className="flex items-center gap-2">
            {servers.length > 1 && (
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/15 bg-black/40 backdrop-blur-md text-white/90 hover:text-white hover:bg-white/10 text-xs font-semibold transition-all shadow-lg"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Server: {provider?.name ?? currentServerId}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
        }
      />

      {/* Loading & Timeout Overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-none">
          {media.backdropPath && (
            <Image
              src={buildImageUrl(media.backdropPath, "backdrop", "original") || ""}
              alt=""
              fill
              priority
              className="object-cover opacity-20 pointer-events-none"
            />
          )}


          {!hasTimedOut ? (
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-white/70">Connecting to {provider?.name ?? "stream"}...</p>
            </div>
          ) : (
            <div className="relative z-10 flex flex-col items-center gap-4 text-center px-4 max-w-md pointer-events-auto">
              <div className="p-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Playback taking longer than expected</h3>
                <p className="text-xs text-white/60 mt-1">
                  The current server might be experiencing high load or restrictions.
                </p>
              </div>
              {nextServer && (
                <button
                  type="button"
                  onClick={() => onSelectServer(nextServer.id)}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-xs transition-colors shadow-lg shadow-red-600/30"
                >
                  Switch to {nextServer.name}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Embedded Player Iframe */}
      {embedUrl ? (
        <iframe
          key={`${currentServerId}-${media.mediaId}-${media.seasonNumber ?? 0}-${media.episodeNumber ?? 0}`}
          ref={iframeRef}
          src={embedUrl}
          title={media.title}
          allow={provider?.iframe.allow ?? "fullscreen"}
          referrerPolicy={provider?.iframe.referrerPolicy ?? "origin"}
          sandbox={provider?.iframe.sandbox}
          className="w-full h-full border-0"
          onLoad={() => setIsLoaded(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white/50 text-sm">
          No embed player available for this media.
        </div>
      )}

      {/* Server Selection Drawer */}
      <ServerDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        servers={servers}
        currentServerId={currentServerId}
        onSelectServer={onSelectServer}
      />
    </div>
  );
}
