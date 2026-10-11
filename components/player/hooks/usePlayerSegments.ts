import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MediaSegment } from "../types";
import {
  MIN_INTRO_START_TIME_SEC,
  MIN_REMAINING_INTRO_TIME_SEC,
} from "../constants";
import { getSegments } from "@/lib/api/segments";

interface UsePlayerSegmentsParams {
  mediaId: string | number;
  imdbId?: string | null;
  mediaType: "movie" | "tv";
  currentSeason?: number;
  currentEpisode?: number;
  duration: number;
  runtime?: number | null;
  mediaKey: string;
  streamUrl?: string | null;
  staticSegments?: MediaSegment[];
  currentTime: number;
  autoSkipIntro?: boolean;
  isTv: boolean;
  hasNext: boolean;
  onSeekTo: (time: number) => void;
  onNextEpisode: () => void;
  onAutoNextExpired?: () => void;
  autoplay?: boolean;
}

export function usePlayerSegments({
  mediaId,
  imdbId,
  mediaType,
  currentSeason,
  currentEpisode,
  duration,
  runtime,
  mediaKey,
  streamUrl,
  staticSegments,
  currentTime,
  autoSkipIntro = false,
  isTv,
  hasNext,
  onSeekTo,
  onNextEpisode,
  onAutoNextExpired,
  autoplay = false,
}: UsePlayerSegmentsParams) {
  const [apiSegments, setApiSegments] = useState<MediaSegment[]>([]);
  const [dismissedIntro, setDismissedIntro] = useState(false);
  const [hasSkippedIntro, setHasSkippedIntro] = useState(false);
  const [dismissedNext, setDismissedNext] = useState(false);
  const [isNavigatingNext, setIsNavigatingNext] = useState(false);
  const fetchedSegmentKeyRef = useRef<string | null>(null);

  useEffect(() => {
    setApiSegments([]);
    setDismissedIntro(false);
    setHasSkippedIntro(false);
    setDismissedNext(false);
    setIsNavigatingNext(false);
    fetchedSegmentKeyRef.current = null;
  }, [mediaKey]);

  useEffect(() => {
    if (!streamUrl) {
      return;
    }

    if (fetchedSegmentKeyRef.current === mediaKey) {
      return;
    }
    fetchedSegmentKeyRef.current = mediaKey;

    const controller = new AbortController();
    const durationParam =
      duration > 0
        ? Math.round(duration)
        : runtime
        ? Math.round(runtime * 60)
        : undefined;

    void getSegments({
      imdbId,
      tmdbId: mediaId,
      mediaType,
      season: isTv ? currentSeason : undefined,
      episode: isTv ? currentEpisode : undefined,
      duration: durationParam,
      signal: controller.signal,
    }).then((segments) => {
      if (segments.length > 0) {
        setApiSegments(segments);
      }
    });

    return () => {
      controller.abort();
    };
  }, [
    currentEpisode,
    currentSeason,
    duration,
    imdbId,
    isTv,
    mediaId,
    mediaType,
    mediaKey,
    runtime,
    streamUrl,
  ]);

  const resolvedSegments =
    staticSegments && staticSegments.length > 0 ? staticSegments : apiSegments;

  const introSegment = resolvedSegments.find(
    (s) => s.type === "intro" || s.type === "recap"
  );

  useEffect(() => {
    if (!introSegment) return;
    const minStart = Math.max(introSegment.start, MIN_INTRO_START_TIME_SEC);
    if (currentTime < minStart) {
      setDismissedIntro(false);
      setHasSkippedIntro(false);
    }
  }, [introSegment, currentTime]);

  const isIntroActive = useMemo(() => {
    if (hasSkippedIntro || !introSegment) return false;
    const minStart = Math.max(introSegment.start, MIN_INTRO_START_TIME_SEC);

    if (introSegment.end - minStart < MIN_REMAINING_INTRO_TIME_SEC) {
      return false;
    }

    const isWithinIntro = currentTime >= minStart && currentTime < introSegment.end - 1;
    if (!isWithinIntro || dismissedIntro) return false;

    return true;
  }, [dismissedIntro, hasSkippedIntro, introSegment, currentTime]);

  const handleSkipIntro = useCallback(() => {
    if (!introSegment) return;
    setHasSkippedIntro(true);
    setDismissedIntro(true);
    onSeekTo(introSegment.end);
  }, [introSegment, onSeekTo]);

  useEffect(() => {
    if (!autoSkipIntro || hasSkippedIntro || !introSegment) {
      return;
    }

    const minStart = Math.max(introSegment.start, MIN_INTRO_START_TIME_SEC);
    if (introSegment.end - minStart < MIN_REMAINING_INTRO_TIME_SEC) {
      return;
    }

    if (currentTime >= minStart && currentTime < introSegment.end) {
      setHasSkippedIntro(true);
      setDismissedIntro(true);
      onSeekTo(introSegment.end);
    }
  }, [autoSkipIntro, hasSkippedIntro, introSegment, currentTime, onSeekTo]);

  const outroSegment = resolvedSegments.find((s) => s.type === "outro");
  const isNextEpisodeActive = useMemo(() => {
    if (!isTv || !hasNext || dismissedNext) return false;
    if (outroSegment) {
      return currentTime >= outroSegment.start;
    }
    return duration > 30 && currentTime >= duration - 15;
  }, [dismissedNext, hasNext, isTv, outroSegment, currentTime, duration]);

  const handleNextEpisodeClick = useCallback(() => {
    if (isNavigatingNext) return;
    setIsNavigatingNext(true);
    onNextEpisode();
  }, [isNavigatingNext, onNextEpisode]);

  const handleNextEpisodeExpire = useCallback(() => {
    if (autoplay) {
      if (isNavigatingNext) return;
      setIsNavigatingNext(true);
      onNextEpisode();
    } else {
      setDismissedNext(true);
      onAutoNextExpired?.();
    }
  }, [autoplay, isNavigatingNext, onNextEpisode, onAutoNextExpired]);

  return {
    isIntroActive,
    handleSkipIntro,
    dismissIntro: () => setDismissedIntro(true),
    isNextEpisodeActive,
    handleNextEpisodeClick,
    handleNextEpisodeExpire,
    dismissNext: () => setDismissedNext(true),
    isNavigatingNext,
    setIsNavigatingNext,
  };
}
