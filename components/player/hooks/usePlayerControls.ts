import { useCallback, useEffect, useRef, useState } from "react";

import { AUTOHIDE_CONTROLS_MS } from "../constants";

interface UsePlayerControlsOptions {
  containerRef?: React.RefObject<HTMLDivElement | null>;
  seekTime?: number;
  isLocked?: boolean;
  keepVisible?: boolean;
  onTogglePlay: () => void;
  onSeekBy: (seconds: number) => void;
  onDoubleTapSeek?: (seconds: number, side: "left" | "right") => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onToggleSettings: () => void;
  onToggleSubtitles: () => void;
}

export interface UsePlayerControlsResult {
  areControlsVisible: boolean;
  isIdle: boolean;
  showControls: () => void;
}

const EVENT_TARGETS = new Set(["BUTTON", "INPUT", "SELECT", "TEXTAREA"]);

export function usePlayerControls({
  containerRef,
  seekTime = 10,
  isLocked = false,
  keepVisible = false,
  onTogglePlay,
  onSeekBy,
  onDoubleTapSeek,
  onToggleMute,
  onToggleFullscreen,
  onToggleSettings,
  onToggleSubtitles,
}: UsePlayerControlsOptions): UsePlayerControlsResult {
  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const [isIdle, setIsIdle] = useState(false);
  const hideTimerRef = useRef<number | null>(null);
  const mouseDownAtRef = useRef(0);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const singleTapTimerRef = useRef<number | null>(null);

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }

    if (keepVisible) {
      setAreControlsVisible(true);
      setIsIdle(false);
      return;
    }

    hideTimerRef.current = window.setTimeout(() => {
      setAreControlsVisible(false);
      setIsIdle(true);
    }, AUTOHIDE_CONTROLS_MS);
  }, [keepVisible]);

  const showControls = useCallback(() => {
    setAreControlsVisible(true);
    setIsIdle(false);
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    if (isLocked) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target && EVENT_TARGETS.has(target.tagName)) {
        return;
      }

      switch (event.key) {
        case " ":
        case "k":
          event.preventDefault();
          onTogglePlay();
          break;
        case "ArrowLeft":
          event.preventDefault();
          onSeekBy(-seekTime);
          break;
        case "ArrowRight":
          event.preventDefault();
          onSeekBy(seekTime);
          break;
        case "m":
          onToggleMute();
          break;
        case "f":
          onToggleFullscreen();
          break;
        case "ArrowUp":
          event.preventDefault();
          onToggleSettings();
          break;
        case "c":
          onToggleSubtitles();
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isLocked, onTogglePlay, onSeekBy, onToggleMute, onToggleFullscreen, onToggleSettings, onToggleSubtitles, seekTime]);

  // Keep callbacks fresh in refs so pointerdown/up listeners NEVER re-subscribe on re-renders
  const onTogglePlayRef = useRef(onTogglePlay);
  onTogglePlayRef.current = onTogglePlay;

  const onDoubleTapSeekRef = useRef(onDoubleTapSeek);
  onDoubleTapSeekRef.current = onDoubleTapSeek;

  const seekTimeRef = useRef(seekTime);
  seekTimeRef.current = seekTime;

  const showControlsRef = useRef(showControls);
  showControlsRef.current = showControls;

  useEffect(() => {
    // Cleanup of the previous run also cancels any pending single-tap play toggle when locking.
    if (isLocked) {
      return;
    }

    const onPointerMove = () => showControlsRef.current();
    const onPointerDown = (event: PointerEvent) => {
      mouseDownAtRef.current = Date.now();
      mouseDownPosRef.current = { x: event.clientX, y: event.clientY };
    };
    const onPointerUp = (event: PointerEvent) => {
      const start = mouseDownPosRef.current;
      if (!start) return;

      const now = Date.now();
      const dx = Math.abs(event.clientX - start.x);
      const dy = Math.abs(event.clientY - start.y);
      const quickTap = now - mouseDownAtRef.current < 300 && dx < 12 && dy < 12;

      // Only handle taps on media surface; taps on controls, buttons, modals,
      // or the seekbar must never toggle play or double-tap seek.
      const target = event.target as HTMLElement | null;
      const isPlayerUi =
        target?.closest("button, input, select, textarea, [role='slider'], [data-player-ui]") ??
        false;

      if (quickTap && !isPlayerUi) {
        const isDesktop =
          typeof window !== "undefined" &&
          window.matchMedia("(hover: hover) and (pointer: fine)").matches;

        const prevTap = lastTapRef.current;
        const containerRect = containerRef?.current?.getBoundingClientRect();
        const clientWidth = containerRect?.width ?? window.innerWidth;
        const clickX = event.clientX - (containerRect?.left ?? 0);
        const ratio = clickX / clientWidth;

        // Check if this tap constitutes a double tap (within 300ms and 40px)
        const isDoubleTap =
          prevTap !== null &&
          now - prevTap.time < 300 &&
          Math.abs(event.clientX - prevTap.x) < 40 &&
          Math.abs(event.clientY - prevTap.y) < 40;

        if (isDoubleTap && onDoubleTapSeekRef.current) {
          // Cancel any pending single-tap action
          if (singleTapTimerRef.current !== null) {
            window.clearTimeout(singleTapTimerRef.current);
            singleTapTimerRef.current = null;
          }
          lastTapRef.current = null;

          // Double tap: Left 40% -> rewind seekTime; Right 40% -> forward seekTime; Middle 20% -> regular play toggle
          if (ratio < 0.4) {
            onDoubleTapSeekRef.current(-seekTimeRef.current, "left");
          } else if (ratio > 0.6) {
            onDoubleTapSeekRef.current(seekTimeRef.current, "right");
          } else {
            onTogglePlayRef.current();
          }
        } else {
          lastTapRef.current = { time: now, x: event.clientX, y: event.clientY };

          if (isDesktop) {
            // On desktop: single click anywhere immediately toggles play/pause
            if (singleTapTimerRef.current !== null) {
              window.clearTimeout(singleTapTimerRef.current);
            }
            singleTapTimerRef.current = window.setTimeout(() => {
              onTogglePlayRef.current();
              singleTapTimerRef.current = null;
            }, 260);
          } else {
            // On mobile touch: single tap only toggles/shows controls (does NOT pause stream)
            // Controls visibility is handled below via showControlsRef
          }
        }
      }

      showControlsRef.current();
    };

    const targetElement = containerRef?.current ?? window;
    targetElement.addEventListener("pointermove", onPointerMove as EventListener);
    targetElement.addEventListener("pointerdown", onPointerDown as EventListener);
    targetElement.addEventListener("pointerup", onPointerUp as EventListener);

    return () => {
      targetElement.removeEventListener("pointermove", onPointerMove as EventListener);
      targetElement.removeEventListener("pointerdown", onPointerDown as EventListener);
      targetElement.removeEventListener("pointerup", onPointerUp as EventListener);
      if (singleTapTimerRef.current !== null) {
        window.clearTimeout(singleTapTimerRef.current);
      }
    };
  }, [containerRef, isLocked]);

  useEffect(() => {
    if (keepVisible) {
      setAreControlsVisible(true);
      setIsIdle(false);
    }
    scheduleHide();
    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, [scheduleHide, keepVisible]);

  return { areControlsVisible, isIdle, showControls };
}
