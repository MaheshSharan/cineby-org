import { useRef, useState } from "react";

import { VolumeIcon } from "./VolumeIcon";

interface VolumeControlProps {
  volume: number;
  muted: boolean;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
}

export function VolumeControl({
  volume,
  muted,
  onVolumeChange,
  onToggleMute,
}: VolumeControlProps) {
  const [isHovering, setIsHovering] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const displayVolume = muted ? 0 : volume;
  const progress = displayVolume * 100;

  const getVolumeFromEvent = (clientX: number): number => {
    const track = trackRef.current;
    if (!track) return 0;

    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));

    return ratio;
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.buttons !== 1) {
      return;
    }
    onVolumeChange(getVolumeFromEvent(event.clientX));
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    onVolumeChange(getVolumeFromEvent(event.clientX));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "ArrowLeft":
      case "ArrowDown": {
        event.preventDefault();
        onVolumeChange(Math.max(0, (muted ? 0 : volume) - 0.05));
        break;
      }
      case "ArrowRight":
      case "ArrowUp": {
        event.preventDefault();
        if (muted) {
          onToggleMute();
        }
        onVolumeChange(Math.min(1, (muted ? 0 : volume) + 0.05));
        break;
      }
      case "Home": {
        event.preventDefault();
        onVolumeChange(0);
        break;
      }
      case "End": {
        event.preventDefault();
        if (muted) {
          onToggleMute();
        }
        onVolumeChange(1);
        break;
      }
      default:
        break;
    }
  };

  return (
    <div
      className="group relative flex items-center"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <button
        type="button"
        onClick={onToggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
        title={muted ? "Unmute (m)" : "Mute (m)"}
        className="tabbable p-2 rounded-full hover:bg-white/20 transition-transform duration-100 active:scale-110 active:bg-white/30"
      >
        <VolumeIcon muted={muted} className="text-white/90" />
      </button>

      <div
        className={`hidden md:flex ms-[0.5em] items-center overflow-hidden transition-all duration-200 ${
          isHovering ? "w-24 opacity-100" : "w-0 opacity-0"
        }`}
      >
        <div
          ref={trackRef}
          className="relative flex h-9 w-full cursor-pointer items-center group/slider"
          onPointerMove={handlePointerMove}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          role="slider"
          aria-label="Volume"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-valuetext={muted ? "Muted" : `${Math.round(progress)}%`}
          tabIndex={0}
        >
          <div className="absolute inset-y-0 left-0 right-0 flex items-center">
            <div className="relative mx-[0.375em] h-[3px] w-full overflow-visible rounded-full transition-all duration-150 group-hover/slider:h-[5px]">
              <div className="relative h-full w-full">
                <div className="absolute inset-0 rounded-full bg-white/25 transition-colors duration-150 group-hover/slider:bg-white/30" />
                <div
                  className="absolute left-0 top-0 h-full rounded-full bg-primary transition-none"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute right-0 top-1/2 h-[0.75em] w-[0.75em] -translate-y-1/2 translate-x-1/2 rounded-full bg-white shadow-md" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
