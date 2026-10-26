import { AdProgressBar } from "./AdProgressBar";
import { FullscreenButton } from "./FullscreenButton";
import type { AdViewState } from "@/lib/ads/viewState";

interface AdControlsProps {
  visible: boolean;
  ad: AdViewState;
  onToggleFullscreen: () => void;
}

function formatRemaining(totalSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(totalSeconds));

  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * Bottom controls while an ad plays: a yellow, non-seekable progress bar and fullscreen. Nothing
 * else is offered, as with ads on YouTube. Same footprint as PlayerControls.
 */
export function AdControls({ visible, ad, onToggleFullscreen }: AdControlsProps) {
  return (
    <div
      data-player-ui
      className={`absolute bottom-0 left-0 right-0 z-30 h-44 flex items-end pointer-events-auto transition-[opacity,transform] duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <div className="w-full flex flex-col items-stretch pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-4 pt-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <div className="px-2 sm:px-4 md:px-10">
          <div className="flex items-center gap-x-2 sm:gap-x-3">
            <div className="flex items-center flex-1 py-2">
              <AdProgressBar progressPercent={ad.progressPercent} />
            </div>
            <span className="text-xs sm:text-sm font-semibold text-yellow-400 tabular-nums">
              {ad.positionLabel} · {formatRemaining(ad.remainingSec)}
            </span>
          </div>

          <div className="flex items-center justify-end mt-1 sm:mt-2 md:mt-3">
            <FullscreenButton onClick={onToggleFullscreen} />
          </div>
        </div>
      </div>
    </div>
  );
}
