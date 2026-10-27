import { useId, type ReactNode } from "react";

import { useElementWidth } from "../hooks/useElementWidth";
import { FullscreenButton } from "./FullscreenButton";
import { SeekBar } from "./SeekBar";
import { formatTime } from "./TimeDisplay";
import {
  CONTROL_BAR_HEIGHT,
  CONTROL_BAR_RADIUS,
  EPISODES_TAB_BASE_WIDTH,
  EPISODES_TAB_HEIGHT,
  buildControlBarPaths,
} from "@/lib/player/controlBarShape";
import type { SegmentByteCache } from "@/lib/player/media/segmentByteCache";

interface TouchControlBarProps {
  visible: boolean;
  inert?: boolean;
  currentTime: number;
  duration: number;
  bufferedTime?: number;
  src?: string | null;
  mediaKey?: string;
  cache?: SegmentByteCache | null;
  hoverThumbnails?: boolean;
  thumbnailTrack?: string | null;
  adCueSec?: number | null;
  onSeek: (time: number) => void;
  onToggleFullscreen: () => void;
  /** Content of the tab that rises from the bar's bottom edge (the Episodes handle). */
  tabSlot?: ReactNode;
}

const TIME_CLASSES = "flex-shrink-0 text-[15px] font-medium text-white tabular-nums select-none";

/**
 * Bottom controls on touch devices: one glass bar holding the elapsed time, seek bar, duration and
 * fullscreen, with an optional tab (Episodes) rising out of its bottom edge.
 */
export function TouchControlBar({
  visible,
  inert,
  currentTime,
  duration,
  bufferedTime,
  src,
  mediaKey,
  cache,
  hoverThumbnails,
  thumbnailTrack,
  adCueSec,
  onSeek,
  onToggleFullscreen,
  tabSlot,
}: TouchControlBarProps) {
  const { ref: barRef, width } = useElementWidth<HTMLDivElement>();
  const gradientId = useId();
  const paths = buildControlBarPaths(width, Boolean(tabSlot));
  const isMeasured = width > 0;

  return (
    <div
      inert={inert}
      className={`absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/70 via-black/25 to-transparent px-[max(1.375rem,env(safe-area-inset-left,0px))] pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-16 transition-[opacity,transform] duration-300 pointer-events-none ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <div
        ref={barRef}
        data-player-ui
        style={{ height: CONTROL_BAR_HEIGHT }}
        className={`relative w-full ${visible ? "pointer-events-auto" : "pointer-events-none"}`}
      >
        {isMeasured ? (
          <>
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              style={{ clipPath: `path('${paths.outline}')` }}
            />
            <svg
              aria-hidden="true"
              width={width}
              height={CONTROL_BAR_HEIGHT}
              className="pointer-events-none absolute inset-0 overflow-visible"
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="white" stopOpacity="0.1" />
                  <stop offset="1" stopColor="white" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {paths.tabFill ? <path d={paths.tabFill} fill={`url(#${gradientId})`} /> : null}
              <path d={paths.outline} fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth="1" />
            </svg>
          </>
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0 border border-white/10 bg-black/60"
            style={{ borderRadius: CONTROL_BAR_RADIUS }}
          />
        )}

        {/* Time, seek bar and duration sit in the upper half; the tab owns the lower middle. */}
        <div className="absolute inset-x-0 top-0 flex h-12 items-center gap-3 pl-5 pr-24">
          <span className={TIME_CLASSES}>{formatTime(currentTime)}</span>
          <div className="flex min-w-0 flex-1 items-center">
            <SeekBar
              variant="touch"
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
          <span className={TIME_CLASSES}>{formatTime(duration)}</span>
        </div>

        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-3.5">
          <span aria-hidden="true" className="h-12 w-px bg-white/15" />
          <FullscreenButton variant="glass" onClick={onToggleFullscreen} />
        </div>

        {paths.tabFill ? (
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2"
            style={{ width: EPISODES_TAB_BASE_WIDTH, height: EPISODES_TAB_HEIGHT }}
          >
            {tabSlot}
          </div>
        ) : null}
      </div>
    </div>
  );
}
