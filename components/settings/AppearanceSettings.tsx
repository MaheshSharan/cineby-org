import { useState } from "react";

import { useSettings } from "@/hooks/useSettings";
import { ChevronDownIcon } from "@/components/ui/icons";
import { SegmentedPill } from "@/components/settings/SegmentedPill";
import { ToggleSwitch } from "@/components/settings/ToggleSwitch";
import type { DetailViewType, EpisodeViewStyle, SiteTheme } from "@/lib/settings/types";

const THEME_OPTIONS: Array<{ value: SiteTheme; label: string; color: string }> = [
  { value: "default", label: "Default (Red)", color: "#dc2626" },
  { value: "emerald", label: "Emerald", color: "#10b981" },
  { value: "cyan", label: "Cyan", color: "#06b6d4" },
  { value: "amber", label: "Amber", color: "#f59e0b" },
  { value: "rose", label: "Rose", color: "#f43f5e" },
  { value: "purple", label: "Purple", color: "#a855f7" },
];

export function AppearanceSettings() {
  const { settings, updateAppearance } = useSettings();
  const { theme, episodeViewStyle, detailViewType, useImageLogos, trailers } = settings.appearance;

  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const activeThemeObj = THEME_OPTIONS.find((t) => t.value === theme) || THEME_OPTIONS[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Appearance</h2>
        <p className="mt-1 text-sm text-white/50">
          Change the look of the site to suit your needs.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[rgba(18,18,20,0.7)] p-6 md:p-8 backdrop-blur-md divide-y divide-white/[0.06]">
        {/* Theme row */}
        <div className="pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-medium text-white">Theme</p>
            <p className="text-[13px] text-white/50 mt-0.5">
              Pick a color palette for the entire interface.
            </p>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsThemeMenuOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white transition-colors cursor-pointer"
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: activeThemeObj.color }}
              />
              <span>{activeThemeObj.label}</span>
              <ChevronDownIcon size={13} className="text-white/50" />
            </button>

            {isThemeMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsThemeMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 z-50 w-44 rounded-xl border border-white/10 bg-[#16181d] p-1.5 shadow-xl">
                  {THEME_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        updateAppearance({ theme: opt.value });
                        setIsThemeMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                        theme === opt.value
                          ? "bg-white/15 text-white"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: opt.color }}
                      />
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Episode View Style */}
        <div className="py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-medium text-white">Episode View Style</p>
            <p className="text-[13px] text-white/50 mt-0.5">
              Choose how episodes appear on series pages.
            </p>
          </div>
          <SegmentedPill<EpisodeViewStyle>
            options={[
              { label: "Vertical", value: "vertical" },
              { label: "Carousel", value: "carousel" },
            ]}
            value={episodeViewStyle}
            onChange={(val) => updateAppearance({ episodeViewStyle: val })}
          />
        </div>

        {/* Detail View Type */}
        <div className="py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-medium text-white">Detail View Type</p>
            <p className="text-[13px] text-white/50 mt-0.5">
              Pick between a full page or a compact modal.
            </p>
          </div>
          <SegmentedPill<DetailViewType>
            options={[
              { label: "Page", value: "page" },
              { label: "Modal", value: "modal" },
            ]}
            value={detailViewType}
            onChange={(val) => updateAppearance({ detailViewType: val })}
          />
        </div>

        {/* Use Image Logos */}
        <div className="py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-medium text-white">Use Image Logos</p>
            <p className="text-[13px] text-white/50 mt-0.5">
              Display movie and series titles as image logos.
            </p>
          </div>
          <ToggleSwitch
            checked={useImageLogos}
            onChange={(val) => updateAppearance({ useImageLogos: val })}
            ariaLabel="Use Image Logos"
          />
        </div>

        {/* Trailers */}
        <div className="pt-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-medium text-white">Trailers</p>
            <p className="text-[13px] text-white/50 mt-0.5">
              Play trailers automatically on detail pages and hover previews.
            </p>
          </div>
          <ToggleSwitch
            checked={trailers}
            onChange={(val) => updateAppearance({ trailers: val })}
            ariaLabel="Trailers"
          />
        </div>
      </div>
    </div>
  );
}
