import type { RefObject } from "react";

interface AdLayerProps {
  containerRef: RefObject<HTMLDivElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  isActive: boolean;
  needsTap: boolean;
  isPaused: boolean;
  onTap: () => void;
  onResume: () => void;
}

/**
 * Surface the IMA SDK renders ads into. It stays mounted (hidden) so the SDK always has a sized
 * container, and sits above the content video but below the player controls.
 */
export function AdLayer({
  containerRef,
  videoRef,
  isActive,
  needsTap,
  isPaused,
  onTap,
  onResume,
}: AdLayerProps) {
  return (
    <div
      data-player-ui
      className={`absolute inset-0 z-10 ${isActive ? "pointer-events-auto" : "invisible pointer-events-none"}`}
    >
      {/* IMA plays ads in its own element so the movie's MediaSource is never touched. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video ref={videoRef} playsInline className="pointer-events-none absolute inset-0 h-full w-full bg-black" />
      <div ref={containerRef} className="absolute inset-0" />
      {needsTap ? (
        <button
          type="button"
          onClick={onTap}
          aria-label="Play ad, then continue watching"
          className="absolute inset-0 z-10 flex cursor-pointer flex-col items-center justify-center gap-3 bg-black/70 text-white focus-visible:outline-none"
        >
          <svg viewBox="0 0 384 512" className="h-14 w-14" aria-hidden="true">
            <path
              fill="currentColor"
              d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"
            />
          </svg>
          <span className="text-sm font-semibold">Tap to play</span>
          <span className="text-xs text-white/70">Ad break, then your movie continues</span>
        </button>
      ) : isPaused ? (
        <button
          type="button"
          onClick={onResume}
          aria-label="Resume ad"
          className="absolute inset-0 z-10 flex cursor-pointer flex-col items-center justify-center gap-3 bg-black/60 text-white focus-visible:outline-none transition-opacity"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm hover:scale-110 transition-transform">
            <svg viewBox="0 0 384 512" className="h-8 w-8 translate-x-0.5" aria-hidden="true">
              <path
                fill="currentColor"
                d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"
              />
            </svg>
          </div>
          <span className="text-sm font-semibold">Click to resume</span>
        </button>
      ) : null}
    </div>
  );
}
