import { useRef, useState } from "react";

import { useThumbnailPreview } from "../hooks/useThumbnailPreview";
import { useProviderThumbnails } from "../hooks/useProviderThumbnails";
import { ProgressBarThumbnail } from "./ProgressBarThumbnail";
import type { SegmentByteCache } from "@/lib/player/media/segmentByteCache";

interface SeekBarProps {
  currentTime: number;
  duration: number;
  bufferedTime?: number;
  src?: string | null;
  mediaKey?: string;
  cache?: SegmentByteCache | null;
  hoverThumbnails?: boolean;
  thumbnailTrack?: string | null;
  onSeek: (time: number) => void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

export function SeekBar({
  currentTime,
  duration,
  bufferedTime = 0,
  src,
  mediaKey = "",
  cache,
  hoverThumbnails = false,
  thumbnailTrack,
  onSeek,
}: SeekBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [dragTime, setDragTime] = useState<number | null>(null);

  const { getThumbnail, hasThumbnails: hasProviderThumbnails } = useProviderThumbnails(
    hoverThumbnails ? thumbnailTrack : null
  );

  // Client-side video frame decoder is only enabled if provider did not supply thumbnails
  const { requestFrame } = useThumbnailPreview({
    src: src ?? null,
    mediaKey,
    cache: cache ?? null,
    enabled: Boolean(hoverThumbnails && !hasProviderThumbnails && src && mediaKey && cache),
  });

  const activeTime = dragTime !== null ? dragTime : currentTime;
  const progress = duration > 0 ? Math.min(100, (activeTime / duration) * 100) : 0;
  const hoverProgress = hoverTime !== null && duration > 0 ? (hoverTime / duration) * 100 : 0;
  const bufferedProgress =
    duration > 0 && bufferedTime > 0 ? Math.min(100, (bufferedTime / duration) * 100) : 0;

  const getTimeFromEvent = (clientX: number): number => {
    const track = trackRef.current;
    if (!track || duration <= 0) {
      return 0;
    }

    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));

    return ratio * duration;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    isDraggingRef.current = true;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // ignore
    }

    const time = getTimeFromEvent(event.clientX);
    setDragTime(time);
    onSeek(time);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const time = getTimeFromEvent(event.clientX);
    setHoverTime(time);

    if (isDraggingRef.current) {
      event.preventDefault();
      setDragTime(time);
      onSeek(time);
    }
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // ignore
    }

    const time = getTimeFromEvent(event.clientX);
    setDragTime(null);
    onSeek(time);
  };

  const handlePointerLeave = () => {
    if (!isDraggingRef.current) {
      setHoverTime(null);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (duration <= 0) return;

    switch (event.key) {
      case "ArrowLeft":
      case "ArrowDown": {
        event.preventDefault();
        onSeek(Math.max(0, currentTime - 5));
        break;
      }
      case "ArrowRight":
      case "ArrowUp": {
        event.preventDefault();
        onSeek(Math.min(duration, currentTime + 5));
        break;
      }
      case "Home": {
        event.preventDefault();
        onSeek(0);
        break;
      }
      case "End": {
        event.preventDefault();
        onSeek(duration);
        break;
      }
      default:
        break;
    }
  };

  return (
    <div
      ref={trackRef}
      className="relative z-20 flex h-9 w-full flex-1 cursor-pointer items-center group touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={handlePointerLeave}
      onKeyDown={handleKeyDown}
      role="slider"
      aria-label="Seek video"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(activeTime)}
      aria-valuetext={`${formatTime(activeTime)} of ${formatTime(duration)}`}
      tabIndex={0}
    >
      {/* Unified Hover Preview Container (Thumbnail + Time Tooltip) */}
      {hoverTime !== null && duration > 0 && (
        <div
          className="pointer-events-none absolute bottom-5 -translate-x-1/2 flex flex-col items-center z-40 will-change-transform motion-reduce:transition-none"
          style={{
            left: `clamp(85px, ${hoverProgress}%, calc(100% - 85px))`,
          }}
        >
          {/* Hover Thumbnail Preview (Gated by settings) */}
          {hoverThumbnails && (
            <ProgressBarThumbnail
              hoverTime={hoverTime}
              hoverProgress={hoverProgress}
              providerThumbnail={hasProviderThumbnails ? getThumbnail(hoverTime) : null}
              requestFrame={hasProviderThumbnails ? undefined : requestFrame}
            />
          )}

          {/* Hover Time Tooltip (Seek Preview) */}
          <div className="whitespace-nowrap rounded-full border border-white/10 bg-black/85 px-2.5 py-1 text-xs font-medium tracking-wide text-white shadow-xl backdrop-blur-xl">
            {formatTime(hoverTime)}
          </div>
        </div>
      )}

      <div className="absolute inset-y-0 left-0 right-0 flex items-center">
        <div className="relative h-[3px] w-full overflow-visible rounded-full transition-all duration-150 group-hover:h-[5px]">
          <div className="relative h-full w-full">
            {/* Background base track */}
            <div className="absolute inset-0 rounded-full bg-white/20 transition-colors duration-150 group-hover:bg-white/25" />

            {/* Buffer / Loaded progress bar (preloaded segments) */}
            {bufferedProgress > 0 ? (
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-white/40 pointer-events-none transition-[width] duration-150"
                style={{ width: `${bufferedProgress}%` }}
              />
            ) : null}

            {/* Hover preview highlight up to cursor */}
            {hoverProgress > 0 ? (
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-white/15 pointer-events-none"
                style={{ width: `${hoverProgress}%` }}
              />
            ) : null}

            {/* Primary playback progress fill */}
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-primary transition-none z-10 pointer-events-none"
              style={{ width: `${progress}%` }}
            >
              {/* Scrubber thumb circle */}
              <div className="absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-white shadow-lg pointer-events-none scale-0 transition-transform duration-100 group-hover:scale-100" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

