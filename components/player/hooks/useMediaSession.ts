import { useEffect, useRef } from "react";

interface UseMediaSessionOptions {
  title: string;
  artist?: string;
  album?: string;
  artworkUrl?: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate?: number;
  seekTime?: number;
  onPlay: () => void;
  onPause: () => void;
  onSeekBy: (seconds: number) => void;
  onSeekTo?: (time: number) => void;
}

export function useMediaSession({
  title,
  artist = "Cineby",
  album,
  artworkUrl,
  isPlaying,
  currentTime,
  duration,
  playbackRate = 1,
  seekTime = 10,
  onPlay,
  onPause,
  onSeekBy,
  onSeekTo,
}: UseMediaSessionOptions): void {
  const onPlayRef = useRef(onPlay);
  const onPauseRef = useRef(onPause);
  const onSeekByRef = useRef(onSeekBy);
  const onSeekToRef = useRef(onSeekTo);
  const seekTimeRef = useRef(seekTime);
  const currentTimeRef = useRef(currentTime);

  useEffect(() => {
    onPlayRef.current = onPlay;
    onPauseRef.current = onPause;
    onSeekByRef.current = onSeekBy;
    onSeekToRef.current = onSeekTo;
    seekTimeRef.current = seekTime;
    currentTimeRef.current = currentTime;
  });

  // Metadata setup
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) {
      return;
    }

    const artwork: MediaImage[] = artworkUrl
      ? [
          {
            src: artworkUrl,
            sizes: "512x512",
            type: "image/jpeg",
          },
        ]
      : [];

    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      album: album ?? "",
      artwork,
    });

    return () => {
      if (typeof window !== "undefined" && "mediaSession" in navigator) {
        navigator.mediaSession.metadata = null;
      }
    };
  }, [title, artist, album, artworkUrl]);

  // Action handlers registration
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) {
      return;
    }

    const session = navigator.mediaSession;

    const playHandler = () => {
      onPlayRef.current();
    };

    const pauseHandler = () => {
      onPauseRef.current();
    };

    const seekBackwardHandler = (details: MediaSessionActionDetails) => {
      const skipSeconds = details.seekOffset ?? seekTimeRef.current;
      onSeekByRef.current(-skipSeconds);
    };

    const seekForwardHandler = (details: MediaSessionActionDetails) => {
      const skipSeconds = details.seekOffset ?? seekTimeRef.current;
      onSeekByRef.current(skipSeconds);
    };

    const seekToHandler = (details: MediaSessionActionDetails) => {
      if (typeof details.seekTime === "number") {
        if (onSeekToRef.current) {
          onSeekToRef.current(details.seekTime);
        } else {
          onSeekByRef.current(details.seekTime - currentTimeRef.current);
        }
      }
    };

    try {
      session.setActionHandler("play", playHandler);
      session.setActionHandler("pause", pauseHandler);
      session.setActionHandler("seekbackward", seekBackwardHandler);
      session.setActionHandler("seekforward", seekForwardHandler);
      session.setActionHandler("seekto", seekToHandler);
    } catch {
      // Some browsers do not support all media session actions
    }

    return () => {
      try {
        session.setActionHandler("play", null);
        session.setActionHandler("pause", null);
        session.setActionHandler("seekbackward", null);
        session.setActionHandler("seekforward", null);
        session.setActionHandler("seekto", null);
      } catch {
        // Ignore unbind errors during cleanup
      }
    };
  }, []);

  // Playback state synchronization
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator)) {
      return;
    }

    navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [isPlaying]);

  // Position state synchronization
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("mediaSession" in navigator) ||
      typeof navigator.mediaSession.setPositionState !== "function"
    ) {
      return;
    }

    if (Number.isFinite(duration) && duration > 0) {
      const clampedPosition = Math.min(Math.max(0, currentTime), duration);
      try {
        navigator.mediaSession.setPositionState({
          duration,
          playbackRate,
          position: clampedPosition,
        });
      } catch {
        // Ignore invalid position update errors
      }
    }
  }, [currentTime, duration, playbackRate]);
}
