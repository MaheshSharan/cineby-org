import React, { type ReactNode } from "react";

interface PlayerHeaderProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  visible: boolean;
  inert?: boolean;
  rightSlot?: ReactNode;
  /** "touch" uses a glass back button and larger title. */
  variant?: "default" | "touch";
}

export const PlayerHeader = React.memo(function PlayerHeader({
  title,
  subtitle,
  onBack,
  visible,
  inert,
  rightSlot,
  variant = "default",
}: PlayerHeaderProps) {
  const isTouch = variant === "touch";

  return (
    <div
      data-player-ui
      inert={inert}
      className={`absolute inset-x-0 top-0 z-40 transition-[opacity,transform] duration-300 ${
        visible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"
      }`}
    >
      <div className={`absolute top-0 left-0 right-0 z-20 flex items-center justify-between gap-x-2 sm:gap-x-4 md:gap-x-8 header-top ${
          isTouch
            ? "h-[90px] px-[max(1.375rem,env(safe-area-inset-left,0px))]"
            : "h-16 md:h-20 lg:h-24 px-2 sm:px-4 md:px-10"
        }`}>
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="Go back"
              className={`flex-shrink-0 flex items-center justify-center rounded-full text-white transition-colors ${
                isTouch
                  ? "h-12 w-12 border border-white/15 bg-black/30 backdrop-blur-md hover:bg-white/15"
                  : "w-10 h-10 md:w-11 md:h-11 hover:bg-white/10"
              }`}
            >
              <svg
                width="1.5em"
                height="1.5em"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M21 12L3 12M3 12L11.5 3.5M3 12L11.5 20.5"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : null}

          {title ? (
            <div className="min-w-0 flex flex-col justify-center">
              <h1
                className={`truncate font-bold text-white leading-tight ${
                  isTouch ? "text-lg md:text-xl" : "text-base md:text-xl"
                }`}
              >
                {title}
              </h1>
              {subtitle ? (
                <p
                  className={`truncate text-xs md:text-sm font-medium leading-normal mt-0.5 ${
                    isTouch ? "text-white/55" : "text-gray-400"
                  }`}
                >
                  {subtitle}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {rightSlot ? (
          <div className="flex-shrink-0 flex items-center gap-2 md:gap-3">
            {rightSlot}
          </div>
        ) : null}
      </div>
    </div>
  );
});
