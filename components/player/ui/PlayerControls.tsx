import type { ReactNode } from "react";

import { SeekBar } from "./SeekBar";
import { TimeDisplay } from "./TimeDisplay";
import { VolumeControl } from "./VolumeControl";

interface PlayerControlsProps {
  visible: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  bufferedTime?: number;
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
  isPlaying,
  currentTime,
  duration,
  bufferedTime = 0,
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
      className={`absolute bottom-0 left-0 right-0 z-30 h-44 flex items-end pointer-events-auto transition-[opacity,transform] duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <div className="w-full flex flex-col items-stretch pb-3 sm:pb-4 pt-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <div className="px-2 sm:px-4 md:px-10">
          {/* Seek row */}
          <div className="flex items-center gap-x-2 sm:gap-x-3">
            <div className="flex items-center flex-1">
              <SeekBar
                currentTime={currentTime}
                duration={duration}
                bufferedTime={bufferedTime}
                onSeek={onSeek}
              />
            </div>
            <TimeDisplay currentTime={currentTime} duration={duration} className="text-xs sm:text-sm" />
          </div>

          {/* Controls row */}
          <div className="relative flex items-center justify-between mt-1 sm:mt-2 md:mt-3">
            {/* Left Controls: Play/Pause, Rewind, Forward, Volume */}
            <div className="flex space-x-1 sm:space-x-2 md:space-x-3 items-center relative z-10">
              {/* Play / Pause */}
              <button
                type="button"
                id="ButtonPlay"
                onClick={onTogglePlay}
                aria-label={isPlaying ? "Pause" : "Play"}
                title={isPlaying ? "Pause (space)" : "Play (space)"}
                className="tabbable p-2 rounded-full hover:bg-white/20 transition-transform duration-100 flex items-center gap-3 active:scale-110 active:bg-white/30 active:text-white"
              >
                <span className="text-3xl md:text-2xl flex items-center justify-center w-[1em] h-[1em]">
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
                </span>
              </button>

              {/* Rewind */}
              <button
                type="button"
                onClick={() => onSeekBy(-seekTime)}
                aria-label={`Rewind ${seekTime} seconds`}
                title={`Rewind ${seekTime} seconds (←)`}
                className="tabbable p-2 rounded-full hover:bg-white/20 transition-transform duration-100 flex items-center gap-3 active:scale-110 active:bg-white/30 active:text-white"
              >
                <span className="text-3xl md:text-2xl flex items-center justify-center w-[1em] h-[1em]">
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

              {/* Forward */}
              <button
                type="button"
                onClick={() => onSeekBy(seekTime)}
                aria-label={`Forward ${seekTime} seconds`}
                title={`Forward ${seekTime} seconds (→)`}
                className="tabbable p-2 rounded-full hover:bg-white/20 transition-transform duration-100 flex items-center gap-3 active:scale-110 active:bg-white/30 active:text-white"
              >
                <span className="text-3xl md:text-2xl flex items-center justify-center w-[1em] h-[1em]">
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

              {/* Volume */}
              <VolumeControl
                volume={volume}
                muted={muted}
                onVolumeChange={onVolumeChange}
                onToggleMute={onToggleMute}
              />
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
