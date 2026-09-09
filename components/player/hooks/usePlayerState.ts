import { useCallback, useEffect, useRef, useState } from "react";

import type { PlaybackRate, QualityLabel, SubtitleTrack } from "../types";

interface UsePlayerStateOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  autoPlay?: boolean;
  initialSeekTime?: number;
}

export interface UsePlayerStateResult {
  isPlaying: boolean;
  isBuffering: boolean;
  isEnded: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  rate: PlaybackRate;
  quality: QualityLabel | null;
  subtitleLang: string | null;
  togglePlay: () => void;
  seekTo: (time: number) => void;
  seekBy: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setRate: (rate: PlaybackRate) => void;
  setQuality: (quality: QualityLabel | null) => void;
  setSubtitleLang: (lang: string | null) => void;
  setSubtitleTrack: (track: SubtitleTrack | null) => void;
}

export function usePlayerState({
  videoRef,
  autoPlay = false,
  initialSeekTime = 0,
}: UsePlayerStateOptions): UsePlayerStateResult {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialSeekTime);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [rate, setRateState] = useState<PlaybackRate>(1);
  const [quality, setQuality] = useState<QualityLabel | null>(null);
  const [subtitleLang, setSubtitleLang] = useState<string | null>(null);

  const initialSeekDoneRef = useRef(false);
  const lastTimeUpdateRef = useRef(0);

  const syncFromVideo = useCallback(
    (force = false) => {
      const element = videoRef.current;
      if (!element) return;

      const now = performance.now();
      // Throttle timeupdate event dispatch to ~250ms (4 times per second) unless forced (pause/seek/ended)
      if (!force && now - lastTimeUpdateRef.current < 250) {
        return;
      }
      lastTimeUpdateRef.current = now;

      const time = element.currentTime;
      setCurrentTime(time);

      const dur = element.duration;
      if (Number.isFinite(dur) && dur > 0) {
        setDuration((prev) => (prev !== dur ? dur : prev));
      }
    },
    [videoRef]
  );

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    const handleLoadedMetadata = () => {
      syncFromVideo(true);
      if (!initialSeekDoneRef.current && initialSeekTime > 0) {
        initialSeekDoneRef.current = true;
        const safeDuration = Number.isFinite(element.duration) ? element.duration : initialSeekTime;
        const target = Math.min(Math.max(0, initialSeekTime), safeDuration);
        element.currentTime = target;
        setCurrentTime(target);
      }
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => {
      setIsPlaying(false);
      syncFromVideo(true);
    };
    const onEnded = () => {
      setIsEnded(true);
      setIsPlaying(false);
      syncFromVideo(true);
    };
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => {
      setIsBuffering(false);
      setIsEnded(false);
    };
    const onPlayable = () => setIsBuffering(false);
    const onSeeked = () => {
      setIsBuffering(false);
      syncFromVideo(true);
    };
    const onTimeUpdate = () => syncFromVideo(false);

    element.addEventListener("play", onPlay);
    element.addEventListener("pause", onPause);
    element.addEventListener("ended", onEnded);
    element.addEventListener("waiting", onWaiting);
    element.addEventListener("playing", onPlaying);
    element.addEventListener("canplay", onPlayable);
    element.addEventListener("loadeddata", onPlayable);
    element.addEventListener("seeked", onSeeked);
    element.addEventListener("timeupdate", onTimeUpdate);
    element.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      element.removeEventListener("play", onPlay);
      element.removeEventListener("pause", onPause);
      element.removeEventListener("ended", onEnded);
      element.removeEventListener("waiting", onWaiting);
      element.removeEventListener("playing", onPlaying);
      element.removeEventListener("canplay", onPlayable);
      element.removeEventListener("loadeddata", onPlayable);
      element.removeEventListener("seeked", onSeeked);
      element.removeEventListener("timeupdate", onTimeUpdate);
      element.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [initialSeekTime, syncFromVideo, videoRef]);

  const togglePlay = useCallback(() => {
    const element = videoRef.current;
    if (!element) return;

    if (element.paused) {
      void element.play().catch(() => {});
    } else {
      element.pause();
    }
  }, [videoRef]);

  const seekTo = useCallback(
    (time: number) => {
      const element = videoRef.current;
      if (!element) return;
      const safeDuration = Number.isFinite(element.duration) ? element.duration : time;
      const targetTime = Math.min(Math.max(0, time), safeDuration);
      element.currentTime = targetTime;
      setCurrentTime(targetTime);
    },
    [videoRef]
  );

  const seekBy = useCallback(
    (seconds: number) => {
      const element = videoRef.current;
      if (!element) return;
      element.currentTime += seconds;
      setCurrentTime(element.currentTime);
    },
    [videoRef]
  );

  const setVolume = useCallback(
    (nextVolume: number) => {
      const clamped = Math.min(1, Math.max(0, nextVolume));
      setVolumeState(clamped);
      const element = videoRef.current;
      if (element) {
        element.volume = clamped;
        element.muted = clamped === 0;
      }
    },
    [videoRef]
  );

  const toggleMute = useCallback(() => {
    const element = videoRef.current;
    if (!element) return;
    const nextMuted = !element.muted;
    element.muted = nextMuted;
    setMuted(nextMuted);
  }, [videoRef]);

  const setRate = useCallback(
    (nextRate: PlaybackRate) => {
      setRateState(nextRate);
      const element = videoRef.current;
      if (element) element.playbackRate = nextRate;
    },
    [videoRef]
  );

  const setSubtitleTrack = useCallback((track: SubtitleTrack | null) => {
    setSubtitleLang(track?.lang ?? null);
  }, []);

  return {
    isPlaying,
    isBuffering,
    isEnded,
    currentTime,
    duration,
    volume,
    muted,
    rate,
    quality,
    subtitleLang,
    togglePlay,
    seekTo,
    seekBy,
    setVolume,
    toggleMute,
    setRate,
    setQuality,
    setSubtitleLang,
    setSubtitleTrack,
  };
}
