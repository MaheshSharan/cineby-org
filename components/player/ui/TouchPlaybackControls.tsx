import { PlaybackButtons } from "./PlaybackButtons";

interface TouchPlaybackControlsProps {
  visible: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  seekTime: number;
  activeSeekSide?: "left" | "right" | null;
  onTogglePlay: () => void;
  onSeekBy: (seconds: number) => void;
}

export function TouchPlaybackControls({
  visible,
  isPlaying,
  isBuffering,
  seekTime,
  activeSeekSide = null,
  onTogglePlay,
  onSeekBy,
}: TouchPlaybackControlsProps) {
  return (
    <div
      data-player-ui
      className={`absolute left-1/2 top-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-8 sm:gap-[3.75rem] transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <PlaybackButtons
        size="large"
        isPlaying={isPlaying}
        isBuffering={isBuffering}
        seekTime={seekTime}
        activeSeekSide={activeSeekSide}
        onTogglePlay={onTogglePlay}
        onSeekBy={onSeekBy}
      />
    </div>
  );
}
