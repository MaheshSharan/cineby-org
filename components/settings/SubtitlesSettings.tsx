import { useSettings } from "@/hooks/useSettings";
import { SegmentedPill } from "@/components/settings/SegmentedPill";
import { ToggleSwitch } from "@/components/settings/ToggleSwitch";
import type { SubtitleColor, SubtitleFont } from "@/lib/settings/types";

const COLOR_OPTIONS: Array<{ value: SubtitleColor; hex: string; label: string }> = [
  { value: "white", hex: "#ffffff", label: "White" },
  { value: "yellow", hex: "#fef08a", label: "Yellow" },
  { value: "cyan", hex: "#67e8f9", label: "Cyan" },
  { value: "magenta", hex: "#f472b6", label: "Magenta" },
];

export function SubtitlesSettings() {
  const { settings, updateSubtitles } = useSettings();
  const { font, textSize, textColor, backgroundBlur } = settings.subtitles;

  // Compute live subtitle font styling
  const fontClass =
    font === "netflix"
      ? "font-sans tracking-wide"
      : font === "montserrat"
      ? "font-['Montserrat',sans-serif]"
      : "font-sans font-medium";

  const colorHex = COLOR_OPTIONS.find((c) => c.value === textColor)?.hex || "#ffffff";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Subtitles</h2>
        <p className="mt-1 text-sm text-white/50">
          Improve readability and customization for subtitles.
        </p>
      </div>

      {/* Subtitles Configuration Card */}
      <div className="rounded-2xl border border-white/10 bg-[rgba(18,18,20,0.7)] p-6 md:p-8 backdrop-blur-md divide-y divide-white/[0.06]">
        {/* Font */}
        <div className="pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-medium text-white">Font</p>
            <p className="text-[13px] text-white/50 mt-0.5">
              Choose your preferred subtitle font.
            </p>
          </div>
          <SegmentedPill<SubtitleFont>
            options={[
              { label: "Cineby", value: "cineby" },
              { label: "Netflix", value: "netflix" },
              { label: "Montserrat", value: "montserrat" },
            ]}
            value={font}
            onChange={(val) => updateSubtitles({ font: val })}
          />
        </div>

        {/* Text Size */}
        <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-medium text-white">Text Size</p>
            <p className="text-[13px] text-white/50 mt-0.5">
              Adjust subtitle size for your display.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-60">
            <span className="text-xs font-mono text-white/70 w-12 text-right">
              {textSize}%
            </span>
            <input
              type="range"
              min={50}
              max={150}
              step={5}
              value={textSize}
              onChange={(e) => updateSubtitles({ textSize: Number(e.target.value) })}
              className="w-full accent-white h-1.5 bg-white/20 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Text Color */}
        <div className="py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-medium text-white">Text Color</p>
            <p className="text-[13px] text-white/50 mt-0.5">
              Pick a high-contrast subtitle color.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {COLOR_OPTIONS.map((c) => {
              const isSelected = textColor === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => updateSubtitles({ textColor: c.value })}
                  aria-label={c.label}
                  className={`h-6 w-6 rounded-full transition-transform cursor-pointer ${
                    isSelected
                      ? "ring-2 ring-white ring-offset-2 ring-offset-[#0e1210] scale-110"
                      : "opacity-75 hover:opacity-100 hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              );
            })}
          </div>
        </div>

        {/* Background Blur / Soft Glow */}
        <div className="pt-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-medium text-white">Background Blur</p>
            <p className="text-[13px] text-white/50 mt-0.5">
              Improve legibility with a soft glow.
            </p>
          </div>
          <ToggleSwitch
            checked={backgroundBlur}
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
        <div className="relative h-40 w-full overflow-hidden rounded-xl bg-gradient-to-b from-[#181b22] to-[#0d0f14] border border-white/5 flex items-end justify-center pb-6">
          <div
            className={`px-3 py-1 rounded transition-all duration-200 select-none text-center max-w-[85%] ${fontClass} ${
              backgroundBlur
                ? "drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] [text-shadow:_0_1px_3px_rgb(0_0_0_/_90%),_0_0_8px_rgb(0_0_0_/_80%)]"
                : "[text-shadow:_0_1px_2px_rgb(0_0_0_/_90%)]"
            }`}
            style={{
              color: colorHex,
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
