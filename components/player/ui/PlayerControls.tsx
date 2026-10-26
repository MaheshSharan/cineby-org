import type { ReactNode } from "react";

import { FullscreenButton } from "./FullscreenButton";
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
  adCueSec?: number | null;
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
  adCueSec,
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
                adCueSec={adCueSec}
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
              <FullscreenButton onClick={onToggleFullscreen} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
