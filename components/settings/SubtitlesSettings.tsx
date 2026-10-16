import { useSettings } from "@/hooks/useSettings";
import { SegmentedPill } from "@/components/settings/SegmentedPill";
import { ToggleSwitch } from "@/components/settings/ToggleSwitch";
import {
  type SubtitleFont,
  SUBTITLE_COLOR_PRESETS,
  SUBTITLE_FONT_OPTIONS,
  resolveSubtitleColor,
  getSubtitleFontClass,
} from "@/lib/settings/types";
import { CheckIcon, PaletteIcon } from "@/components/ui/icons";

export function SubtitlesSettings() {
  const { settings, updateSubtitles } = useSettings();
  const {
    font,
    textSize,
    textColor,
    backgroundBlur,
    useNative,
    pastelMode,
    position = 0,
  } = settings.subtitles;

  const fontClass = getSubtitleFontClass(font);
  const displayColor = resolveSubtitleColor(textColor, pastelMode);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Subtitles</h2>
        <p className="mt-1 text-sm text-white/50">
          Improve readability, appearance, and styling for subtitles.
        </p>
      </div>

      {/* Subtitles Configuration Card */}
      <div className="rounded-2xl border border-white/10 bg-[rgba(18,18,20,0.7)] p-6 md:p-8 backdrop-blur-md divide-y divide-white/[0.06]">
        {/* Use Native Subtitles */}
        <div className="pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="max-w-md">
            <p className="text-[15px] font-medium text-white">Use native subtitles</p>
            <p className="text-[13px] text-white/50 mt-0.5">
              Render subtitles using the device's built-in engine. Disables customization below.
            </p>
          </div>
          <ToggleSwitch
            checked={!!useNative}
            onChange={(val) => updateSubtitles({ useNative: val })}
            ariaLabel="Use native subtitles"
          />
        </div>

        {/* Pastel Mode */}
        <div className="py-5 flex items-center justify-between gap-4">
          <div className="max-w-md">
            <p className="text-[15px] font-medium text-white">Pastel mode</p>
            <p className="text-[13px] text-white/50 mt-0.5">
              Apply softer, low-contrast pastel tones to reduce eye strain in dark scenes.
            </p>
          </div>
          <ToggleSwitch
            checked={!!pastelMode}
            onChange={(val) => updateSubtitles({ pastelMode: val })}
            ariaLabel="Pastel mode"
          />
        </div>

        {/* Font */}
        <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-medium text-white">Font</p>
            <p className="text-[13px] text-white/50 mt-0.5">
              Choose your preferred subtitle font.
            </p>
          </div>
          <SegmentedPill<SubtitleFont>
            options={SUBTITLE_FONT_OPTIONS.map((f) => ({ label: f.label, value: f.id }))}
            value={font}
            onChange={(val) => updateSubtitles({ font: val })}
          />
        </div>

        {/* Text Size */}
        <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-medium text-white">Text Size</p>
            <p className="text-[13px] text-white/50 mt-0.5">
              Adjust subtitle size for your display (50% to 200%).
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-60">
            <span className="text-xs font-mono text-white/70 w-12 text-right">
              {textSize}%
            </span>
            <input
              type="range"
              min={50}
              max={200}
              step={5}
              value={textSize}
              onChange={(e) => updateSubtitles({ textSize: Number(e.target.value) })}
              className="w-full accent-white h-1.5 bg-white/20 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Position */}
        <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-medium text-white">Position</p>
            <p className="text-[13px] text-white/50 mt-0.5">
              Adjust vertical bottom lift so subtitles don't get obscured.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-60">
            <span className="text-xs font-mono text-white/70 w-12 text-right">
              {position === 0 ? "Default" : `${position}%`}
            </span>
            <input
              type="range"
              min={0}
              max={50}
              step={1}
              value={position}
              onChange={(e) => updateSubtitles({ position: Number(e.target.value) })}
              className="w-full accent-white h-1.5 bg-white/20 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Text Color & Custom Color Picker */}
        <div className="py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-medium text-white">Text Color</p>
            <p className="text-[13px] text-white/50 mt-0.5">
              Pick a preset color or select a custom color.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {SUBTITLE_COLOR_PRESETS.map((c) => {
              const isSelected = (textColor || "#ffffff").toLowerCase() === c.value.toLowerCase();
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => updateSubtitles({ textColor: c.value })}
                  aria-label={c.label}
                  className={`h-6 w-6 rounded-full flex items-center justify-center transition-transform cursor-pointer ${
                    isSelected
                      ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#0e1210] scale-110"
                      : "opacity-75 hover:opacity-100 hover:scale-105"
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

            {/* Custom Color Picker */}
            <div className="relative flex items-center justify-center h-6 w-6 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 cursor-pointer overflow-hidden transition-all">
              <input
                type="color"
                value={textColor && textColor.startsWith("#") ? textColor : "#ffffff"}
                onChange={(e) => updateSubtitles({ textColor: e.target.value })}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                aria-label="Custom subtitle color"
              />
              <PaletteIcon size={12} className="text-white" />
            </div>
          </div>
        </div>

        {/* Background Blur / Soft Glow */}
        <div className="pt-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-medium text-white">Background Blur</p>
            <p className="text-[13px] text-white/50 mt-0.5">
              Improve legibility with a soft glow backdrop.
            </p>
          </div>
          <ToggleSwitch
            checked={!!backgroundBlur}
            onChange={(val) => updateSubtitles({ backgroundBlur: val })}
            ariaLabel="Background Blur"
          />
        </div>
      </div>

      {/* Live Preview Card */}
      <div className="rounded-2xl border border-white/10 bg-black/50 p-6 md:p-8 backdrop-blur-md">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">
          Live Subtitle Preview
        </p>
        <div
          className="relative h-44 w-full overflow-hidden rounded-xl bg-gradient-to-b from-[#181b22] to-[#0d0f14] border border-white/5 flex items-end justify-center transition-all duration-200"
          style={{ paddingBottom: `${Math.max(16, 24 + position * 1.5)}px` }}
        >
          <div
            className={`px-3 py-1 rounded transition-all duration-200 select-none text-center max-w-[85%] ${fontClass} ${
              backgroundBlur
                ? "drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] [text-shadow:_0_1px_3px_rgb(0_0_0_/_90%),_0_0_8px_rgb(0_0_0_/_80%)] bg-black/75"
                : "[text-shadow:_0_1px_2px_rgb(0_0_0_/_90%)]"
            }`}
            style={{
              color: displayColor,
              fontSize: `${Math.round((textSize / 100) * 18)}px`,
              lineHeight: 1.3,
            }}
          >
            I have a bad feeling about this...
          </div>
        </div>
      </div>
    </div>
  );
}
