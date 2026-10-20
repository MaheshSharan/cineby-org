import type { SubtitleSyncState } from "../hooks/useSubtitleSync";
import type { SyncFailure } from "../sync/runAutoSync";
import { Spinner } from "@/components/ui/Spinner";

export interface SubtitleSyncPanelProps {
  state: SubtitleSyncState;
  /** Offset currently applied to the active track, in seconds. */
  trackOffset: number;
  hasTrack: boolean;
  onStart: () => void;
  onCancel: () => void;
  onApply: () => void;
  onNudge: (deltaSec: number) => void;
  onReset: () => void;
}

const NUDGE_STEPS_SEC = [-5, -0.5, -0.05, 0.05, 0.5, 5];

const FAILURE_MESSAGES: Record<SyncFailure, string> = {
  "no-subtitles": "This track has no subtitle text to match against.",
  "no-dialogue": "Couldn't find a stretch of dialogue to listen to. Adjust manually.",
  unreadable: "Couldn't read this stream's audio. Adjust manually.",
  stalled: "The stream paused while listening. Try again, or adjust manually.",
  "no-match": "Couldn't sync confidently. Adjust manually.",
  inconsistent: "Subtitle timing varies across the video, so one shift won't fit. Adjust manually.",
  cancelled: "",
};

function formatSigned(seconds: number): string {
  const sign = seconds < 0 ? "-" : "+";
  return `${sign}${Math.abs(seconds).toFixed(3)} s`;
}

function formatStep(step: number): string {
  const magnitude = Math.abs(step);
  const label = magnitude < 1 ? `${Math.round(magnitude * 1000)}ms` : `${magnitude}s`;
  return `${step < 0 ? "-" : "+"}${label}`;
}

function SyncStatus({ state, onStart, onCancel, onApply, hasTrack }: SubtitleSyncPanelProps) {
  if (state.phase === "listening") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-white/80">
          <Spinner />
          <span>Listening… up to 30 seconds</span>
        </div>
        <div className="h-1 rounded bg-white/10 overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${Math.round(state.progress * 100)}%` }} />
        </div>
        <button type="button" onClick={onCancel} className="text-[12px] text-white/60 hover:text-white cursor-pointer">
          Cancel
        </button>
      </div>
    );
  }

  if (state.phase === "ready") {
    return (
      <div className="flex items-center gap-2">
        <button type="button" onClick={onApply} className="flex-1 h-10 rounded-lg bg-primary text-white font-semibold cursor-pointer">
          Apply {formatSigned(state.offsetSec)}
        </button>
        <button type="button" onClick={onCancel} className="h-10 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 cursor-pointer">
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={!hasTrack}
        onClick={onStart}
        className="w-full h-10 rounded-lg bg-white/10 hover:bg-white/15 text-white font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Auto-sync
      </button>
      {state.phase === "failed" && FAILURE_MESSAGES[state.reason] ? (
        <p role="status" className="text-[12px] text-amber-300/90">
          {FAILURE_MESSAGES[state.reason]}
        </p>
      ) : null}
    </div>
  );
}

export function SubtitleSyncPanel(props: SubtitleSyncPanelProps) {
  const { trackOffset, hasTrack, onNudge, onReset } = props;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="font-medium text-white">Sync to audio</p>
        <span className="font-mono text-[12px] text-white/60">{formatSigned(trackOffset)}</span>
      </div>
      <SyncStatus {...props} />
      <div className="grid grid-cols-6 gap-1">
        {NUDGE_STEPS_SEC.map((step) => (
          <button
            key={step}
            type="button"
            disabled={!hasTrack}
            onClick={() => onNudge(step)}
            className="h-8 rounded-md bg-white/5 hover:bg-white/10 text-[11px] font-mono text-white/80 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {formatStep(step)}
          </button>
        ))}
      </div>
      {trackOffset !== 0 ? (
        <button type="button" onClick={onReset} className="text-[12px] text-white/60 hover:text-white cursor-pointer">
          Reset this track
        </button>
      ) : null}
    </div>
  );
}
