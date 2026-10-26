import type { ReactNode } from "react";
import { Spinner } from "@/components/ui/Spinner";

interface PlayerActionButtonShellProps {
  label: string;
  onClick?: () => void;
  /** Undefined shows the default bolt icon, null shows none. */
  icon?: ReactNode | null;
  /** Width of the sweeping fill behind the label, 0 to 100. Null hides the fill. */
  progressPercent?: number | null;
  isLoading?: boolean;
  isDisabled?: boolean;
  /** Renders a non-interactive status chip instead of a button. */
  isStatic?: boolean;
  isExiting?: boolean;
  isControlsVisible?: boolean;
  className?: string;
  onHoverChange?: (isHovered: boolean) => void;
}

const DEFAULT_ICON = (
  <svg
    className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform duration-200 group-hover:translate-x-0.5"
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M5.536 21.886a1.004 1.004 0 0 1-.77-.364 1.01 1.01 0 0 1-.227-.852l1.642-7.67H3a1 1 0 0 1-.822-1.57l10-14a1.003 1.003 0 0 1 1.488-.135 1.01 1.01 0 0 1 .292.836l-1.642 7.669H21a1 1 0 0 1 .822 1.57l-10 14a1 1 0 0 1-.286.516z" />
  </svg>
);

const LABEL_CLASSES =
  "relative z-10 flex items-center gap-2 text-xs sm:text-sm font-bold tracking-wide select-none";

function getButtonStateClasses(isLoading: boolean, isDisabled: boolean): string {
  if (isLoading) {
    return "cursor-wait opacity-90";
  }

  if (isDisabled) {
    return "cursor-default opacity-90";
  }

  return "hover:scale-[1.04] hover:bg-white active:scale-95 cursor-pointer";
}

/**
 * Visual shell shared by every floating player action (Skip Intro, Next Episode, Skip Ad).
 * Owns the slot above the seek bar, bottom-right, and the button styling. Timing and behavior
 * stay with the caller.
 */
export function PlayerActionButtonShell({
  label,
  onClick,
  icon,
  progressPercent = null,
  isLoading = false,
  isDisabled = false,
  isStatic = false,
  isExiting = false,
  isControlsVisible = true,
  className = "",
  onHoverChange,
}: PlayerActionButtonShellProps) {
  const isInert = isLoading || isDisabled;

  return (
    <div
      data-player-ui
      className={`absolute right-[calc(1rem+env(safe-area-inset-right,0px))] sm:right-8 md:right-12 z-40 transition-all duration-300 pointer-events-auto ${
        isControlsVisible
          ? "bottom-[calc(7.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-32 md:bottom-32"
          : "bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-8 md:bottom-10"
      } ${
        isExiting
          ? "opacity-0 scale-90 pointer-events-none"
          : "opacity-100 scale-100 animate-in fade-in zoom-in-95 duration-200"
      } ${className}`}
    >
      {isStatic ? (
        <div
          role="status"
          className="rounded-md border border-white/20 bg-black/70 px-4 sm:px-5 py-2 sm:py-2.5 text-white shadow-2xl shadow-black/70 backdrop-blur-md"
        >
          <div className={LABEL_CLASSES}>{label}</div>
        </div>
      ) : (
        <button
          type="button"
          disabled={isInert}
          onClick={isInert ? undefined : onClick}
          onMouseEnter={() => onHoverChange?.(true)}
          onMouseLeave={() => onHoverChange?.(false)}
          onTouchStart={() => onHoverChange?.(true)}
          onTouchEnd={() => onHoverChange?.(false)}
          onTouchCancel={() => onHoverChange?.(false)}
          aria-label={label}
          aria-disabled={isInert}
          aria-busy={isLoading}
          className={`group relative overflow-hidden rounded-md border border-white/20 bg-white/95 px-4 sm:px-5 py-2 sm:py-2.5 text-black shadow-2xl shadow-black/70 backdrop-blur-md transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${getButtonStateClasses(
            isLoading,
            isDisabled
          )}`}
        >
          {/* Animated progress fill (moves left to right) */}
          {!isLoading && progressPercent !== null ? (
            <div
              className="pointer-events-none absolute inset-y-0 left-0 bg-black/15 transition-[width] duration-75 ease-linear rounded-l-md"
              style={{ width: `${progressPercent}%` }}
            />
          ) : null}

          <div className={LABEL_CLASSES}>
            <span>{label}</span>
            {isLoading ? (
              <Spinner size="sm" className="text-black" />
            ) : icon === undefined ? (
              DEFAULT_ICON
            ) : (
              icon
            )}
          </div>
        </button>
      )}
    </div>
  );
}
