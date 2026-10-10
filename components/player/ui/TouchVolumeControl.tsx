import { useRef } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

import { VolumeIcon } from "./VolumeIcon";

interface TouchVolumeControlProps {
  visible: boolean;
  volume: number;
  muted: boolean;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
}

const VOLUME_KEY_STEP = 0.05;

const KEY_DIRECTION: Partial<Record<string, 1 | -1>> = {
  ArrowUp: 1,
  ArrowRight: 1,
  ArrowDown: -1,
  ArrowLeft: -1,
};

export function TouchVolumeControl({
  visible,
  volume,
  muted,
  onVolumeChange,
  onToggleMute,
}: TouchVolumeControlProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const displayVolume = muted ? 0 : volume;
  const progress = displayVolume * 100;

  function getVolumeFromPointer(clientY: number): number {
    const track = trackRef.current;
    if (!track) return displayVolume;

    const rect = track.getBoundingClientRect();
    return Math.min(1, Math.max(0, (rect.bottom - clientY) / rect.height));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    // Capture keeps the drag alive when the finger leaves the track.
    event.currentTarget.setPointerCapture(event.pointerId);
    // Unmute once per gesture; toggling on every move would flip mute back and forth.
    if (muted) onToggleMute();
    onVolumeChange(getVolumeFromPointer(event.clientY));
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    onVolumeChange(getVolumeFromPointer(event.clientY));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const direction = KEY_DIRECTION[event.key];
    if (!direction) return;

    event.preventDefault();
    // The player's window-level shortcuts also use the arrow keys.
    event.stopPropagation();
    if (muted && direction > 0) onToggleMute();
    onVolumeChange(displayVolume + direction * VOLUME_KEY_STEP);
  }

  return (
    <div
      data-player-ui
      className={`absolute right-[max(0.75rem,env(safe-area-inset-right,0px))] top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-1 transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div
        ref={trackRef}
        role="slider"
        aria-label="Volume"
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        aria-valuetext={muted ? "Muted" : `${Math.round(progress)}%`}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onKeyDown={handleKeyDown}
        className="flex h-28 w-11 cursor-pointer touch-none justify-center py-2"
      >
        <div className="relative h-full w-1.5 rounded-full bg-white/25">
          <div
            className="absolute bottom-0 left-0 w-full rounded-full bg-primary"
            style={{ height: `${progress}%` }}
          />
          <div
            className="absolute left-1/2 h-3.5 w-3.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-white shadow-md"
            style={{ bottom: `${progress}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onToggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
        className="tabbable rounded-full p-2 text-2xl text-white/90 transition-transform duration-100 hover:bg-white/20 active:scale-110 active:bg-white/30"
      >
        <VolumeIcon muted={muted} />
      </button>
    </div>
  );
}
