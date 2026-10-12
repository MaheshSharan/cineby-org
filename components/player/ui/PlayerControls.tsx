import type { ReactNode } from "react";

import { PlaybackButtons } from "./PlaybackButtons";
import { SeekBar } from "./SeekBar";
import { TimeDisplay } from "./TimeDisplay";
import { VolumeControl } from "./VolumeControl";
import type { SegmentByteCache } from "@/lib/player/media/segmentByteCache";

interface PlayerControlsProps {
  visible: boolean;
  inert?: boolean;
  showPlaybackControls?: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  bufferedTime?: number;
  src?: string | null;
  mediaKey?: string;
  cache?: SegmentByteCache | null;
  hoverThumbnails?: boolean;
  thumbnailTrack?: string | null;
  volume: number;
  muted: boolean;
  seekTime?: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSeekBy: (seconds: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  centerSlot?: ReactNode;
}

export function PlayerControls({
  visible,
  inert,
  showPlaybackControls = true,
  isPlaying,
  currentTime,
  duration,
  bufferedTime = 0,
  src,
  mediaKey,
  cache,
  hoverThumbnails,
  thumbnailTrack,
  volume,
  muted,
  seekTime = 10,
  onTogglePlay,
  onSeek,
  onSeekBy,
  onVolumeChange,
  onToggleMute,
  onToggleFullscreen,
  centerSlot,
}: PlayerControlsProps) {
  return (
    <div
      data-player-ui
      inert={inert}
      className={`absolute bottom-0 left-0 right-0 z-30 h-44 flex items-end pointer-events-auto transition-[opacity,transform] duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <div className="w-full flex flex-col items-stretch pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-4 pt-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <div className="px-2 sm:px-4 md:px-10">
          {/* Seek row */}
          <div className="flex items-center gap-x-2 sm:gap-x-3">
            <div className="flex items-center flex-1">
              <SeekBar
                currentTime={currentTime}
                duration={duration}
                bufferedTime={bufferedTime}
                src={src}
                mediaKey={mediaKey}
                cache={cache}
                hoverThumbnails={hoverThumbnails}
                thumbnailTrack={thumbnailTrack}
                onSeek={onSeek}
              />
            </div>
            <TimeDisplay currentTime={currentTime} duration={duration} className="text-xs sm:text-sm" />
          </div>

          {/* Controls row */}
          <div className="relative flex items-center justify-between mt-1 sm:mt-2 md:mt-3">
            {/* Left Controls: Play/Pause, Rewind, Forward, Volume */}
            <div className="flex space-x-1 sm:space-x-2 md:space-x-3 items-center relative z-10">
              {showPlaybackControls ? (
                <>
                  <PlaybackButtons
                    isPlaying={isPlaying}
                    seekTime={seekTime}
                    onTogglePlay={onTogglePlay}
                    onSeekBy={onSeekBy}
                  />

                  {/* Volume */}
                  <VolumeControl
                    volume={volume}
                    muted={muted}
                    onVolumeChange={onVolumeChange}
                    onToggleMute={onToggleMute}
                  />
                </>
              ) : null}
            </div>

            {/* Center Controls: Episodes selector pill */}
            {centerSlot ? (
              <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none z-10">
                <div className="pointer-events-auto max-w-[40%] sm:max-w-none">{centerSlot}</div>
              </div>
            ) : null}

            {/* Right Controls: Fullscreen */}
            <div className="flex items-center gap-1 sm:gap-3 relative z-10">
              {/* Fullscreen */}
              <button
                type="button"
                id="ButtonFullscreen"
                onClick={onToggleFullscreen}
                aria-label="Fullscreen"
                title="Fullscreen (f)"
                className="tabbable p-2 rounded-full hover:bg-white/20 transition-transform duration-100 flex items-center gap-3 active:scale-110 active:bg-white/30 active:text-white"
              >
                <span className="text-3xl md:text-2xl flex items-center justify-center w-[1em] h-[1em]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="1em"
                    height="1em"
                    viewBox="0 0 448 512"
                    aria-hidden="true"
                  >
                    <path
                      fill="currentColor"
                      d="M32 32C14.3 32 0 46.3 0 64v96c0 17.7 14.3 32 32 32s32-14.3 32-32V96h64c17.7 0 32-14.3 32-32s-14.3-32-32-32H32zM320 32c-17.7 0-32 14.3-32 32s14.3 32 32 32h64v64c0 17.7 14.3 32 32 32s32-14.3 32-32V64c0-17.7-14.3-32-32-32H320zM32 320c-17.7 0-32 14.3-32 32v96c0 17.7 14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H64v-64c0-17.7-14.3-32-32-32zM416 320c-17.7 0-32 14.3-32 32v64h-64c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32v-96c0-17.7-14.3-32-32-32z"
                    />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
