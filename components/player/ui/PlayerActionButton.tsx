import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { PlayerActionButtonShell } from "./PlayerActionButtonShell";

interface PlayerActionButtonProps {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  durationMs?: number;
  showProgress?: boolean;
  onDismiss?: () => void;
  onExpire?: () => void;
  className?: string;
  isControlsVisible?: boolean;
  isLoading?: boolean;
}

/**
 * Netflix-style floating player action button (Skip Intro / Next Episode).
 *
 * Features:
 * - Positioned on the bottom-right above the seek bar with consistent spacing on mobile and desktop.
 * - Smooth background progress fill sweeping from left to right when an expire action is present.
 * - Timer pauses on hover/touch so users have comfortable time to interact.
 * - Auto-dismisses with smooth fade/scale transition once timer completes, or triggers onExpire if provided.
 */
export function PlayerActionButton({
  label,
  onClick,
  icon,
  durationMs = 5000,
  showProgress = true,
  onDismiss,
  onExpire,
  className = "",
  isControlsVisible = true,
  isLoading = false,
}: PlayerActionButtonProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const shouldShowProgress = showProgress;

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss?.();
    }, 250);
  }, [onDismiss]);

  const handleComplete = useCallback(() => {
    if (onExpire) {
      onExpire();
    } else {
      handleDismiss();
    }
  }, [handleDismiss, onExpire]);

  useEffect(() => {
    // Reset timer whenever the button mounts or label changes
    setElapsedMs(0);
    setIsExiting(false);
    lastTimeRef.current = null;
  }, [label]);

  useEffect(() => {
    if (isExiting) return;

    const step = (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }

      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      // Only advance timer if not hovered and not currently loading
      if (!isHovered && !isLoading) {
        setElapsedMs((prev) => {
          const next = prev + delta;
          if (next >= durationMs) {
            handleComplete();
            return durationMs;
          }
          return next;
        });
      }

      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [durationMs, handleComplete, isExiting, isHovered, isLoading]);

  const progressPercent = Math.min(100, (elapsedMs / durationMs) * 100);

  return (
    <PlayerActionButtonShell
      label={label}
      onClick={onClick}
      icon={icon}
      progressPercent={shouldShowProgress ? progressPercent : null}
      isLoading={isLoading}
      isExiting={isExiting}
      isControlsVisible={isControlsVisible}
      className={className}
      onHoverChange={setIsHovered}
    />
  );
}
