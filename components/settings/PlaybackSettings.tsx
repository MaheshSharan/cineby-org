import { useState } from "react";

import { useSettings } from "@/hooks/useSettings";
import { ChevronDownIcon } from "@/components/ui/icons";
import { ToggleSwitch } from "@/components/settings/ToggleSwitch";

const SEEK_TIME_OPTIONS = [
  { value: 5, label: "5 seconds" },
  { value: 10, label: "10 seconds" },
  { value: 15, label: "15 seconds" },
  { value: 30, label: "30 seconds" },
];

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
];

export function PlaybackSettings() {
  const { settings, updatePlayback } = useSettings();
  const { autoplay, autoSkipIntro, seekTime, autoSubtitles, preferredLanguage } = settings.playback;

  const [isSeekMenuOpen, setIsSeekMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  const activeSeekObj = SEEK_TIME_OPTIONS.find((s) => s.value === seekTime) || SEEK_TIME_OPTIONS[1];
  const activeLangObj = LANGUAGE_OPTIONS.find((l) => l.value === preferredLanguage) || LANGUAGE_OPTIONS[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Playback</h2>
        <p className="mt-1 text-sm text-white/50">
          Configure how your player behaves.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[rgba(18,18,20,0.7)] p-6 md:p-8 backdrop-blur-md divide-y divide-white/[0.06]">
        {/* Autoplay */}
        <div className="pb-5 flex items-center justify-between gap-4">
          <div className="max-w-md">
            <p className="text-[15px] font-medium text-white">Autoplay</p>
            <p className="text-[13px] text-white/50 mt-0.5">
              Automatically play the next episode when one ends. Videos still start on their own when this is off.
            </p>
          </div>
          <ToggleSwitch
            checked={autoplay}
            onChange={(val) => updatePlayback({ autoplay: val })}
            ariaLabel="Autoplay"
          />
        </div>

        {/* Auto Skip Intro */}
        <div className="py-5 flex items-center justify-between gap-4">
          <div className="max-w-md">
            <p className="text-[15px] font-medium text-white">Auto Skip Intro</p>
            <p className="text-[13px] text-white/50 mt-0.5">
              Jump past the intro on its own, instead of showing the Skip Intro button.
            </p>
          </div>
          <ToggleSwitch
            checked={autoSkipIntro}
            onChange={(val) => updatePlayback({ autoSkipIntro: val })}
            ariaLabel="Auto Skip Intro"
          />
        </div>

        {/* Seek Time */}
        <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-medium text-white">Seek Time</p>
            <p className="text-[13px] text-white/50 mt-0.5">
              Change how far you skip forwards or backwards.
            </p>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSeekMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white transition-colors cursor-pointer"
            >
              <span>{activeSeekObj.label}</span>
              <ChevronDownIcon size={13} className="text-white/50" />
            </button>

            {isSeekMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsSeekMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 z-50 w-36 rounded-xl border border-white/10 bg-[#16181d] p-1.5 shadow-xl">
                  {SEEK_TIME_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        updatePlayback({ seekTime: opt.value });
                        setIsSeekMenuOpen(false);
                      }}
                      className={`w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                        seekTime === opt.value
                          ? "bg-white/15 text-white font-semibold"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Auto Subtitles */}
        <div className="pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="max-w-md">
            <p className="text-[15px] font-medium text-white">Auto Subtitles</p>
            <p className="text-[13px] text-white/50 mt-0.5">
              Automatically select subtitles in your preferred language when available.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {autoSubtitles && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsLangMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 transition-colors cursor-pointer"
                >
                  <span>{activeLangObj.label}</span>
                  <ChevronDownIcon size={12} className="text-white/50" />
                </button>

                {isLangMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsLangMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 z-50 w-36 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-[#16181d] p-1.5 shadow-xl">
                      {LANGUAGE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            updatePlayback({ preferredLanguage: opt.value });
                            setIsLangMenuOpen(false);
                          }}
                          className={`w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                            preferredLanguage === opt.value
                              ? "bg-white/15 text-white font-semibold"
                              : "text-white/70 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <ToggleSwitch
              checked={autoSubtitles}
              onChange={(val) => updatePlayback({ autoSubtitles: val })}
              ariaLabel="Auto Subtitles"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
