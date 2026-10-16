import { useEffect, useMemo, useState } from "react";
import type { SubtitleTrack } from "../types";
import { FALLBACK_FLAG_URL, getFlagUrl } from "../constants";
import { useSettings } from "@/hooks/useSettings";
import { ToggleSwitch } from "@/components/settings/ToggleSwitch";
import {
  type SubtitleFont,
  SUBTITLE_COLOR_PRESETS,
  SUBTITLE_FONT_OPTIONS,
} from "@/lib/settings/types";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PaletteIcon,
  SearchIcon,
  SettingsIcon,
  UploadIcon,
} from "@/components/ui/icons";
import { Spinner } from "@/components/ui/Spinner";

interface AudioSubtitlesPopoverProps {
  open: boolean;
  subtitleTracks: SubtitleTrack[];
  activeSubtitleId?: string | null;
  onSubtitleChange: (track: SubtitleTrack | null) => void;
  onUploadSubtitle?: (file: File) => void;
  onOpenOpenSubtitles?: () => void;
  subtitlesEnabled: boolean;
  isSubtitlesFetching: boolean;
  onToggleSubtitles: () => void;
}

export function AudioSubtitlesPopover({
  open,
  subtitleTracks,
  activeSubtitleId,
  onSubtitleChange,
  onUploadSubtitle,
  onOpenOpenSubtitles,
  subtitlesEnabled,
  isSubtitlesFetching,
  onToggleSubtitles,
}: AudioSubtitlesPopoverProps) {
  const [view, setView] = useState<"tracks" | "settings">("tracks");

  const { settings, updateSubtitles } = useSettings();
  const subSettings = settings.subtitles;

  // Reset to tracks view whenever popover is closed
  useEffect(() => {
    if (!open) {
      setView("tracks");
    }
  }, [open]);

  // Pin selected subtitle track to index 0 so it's always at the top without scrolling
  const orderedSubtitleTracks = useMemo(() => {
    if (!activeSubtitleId || subtitleTracks.length <= 1) {
      return subtitleTracks;
    }
    const activeIndex = subtitleTracks.findIndex(
      (t) => t.id === activeSubtitleId || t.lang === activeSubtitleId
    );
    if (activeIndex <= 0) return subtitleTracks;
    const activeTrack = subtitleTracks[activeIndex];
    return [activeTrack, ...subtitleTracks.filter((_, i) => i !== activeIndex)];
  }, [subtitleTracks, activeSubtitleId]);

  if (!open) return null;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onUploadSubtitle) {
      onUploadSubtitle(file);
    }
  };

  const handleDelayShift = (delta: number) => {
    const next = Math.max(-20, Math.min(20, Math.round(((subSettings.delay ?? 0) + delta) * 10) / 10));
    updateSubtitles({ delay: next });
  };

  const handleDelayChange = (value: number) => {
    if (Number.isNaN(value)) return;
    const next = Math.max(-20, Math.min(20, Math.round(value * 10) / 10));
    updateSubtitles({ delay: next });
  };

  return (
    <div
      data-player-ui
      className={`fixed left-1/2 top-[76px] z-50 -translate-x-1/2 w-[calc(100vw-1rem)] max-w-[min(480px,calc(100vw-1rem))] md:w-auto md:absolute md:left-auto md:right-0 md:top-full md:max-w-none md:translate-x-0 md:pt-2 transition-opacity duration-150 origin-top md:origin-top-right will-change-[opacity] ${
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      <div
        className={`player-surface rounded-xl p-3 sm:p-4 shadow-2xl overflow-x-hidden transition-all duration-200 ${
          view === "settings"
            ? "w-[340px] sm:w-[380px] max-w-[calc(100vw-1.5rem)]"
            : "min-w-[320px] sm:min-w-[420px]"
        }`}
      >
        <div className="flex flex-col text-white">
          {view === "tracks" ? (
            <>
              {/* TWO COLUMN VIEW: Audio (Left) & Subtitles (Right) */}
              <div className="flex divide-x divide-white/10 max-h-[min(360px,50vh)]">
                {/* AUDIO COLUMN */}
                <div className="w-1/2 min-w-0 flex-1 md:w-auto md:min-w-[170px] md:max-w-[240px] flex flex-col min-h-0 pr-2.5 sm:pr-4">
                  <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500 flex-shrink-0">
                    Audio
                  </p>
                  <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-0.5 pr-1">
                    <button
                      type="button"
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-left transition-colors text-white bg-white/[0.14]"
                    >
                      <span className="flex-1 min-w-0">
                        <span className="block truncate">Default Audio</span>
                      </span>
                    </button>
                  </div>
                </div>

                {/* SUBTITLES COLUMN */}
                <div className="w-1/2 min-w-0 flex-1 md:w-auto md:min-w-[170px] md:max-w-[240px] flex flex-col min-h-0 pl-2.5 sm:pl-4">
                  <div className="flex items-center justify-between px-2 pb-2.5 flex-shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                      Subtitles
                    </span>
                    {/* Subtitle Master Switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={subtitlesEnabled}
                      aria-label="Toggle subtitles"
                      onClick={onToggleSubtitles}
                      className={`group relative h-4 w-7 shrink-0 rounded-full border transition-all duration-200 cursor-pointer focus:outline-none ${
                        subtitlesEnabled
                          ? "bg-cyan-500/20 border-cyan-500/50 shadow-[0_0_8px_rgba(6,182,212,0.25)]"
                          : "bg-white/[0.06] border-white/[0.1] hover:border-white/20"
                      }`}
                    >
                      <span
                        className={`absolute top-[1.5px] h-2.5 w-2.5 rounded-full transition-all duration-200 shadow-sm ${
                          subtitlesEnabled
                            ? "left-[14px] bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]"
                            : "left-[2px] bg-white/40 group-hover:bg-white/60"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-1.5 pr-1">
                    {/* Subtitle Tracks */}
                    {!subtitlesEnabled ? (
                      <div className="flex items-center justify-center px-3 py-4">
                        <p className="text-center text-[12px] leading-relaxed text-gray-400">
                          Enable to Search
                        </p>
                      </div>
                    ) : isSubtitlesFetching ? (
                      <div className="flex items-center justify-center px-3 py-6">
                        <Spinner size="md" className="text-cyan-400" />
                      </div>
                    ) : orderedSubtitleTracks.length === 0 ? (
                      <div className="flex items-center justify-center px-3 py-4">
                        <p className="text-center text-[12px] leading-relaxed text-gray-400">
                          No subtitles available
                        </p>
                      </div>
                    ) : (
                      orderedSubtitleTracks.map((track) => {
                        const isActive =
                          activeSubtitleId === track.id || activeSubtitleId === track.lang;

                        return (
                          <button
                            key={track.id}
                            type="button"
                            onClick={() => onSubtitleChange(track)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer ${
                              isActive
                                ? "bg-white/[0.08] border border-cyan-500/30 text-white shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                                : "text-gray-300 hover:text-white hover:bg-white/[0.04] border border-transparent"
                            }`}
                          >
                            {/* Flag Icon Container */}
                            <div className="flex h-7 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-black/40 p-0.5 border border-white/10 overflow-hidden shadow-inner">
                              {track.flagUrl || track.lang ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={getFlagUrl(track.flagUrl || track.lang)}
                                  alt=""
                                  className="h-full w-full object-cover rounded-[4px]"
                                  loading="eager"
                                  decoding="sync"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = FALLBACK_FLAG_URL;
                                  }}
                                />
                              ) : (
                                <span className="text-[10px] font-bold text-white/50 uppercase">
                                  {track.lang?.slice(0, 2) || "CC"}
                                </span>
                              )}
                            </div>

                            {/* Language Name & Lang code */}
                            <div className="flex-1 min-w-0">
                              <span className="block truncate text-[13px] font-medium text-white leading-tight">
                                {track.label || track.lang}
                              </span>
                              <span className="block text-[11px] text-gray-400 font-normal lowercase leading-tight mt-0.5">
                                {track.lang || "en"}
                              </span>
                            </div>

                            {/* Selected Checkmark Badge */}
                            {isActive && (
                              <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-cyan-400/80 bg-cyan-500/20 text-cyan-300">
                                <CheckIcon size={12} strokeWidth={2.5} />
                              </div>
                            )}
                          </button>
                        );
                      })
                    )}

                    {/* Upload Subtitles Button */}
                    <div className="group relative mt-1 flex cursor-pointer select-none items-center gap-x-2 rounded-lg border border-dashed border-white/[0.12] bg-white/[0.01] px-3 py-2 text-[12.5px] font-medium text-gray-300 transition-colors duration-200 hover:border-white/[0.3] hover:bg-white/[0.04] hover:text-white">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".vtt,.srt"
                        className="absolute inset-0 z-10 opacity-0 cursor-pointer"
                        onChange={handleFileChange}
                      />
                      <UploadIcon
                        size={14}
                        className="flex-shrink-0 text-white/40 transition-colors group-hover:text-white/80"
                      />
                      <div className="min-w-0 flex-1 truncate">Upload subtitles</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTTOM SECTION */}
              <div className="mt-3 pt-3 border-t border-white/10 space-y-0.5">
                <button
                  type="button"
                  onClick={onOpenOpenSubtitles}
                  className="w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                >
                  <span className="flex items-center gap-2.5 whitespace-nowrap">
                    <SearchIcon size={16} className="text-gray-400 flex-shrink-0" />
                    Search on OpenSubtitles
                  </span>
                  <ChevronRightIcon size={14} className="text-gray-500 flex-shrink-0" />
                </button>

                {/* In-Modal Subtitle Settings View Switcher */}
                <button
                  type="button"
                  onClick={() => setView("settings")}
                  className="w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-left cursor-pointer"
                >
                  <span className="flex items-center gap-2.5 whitespace-nowrap">
                    <SettingsIcon size={16} className="text-gray-400 flex-shrink-0" />
                    Subtitle settings
                  </span>
                  <ChevronRightIcon size={14} className="text-gray-500 flex-shrink-0" />
                </button>
              </div>
            </>
          ) : (
            /* SUBTITLE SETTINGS SUBVIEW (IN-MODAL) */
            <div className="flex flex-col">
              {/* Header with Back button */}
              <div className="flex items-center gap-2 pb-3 mb-2 border-b border-white/10 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setView("tracks")}
                  className="p-1 -ml-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Back to tracks"
                >
                  <ArrowLeftIcon size={18} />
                </button>
                <h3 className="text-[14px] font-semibold text-white tracking-wide">Subtitle settings</h3>
              </div>

              {/* Scrollable Settings Body */}
              <div className="max-h-[min(440px,65vh)] overflow-y-auto no-scrollbar space-y-4 pr-0.5 text-[13px]">
                {/* Use Native Subtitles */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-white">Use native subtitles</p>
                    <ToggleSwitch
                      checked={!!subSettings.useNative}
                      onChange={(val) => updateSubtitles({ useNative: val })}
                      ariaLabel="Toggle native subtitles"
                    />
                  </div>
                  <p className="text-[11px] text-white/50 leading-relaxed">
                    Render subtitles using the device's built-in engine. Disables customization below.
                  </p>
                </div>

                {/* Pastel Mode */}
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-white">Pastel mode</p>
                  <ToggleSwitch
                    checked={!!subSettings.pastelMode}
                    onChange={(val) => updateSubtitles({ pastelMode: val })}
                    ariaLabel="Toggle pastel mode"
                  />
                </div>

                {/* Subtitle Delay Sync */}
                <div className="space-y-2.5">
                  <p className="font-medium text-white">Subtitle delay</p>
                  <input
                    type="range"
                    min={-20}
                    max={20}
                    step={0.1}
                    value={subSettings.delay ?? 0}
                    onChange={(e) => handleDelayChange(Number.parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 h-1.5 bg-white/20 rounded-lg cursor-pointer"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDelayShift(-0.5)}
                      className="flex-1 flex flex-col items-center justify-center py-2 h-11 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors cursor-pointer group"
                    >
                      <ChevronLeftIcon size={16} className="text-white/70 group-hover:text-white" />
                      <span className="text-[11px] text-white/80 mt-0.5">Heard audio</span>
                    </button>

                    <div className="h-11 px-2 w-24 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center">
                      <input
                        type="number"
                        step={0.1}
                        value={subSettings.delay ?? 0}
                        onChange={(e) => handleDelayChange(Number.parseFloat(e.target.value))}
                        className="w-full bg-transparent text-center font-mono text-[13px] font-semibold text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-[11px] text-white/50 ml-0.5 font-mono">s</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelayShift(0.5)}
                      className="flex-1 flex flex-col items-center justify-center py-2 h-11 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors cursor-pointer group"
                    >
                      <ChevronRightIcon size={16} className="text-white/70 group-hover:text-white" />
                      <span className="text-[11px] text-white/80 mt-0.5">Saw caption</span>
                    </button>
                  </div>
                </div>

                <hr className="border-white/10 my-2" />

                {/* Font Selector */}
                <div className="space-y-2">
                  <p className="font-medium text-white">Font</p>
                  <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 gap-1">
                    {SUBTITLE_FONT_OPTIONS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => updateSubtitles({ font: f.id })}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          subSettings.font === f.id
                            ? "bg-white/20 text-white shadow-sm"
                            : "text-white/60 hover:text-white hover:bg-white/10"
                        } ${f.className}`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text Size */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-white">Text size</p>
                    <span className="text-xs text-white/70 font-mono tabular-nums">{subSettings.textSize}%</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={200}
                    step={5}
                    value={subSettings.textSize}
                    onChange={(e) => updateSubtitles({ textSize: Number(e.target.value) })}
                    className="w-full accent-cyan-400 h-1.5 bg-white/20 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Position */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-white">Position</p>
                    <span className="text-xs text-white/70 font-mono tabular-nums">
                      {(subSettings.position ?? 0) === 0 ? "Default" : `${subSettings.position}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={1}
                    value={subSettings.position ?? 0}
                    onChange={(e) => updateSubtitles({ position: Number(e.target.value) })}
                    className="w-full accent-cyan-400 h-1.5 bg-white/20 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Background Plate */}
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-white">Background</p>
                  <ToggleSwitch
                    checked={!!subSettings.backgroundBlur}
                    onChange={(val) => updateSubtitles({ backgroundBlur: val })}
                    ariaLabel="Toggle background"
                  />
                </div>

                {/* Subtitle Color & Custom Color Picker */}
                <div className="space-y-2 pb-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-white">Color</p>
                    <div className="flex items-center gap-1.5">
                      {SUBTITLE_COLOR_PRESETS.map((c) => {
                        const isSelected = (subSettings.textColor || "#ffffff").toLowerCase() === c.value.toLowerCase();
                        return (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => updateSubtitles({ textColor: c.value })}
                            aria-label={c.label}
                            className={`h-6 w-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                              isSelected
                                ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-black scale-105"
                                : "opacity-80 hover:opacity-100 hover:scale-105"
                            }`}
                            style={{ backgroundColor: c.value }}
                          >
                            {isSelected && (
                              <CheckIcon
                                size={12}
                                strokeWidth={3}
                                className={c.value === "#ffffff" ? "text-black" : "text-white"}
                              />
                            )}
                          </button>
                        );
                      })}

                      {/* Custom Color Palette Picker */}
                      <div className="relative flex items-center justify-center h-6 w-6 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 cursor-pointer overflow-hidden transition-all">
                        <input
                          type="color"
                          value={subSettings.textColor.startsWith("#") ? subSettings.textColor : "#ffffff"}
                          onChange={(e) => updateSubtitles({ textColor: e.target.value })}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                          aria-label="Custom subtitle color"
                        />
                        <PaletteIcon size={12} className="text-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
