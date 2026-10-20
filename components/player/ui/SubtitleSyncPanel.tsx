import { useEffect, useRef, useState } from "react";
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
  logs?: string[];
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
          <span>Listening… analyzing audio</span>
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
    const isAlreadyInSync = Math.abs(state.offsetSec) < 0.1;

    return (
      <div className="space-y-2">
        {isAlreadyInSync ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[12px]">
            <svg className="w-4 h-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Subtitles are already in sync ({formatSigned(state.offsetSec)}). No adjustment needed.</span>
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onApply}
            className={`flex-1 h-10 rounded-lg text-white font-semibold cursor-pointer transition-colors ${
              isAlreadyInSync
                ? "bg-white/10 hover:bg-white/15"
                : "bg-primary hover:brightness-110"
            }`}
          >
            {isAlreadyInSync ? `Keep / Apply (${formatSigned(state.offsetSec)})` : `Apply ${formatSigned(state.offsetSec)}`}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="h-10 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  if (state.phase === "applied") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[12px]">
          <svg className="w-4 h-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Offset fix applied ({formatSigned(state.offsetSec)}). Subtitles in sync!</span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="w-full h-8 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 text-[12px] font-medium transition-colors cursor-pointer"
        >
          Done
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

function SyncLogViewer({ logs }: { logs?: string[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isOpen]);

  if (!logs || logs.length === 0) return null;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(logs.join("\n"));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Fallback ignore
    }
  };

  return (
    <div className="mt-2 rounded-lg border border-white/10 bg-black/40 overflow-hidden text-xs">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        className="w-full flex items-center justify-between px-2.5 py-1.5 text-left text-white/70 hover:text-white hover:bg-white/5 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>Sync Diagnostics ({logs.length})</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopy}
            title={copied ? "Copied!" : "Copy logs"}
            aria-label="Copy logs"
            className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer focus:outline-none"
          >
            {copied ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
            )}
          </button>

          <span className="font-mono text-[12px] text-white/50 px-1 hover:text-white transition-colors leading-none">
            {isOpen ? "^" : "v"}
          </span>
        </div>
      </div>

      {isOpen ? (
        <div className="max-h-40 overflow-y-auto no-scrollbar p-2 font-mono text-[10.5px] leading-relaxed text-white/70 space-y-1 bg-black/60 border-t border-white/5 select-text">
          {logs.map((log, idx) => (
            <div key={idx} className="break-words">
              {log}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
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
      <SyncLogViewer logs={props.logs} />
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
