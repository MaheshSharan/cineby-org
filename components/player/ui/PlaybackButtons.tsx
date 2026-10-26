import { LoadingSpinner } from "./LoadingSpinner";

type PlaybackButtonsSize = "default" | "large";

interface PlaybackButtonsProps {
  isPlaying: boolean;
  seekTime: number;
  size?: PlaybackButtonsSize;
  isBuffering?: boolean;
  activeSeekSide?: "left" | "right" | null;
  showSeekButtons?: boolean;
  onTogglePlay: () => void;
  onSeekBy: (seconds: number) => void;
}

const BUTTON_CLASSES =
  "tabbable rounded-full hover:bg-white/20 transition-all duration-150 flex items-center justify-center active:scale-110 active:bg-white/30 active:text-white";

const ICON_CLASSES = "flex items-center justify-center w-[1em] h-[1em]";

const SIZE_CLASSES: Record<PlaybackButtonsSize, { button: string; playIcon: string; seekIcon: string }> = {
  default: {
    button: "p-2",
    playIcon: "text-3xl md:text-2xl",
    seekIcon: "text-3xl md:text-2xl",
  },
  large: {
    button: "p-4 sm:p-5",
    playIcon: "text-5xl sm:text-6xl",
    seekIcon: "text-3xl sm:text-4xl",
  },
};

export function PlaybackButtons({
  isPlaying,
  seekTime,
  size = "default",
  isBuffering = false,
  activeSeekSide = null,
  showSeekButtons = true,
  onTogglePlay,
  onSeekBy,
}: PlaybackButtonsProps) {
  const sizeClasses = SIZE_CLASSES[size];

  return (
    <>
      {showSeekButtons ? (
        <>
      {/* Rewind */}
      <button
        type="button"
        onClick={() => onSeekBy(-seekTime)}
        aria-label={`Rewind ${seekTime} seconds`}
        title={`Rewind ${seekTime} seconds (←)`}
        className={`${BUTTON_CLASSES} ${sizeClasses.button} ${
          activeSeekSide === "left" ? "scale-125 bg-white/30 text-white animate-pulse" : ""
        }`}
      >
        <span className={`${sizeClasses.seekIcon} ${ICON_CLASSES}`}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1em"
            height="1em"
            viewBox="0 0 25 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M13.6667 12.3333L9 7.66667M9 7.66667L13.6667 3M9 7.66667H18.3333C19.571 7.66667 20.758 8.15833 21.6332 9.0335C22.5083 9.90867 23 11.0957 23 12.3333C23 13.571 22.5083 14.758 21.6332 15.6332C20.758 16.5083 19.571 17 18.3333 17H16"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <text
              x="7.5"
              y="21.5"
              textAnchor="middle"
              fill="currentColor"
              fontSize="8.5"
              fontWeight="bold"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              {seekTime}
            </text>
          </svg>
        </span>
      </button>
        </>
      ) : null}

      {/* Play / Pause / Loading Spinner */}
      <button
        type="button"
        id="ButtonPlay"
        onClick={onTogglePlay}
        aria-label={isPlaying ? "Pause" : "Play"}
        title={isPlaying ? "Pause (space)" : "Play (space)"}
        className={`${BUTTON_CLASSES} ${sizeClasses.button}`}
      >
        <span className={`${sizeClasses.playIcon} ${ICON_CLASSES}`}>
          {isBuffering ? (
            <LoadingSpinner className="[&>svg]:h-[0.75em] [&>svg]:w-[0.75em]" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="1em"
              height="1em"
              viewBox="0 0 384 512"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d={
                  isPlaying
                    ? "M0 448V64c0-17.7 14.3-32 32-32s32 14.3 32 32V448c0 17.7-14.3 32-32 32S0 465.7 0 448zM256 64c0-17.7 14.3-32 32-32s32 14.3 32 32V448c0 17.7-14.3 32-32 32s-32-14.3-32-32V64z"
                    : "M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"
                }
              />
            </svg>
          )}
        </span>
      </button>

      {showSeekButtons ? (
        <>
      {/* Forward */}
      <button
        type="button"
        onClick={() => onSeekBy(seekTime)}
        aria-label={`Forward ${seekTime} seconds`}
        title={`Forward ${seekTime} seconds (→)`}
        className={`${BUTTON_CLASSES} ${sizeClasses.button} ${
          activeSeekSide === "right" ? "scale-125 bg-white/30 text-white animate-pulse" : ""
        }`}
      >
        <span className={`${sizeClasses.seekIcon} ${ICON_CLASSES}`}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1em"
            height="1em"
            viewBox="0 0 26 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M11.3333 12.3333L16 7.66667M16 7.66667L11.3333 3M16 7.66667H6.66667C5.42899 7.66667 4.242 8.15833 3.36684 9.0335C2.49167 9.90867 2 11.0957 2 12.3333C2 13.571 2.49167 14.758 3.36684 15.6332C4.242 16.5083 5.42899 17 6.66667 17H9"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <text
              x="19"
              y="21.5"
              textAnchor="middle"
              fill="currentColor"
              fontSize="8.5"
              fontWeight="bold"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              {seekTime}
            </text>
          </svg>
        </span>
      </button>
        </>
      ) : null}
    </>
  );
}
