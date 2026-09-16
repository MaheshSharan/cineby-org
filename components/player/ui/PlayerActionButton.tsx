import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { Spinner } from "@/components/ui/Spinner";

interface PlayerActionButtonProps {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  durationMs?: number;
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
 * - Positioned on the bottom-right above the seek bar.
 * - Smooth background progress fill sweeping from left to right over durationMs (default 5s).
 * - Timer pauses on hover so users have comfortable time to click.
 * - Auto-dismisses with smooth fade/scale transition once timer completes, or triggers onExpire if provided.
 */
export function PlayerActionButton({
  label,
  onClick,
  icon,
  durationMs = 5000,
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
  }, [durationMs, handleDismiss, isExiting, isHovered, isLoading]);

  const progressPercent = Math.min(100, (elapsedMs / durationMs) * 100);

  return (
    <div
      data-player-ui
      className={`absolute right-4 sm:right-8 md:right-12 z-40 transition-all duration-300 pointer-events-auto ${
        isControlsVisible
          ? "bottom-20 sm:bottom-24 md:bottom-28"
          : "bottom-6 sm:bottom-8 md:bottom-10"
      } ${
        isExiting
          ? "opacity-0 scale-90 pointer-events-none"
          : "opacity-100 scale-100 animate-in fade-in zoom-in-95 duration-200"
      } ${className}`}
    >
      <button
        type="button"
        disabled={isLoading}
        onClick={isLoading ? undefined : onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label={label}
        aria-disabled={isLoading}
        aria-busy={isLoading}
        className={`group relative overflow-hidden rounded-md border border-white/20 bg-white/95 px-4 sm:px-5 py-2 sm:py-2.5 text-black shadow-2xl shadow-black/70 backdrop-blur-md transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
          isLoading
            ? "cursor-wait opacity-90"
            : "hover:scale-[1.04] hover:bg-white active:scale-95 cursor-pointer"
        }`}
      >
        {/* Animated Progress Fill Background (moves left to right) */}
        {!isLoading ? (
          <div
            className="pointer-events-none absolute inset-y-0 left-0 bg-black/15 transition-[width] duration-75 ease-linear rounded-l-md"
            style={{ width: `${progressPercent}%` }}
          />
        ) : null}

        {/* Content */}
        <div className="relative z-10 flex items-center gap-2 text-xs sm:text-sm font-bold tracking-wide select-none">
          <span>{label}</span>
          {isLoading ? (
            <Spinner size="sm" className="text-black" />
          ) : (
            icon ?? (
              <svg
                className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M5.536 21.886a1.004 1.004 0 0 1-.77-.364 1.01 1.01 0 0 1-.227-.852l1.642-7.67H3a1 1 0 0 1-.822-1.57l10-14a1.003 1.003 0 0 1 1.488-.135 1.01 1.01 0 0 1 .292.836l-1.642 7.669H21a1 1 0 0 1 .822 1.57l-10 14a1 1 0 0 1-.286.516z" />
              </svg>
            )
          )}
        </div>
      </button>
    </div>
  );
}
