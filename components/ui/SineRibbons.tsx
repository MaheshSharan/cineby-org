import { useEffect, useRef } from "react";
import { useSettings } from "@/hooks/useSettings";
import type { SiteTheme } from "@/lib/settings/types";

interface RibbonConfig {
  baseY: number;
  thickness: number;
  speed: number;
  amp: number;
  freq: number;
  phase: number;
  harmonics: Array<{ freq: number; amp: number; speed: number }>;
  colorStart: string;
  colorMid: string;
  colorEnd: string;
  edgeColor: string;
  lineWidth: number;
}

interface PaletteHarmonics {
  primaryBg: string;
  ribbons: Array<{
    colorStart: string;
    colorMid: string;
    colorEnd: string;
    edgeColor: string;
    lineWidth: number;
  }>;
}

const THEME_PALETTES: Record<SiteTheme, PaletteHarmonics> = {
  // Default: Cinematic Red / Crimson mixed with Amber, Rose and deep Wine accents
  default: {
    primaryBg: "#1a0305",
    ribbons: [
      {
        colorStart: "rgba(220, 38, 38, 0.85)", // Red 600
        colorMid: "rgba(244, 63, 94, 0.65)",   // Rose 500
        colorEnd: "rgba(245, 158, 11, 0.25)",  // Amber 500
        edgeColor: "rgba(255, 255, 255, 0.95)",
        lineWidth: 2.2,
      },
      {
        colorStart: "rgba(239, 68, 68, 0.75)", // Red 500
        colorMid: "rgba(185, 28, 28, 0.60)",   // Red 700
        colorEnd: "rgba(251, 146, 60, 0.22)",  // Orange 400
        edgeColor: "rgba(254, 202, 202, 0.92)",
        lineWidth: 1.9,
      },
      {
        colorStart: "rgba(244, 63, 94, 0.70)", // Rose 500
        colorMid: "rgba(220, 38, 38, 0.55)",   // Red 600
        colorEnd: "rgba(159, 18, 57, 0.20)",   // Rose 900
        edgeColor: "rgba(255, 228, 230, 0.90)",
        lineWidth: 1.8,
      },
      {
        colorStart: "rgba(245, 158, 11, 0.70)", // Amber 500
        colorMid: "rgba(220, 38, 38, 0.50)",   // Red 600
        colorEnd: "rgba(153, 27, 27, 0.20)",   // Red 800
        edgeColor: "rgba(255, 255, 255, 0.95)",
        lineWidth: 2.0,
      },
    ],
  },

  // Emerald: Vivid Emerald mixed with Mint, Teal and subtle Cyan
  emerald: {
    primaryBg: "#021a11",
    ribbons: [
      {
        colorStart: "rgba(16, 185, 129, 0.85)", // Emerald 500
        colorMid: "rgba(20, 184, 166, 0.65)",   // Teal 500
        colorEnd: "rgba(6, 182, 212, 0.25)",    // Cyan 500
        edgeColor: "rgba(255, 255, 255, 0.95)",
        lineWidth: 2.2,
      },
      {
        colorStart: "rgba(5, 150, 105, 0.75)",  // Emerald 600
        colorMid: "rgba(52, 211, 153, 0.60)",  // Emerald 400
        colorEnd: "rgba(13, 148, 136, 0.22)",  // Teal 600
        edgeColor: "rgba(209, 250, 229, 0.92)",
        lineWidth: 1.9,
      },
      {
        colorStart: "rgba(45, 212, 191, 0.70)", // Teal 400
        colorMid: "rgba(16, 185, 129, 0.55)",  // Emerald 500
        colorEnd: "rgba(4, 120, 87, 0.20)",    // Emerald 700
        edgeColor: "rgba(204, 251, 241, 0.90)",
        lineWidth: 1.8,
      },
      {
        colorStart: "rgba(6, 182, 212, 0.70)",  // Cyan 500
        colorMid: "rgba(16, 185, 129, 0.50)",  // Emerald 500
        colorEnd: "rgba(6, 95, 70, 0.20)",     // Emerald 800
        edgeColor: "rgba(255, 255, 255, 0.95)",
        lineWidth: 2.0,
      },
    ],
  },

  // Cyan: Electric Cyan mixed with Sky Blue, Teal and Indigo
  cyan: {
    primaryBg: "#02161f",
    ribbons: [
      {
        colorStart: "rgba(6, 182, 212, 0.85)",  // Cyan 500
        colorMid: "rgba(14, 165, 233, 0.65)",  // Sky 500
        colorEnd: "rgba(59, 130, 246, 0.25)",  // Blue 500
        edgeColor: "rgba(255, 255, 255, 0.95)",
        lineWidth: 2.2,
      },
      {
        colorStart: "rgba(8, 145, 178, 0.75)",  // Cyan 600
        colorMid: "rgba(34, 211, 238, 0.60)",  // Cyan 400
        colorEnd: "rgba(20, 184, 166, 0.22)",  // Teal 500
        edgeColor: "rgba(207, 250, 254, 0.92)",
        lineWidth: 1.9,
      },
      {
        colorStart: "rgba(56, 189, 248, 0.70)", // Sky 400
        colorMid: "rgba(6, 182, 212, 0.55)",   // Cyan 500
        colorEnd: "rgba(99, 102, 241, 0.20)",  // Indigo 500
        edgeColor: "rgba(224, 242, 254, 0.90)",
        lineWidth: 1.8,
      },
      {
        colorStart: "rgba(20, 184, 166, 0.70)", // Teal 500
        colorMid: "rgba(6, 182, 212, 0.50)",   // Cyan 500
        colorEnd: "rgba(30, 58, 138, 0.20)",   // Blue 900
        edgeColor: "rgba(255, 255, 255, 0.95)",
        lineWidth: 2.0,
      },
    ],
  },

  // Amber: Warm Golden Amber mixed with Yellow, Orange and Rose undertones
  amber: {
    primaryBg: "#1f1201",
    ribbons: [
      {
        colorStart: "rgba(245, 158, 11, 0.85)", // Amber 500
        colorMid: "rgba(249, 115, 22, 0.65)",  // Orange 500
        colorEnd: "rgba(234, 179, 8, 0.25)",   // Yellow 500
        edgeColor: "rgba(255, 255, 255, 0.95)",
        lineWidth: 2.2,
      },
      {
        colorStart: "rgba(217, 119, 6, 0.75)",  // Amber 600
        colorMid: "rgba(251, 191, 36, 0.60)",  // Amber 400
        colorEnd: "rgba(239, 68, 68, 0.22)",   // Red 500
        edgeColor: "rgba(254, 243, 199, 0.92)",
        lineWidth: 1.9,
      },
      {
        colorStart: "rgba(251, 146, 60, 0.70)", // Orange 400
        colorMid: "rgba(245, 158, 11, 0.55)",  // Amber 500
        colorEnd: "rgba(180, 83, 9, 0.20)",    // Amber 700
        edgeColor: "rgba(255, 237, 213, 0.90)",
        lineWidth: 1.8,
      },
      {
        colorStart: "rgba(234, 179, 8, 0.70)",  // Yellow 500
        colorMid: "rgba(245, 158, 11, 0.50)",  // Amber 500
        colorEnd: "rgba(120, 53, 15, 0.20)",   // Amber 900
        edgeColor: "rgba(255, 255, 255, 0.95)",
        lineWidth: 2.0,
      },
    ],
  },

  // Rose: Vibrant Rose mixed with Magenta, Pink, and Crimson
  rose: {
    primaryBg: "#1f040d",
    ribbons: [
      {
        colorStart: "rgba(244, 63, 94, 0.85)",  // Rose 500
        colorMid: "rgba(236, 72, 153, 0.65)",  // Pink 500
        colorEnd: "rgba(225, 29, 72, 0.25)",   // Rose 600
        edgeColor: "rgba(255, 255, 255, 0.95)",
        lineWidth: 2.2,
      },
      {
        colorStart: "rgba(225, 29, 72, 0.75)",  // Rose 600
        colorMid: "rgba(251, 113, 133, 0.60)", // Rose 400
        colorEnd: "rgba(168, 85, 247, 0.22)",  // Purple 500
        edgeColor: "rgba(255, 228, 230, 0.92)",
        lineWidth: 1.9,
      },
      {
        colorStart: "rgba(244, 114, 182, 0.70)",// Pink 400
        colorMid: "rgba(244, 63, 94, 0.55)",   // Rose 500
        colorEnd: "rgba(159, 18, 57, 0.20)",   // Rose 900
        edgeColor: "rgba(252, 231, 243, 0.90)",
        lineWidth: 1.8,
      },
      {
        colorStart: "rgba(219, 39, 119, 0.70)", // Pink 600
        colorMid: "rgba(244, 63, 94, 0.50)",   // Rose 500
        colorEnd: "rgba(136, 19, 55, 0.20)",   // Rose 950
        edgeColor: "rgba(255, 255, 255, 0.95)",
        lineWidth: 2.0,
      },
    ],
  },

  // Purple: Regal Purple mixed with Violet, Indigo and Lilac
  purple: {
    primaryBg: "#140321",
    ribbons: [
      {
        colorStart: "rgba(168, 85, 247, 0.85)", // Purple 500
        colorMid: "rgba(139, 92, 246, 0.65)",  // Violet 500
        colorEnd: "rgba(99, 102, 241, 0.25)",  // Indigo 500
        edgeColor: "rgba(255, 255, 255, 0.95)",
        lineWidth: 2.2,
      },
      {
        colorStart: "rgba(147, 51, 234, 0.75)", // Purple 600
        colorMid: "rgba(192, 132, 252, 0.60)", // Purple 400
        colorEnd: "rgba(236, 72, 153, 0.22)",  // Pink 500
        edgeColor: "rgba(243, 232, 255, 0.92)",
        lineWidth: 1.9,
      },
      {
        colorStart: "rgba(167, 139, 250, 0.70)",// Violet 400
        colorMid: "rgba(168, 85, 247, 0.55)",  // Purple 500
        colorEnd: "rgba(107, 33, 168, 0.20)",  // Purple 800
        edgeColor: "rgba(237, 233, 254, 0.90)",
        lineWidth: 1.8,
      },
      {
        colorStart: "rgba(124, 58, 237, 0.70)", // Violet 600
        colorMid: "rgba(168, 85, 247, 0.50)",  // Purple 500
        colorEnd: "rgba(88, 28, 135, 0.20)",   // Purple 900
        edgeColor: "rgba(255, 255, 255, 0.95)",
        lineWidth: 2.0,
      },
    ],
  },
};

const WAVE_SPECS: Array<Omit<RibbonConfig, "colorStart" | "colorMid" | "colorEnd" | "edgeColor" | "lineWidth">> = [
  {
    baseY: 0.55,
    thickness: 70,
    speed: 0.012,
    amp: 36,
    freq: 0.0035,
    phase: 0,
    harmonics: [
      { freq: 0.007, amp: 16, speed: 0.018 },
      { freq: 0.014, amp: 8, speed: -0.01 },
    ],
  },
  {
    baseY: 0.50,
    thickness: 85,
    speed: 0.016,
    amp: 45,
    freq: 0.0028,
    phase: 1.8,
    harmonics: [
      { freq: 0.0055, amp: 20, speed: -0.014 },
      { freq: 0.01, amp: 10, speed: 0.02 },
    ],
  },
  {
    baseY: 0.60,
    thickness: 90,
    speed: 0.01,
    amp: 40,
    freq: 0.0024,
    phase: 3.4,
    harmonics: [
      { freq: 0.0048, amp: 18, speed: 0.015 },
      { freq: 0.009, amp: 12, speed: -0.012 },
    ],
  },
  {
    baseY: 0.44,
    thickness: 60,
    speed: 0.02,
    amp: 30,
    freq: 0.004,
    phase: 4.8,
    harmonics: [
      { freq: 0.008, amp: 14, speed: 0.022 },
      { freq: 0.015, amp: 6, speed: -0.016 },
    ],
  },
];

interface SineRibbonsTextProps {
  text: string;
  className?: string;
}

export function SineRibbonsText({ text, className = "" }: SineRibbonsTextProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { settings } = useSettings();
  const currentTheme = (settings.appearance.theme || "default") as SiteTheme;

  // Use ref to pass current theme smoothly to the canvas render loop without restarting animations
  const themeRef = useRef<SiteTheme>(currentTheme);
  useEffect(() => {
    themeRef.current = currentTheme;
  }, [currentTheme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let isVisible = false;
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;

      if (width === 0 || height === 0) return;

      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(container);
    resize();

    let time = 0;

    const computeWaveY = (
      x: number,
      r: (typeof WAVE_SPECS)[number],
      t: number,
      h: number
    ) => {
      const baseY = h * r.baseY;
      let wave = Math.sin(x * r.freq + t * r.speed + r.phase) * r.amp;

      for (let i = 0; i < r.harmonics.length; i++) {
        const hrm = r.harmonics[i];
        wave += Math.sin(x * hrm.freq + t * hrm.speed) * hrm.amp;
      }

      return baseY + wave;
    };

    const render = () => {
      if (!isVisible || width === 0 || height === 0) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      time += 1;
      ctx.clearRect(0, 0, width, height);

      const activePalette = THEME_PALETTES[themeRef.current] || THEME_PALETTES.default;

      // Subtle atmospheric deep theme backdrop inside the text
      const bgGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        10,
        width * 0.5,
        height * 0.5,
        Math.max(width, height)
      );
      bgGrad.addColorStop(0, activePalette.primaryBg);
      bgGrad.addColorStop(0.7, "#080309");
      bgGrad.addColorStop(1, "#020104");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.globalCompositeOperation = "screen";

      const step = 4;

      for (let rIdx = 0; rIdx < WAVE_SPECS.length; rIdx++) {
        const wave = WAVE_SPECS[rIdx];
        const ribbonStyle = activePalette.ribbons[rIdx];
        const upperPoints: Array<{ x: number; y: number }> = [];
        const lowerPoints: Array<{ x: number; y: number }> = [];

        for (let x = 0; x <= width + step; x += step) {
          const y = computeWaveY(x, wave, time, height);
          const halfThick = (wave.thickness / 2) * (0.7 + Math.sin(x * 0.004 + time * 0.01) * 0.3);
          upperPoints.push({ x, y: y - halfThick });
          lowerPoints.push({ x, y: y + halfThick });
        }

        // Fill strip
        ctx.beginPath();
        ctx.moveTo(upperPoints[0].x, upperPoints[0].y);
        for (let i = 1; i < upperPoints.length; i++) {
          ctx.lineTo(upperPoints[i].x, upperPoints[i].y);
        }
        for (let i = lowerPoints.length - 1; i >= 0; i--) {
          ctx.lineTo(lowerPoints[i].x, lowerPoints[i].y);
        }
        ctx.closePath();

        const ribbonGrad = ctx.createLinearGradient(0, 0, width, height);
        ribbonGrad.addColorStop(0, ribbonStyle.colorStart);
        ribbonGrad.addColorStop(0.5, ribbonStyle.colorMid);
        ribbonGrad.addColorStop(1, ribbonStyle.colorEnd);
        ctx.fillStyle = ribbonGrad;
        ctx.fill();

        // Glowing crest edge line
        ctx.beginPath();
        ctx.moveTo(upperPoints[0].x, upperPoints[0].y);
        for (let i = 1; i < upperPoints.length; i++) {
          ctx.lineTo(upperPoints[i].x, upperPoints[i].y);
        }
        ctx.strokeStyle = ribbonStyle.edgeColor;
        ctx.lineWidth = ribbonStyle.lineWidth;
        ctx.shadowColor = ribbonStyle.edgeColor;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    const intersectionObserver = new IntersectionObserver((entries) => {
      isVisible = entries[0]?.isIntersecting ?? false;
    });

    intersectionObserver.observe(container);
    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative inline-block select-none leading-none">
      {/* Invisible text that sizes the container perfectly to the font metrics */}
      <span className={`invisible select-none ${className}`} aria-hidden="true">
        {text}
      </span>

      {/* SVG Mask: clips the canvas strictly to the text glyphs */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden"
        aria-hidden="true"
      >
        <defs>
          <mask id="sine-ribbons-text-mask">
            {/* White fills allow the canvas through; black blocks it */}
            <rect width="100%" height="100%" fill="black" />
            <text
              x="50%"
              y="50%"
              dominantBaseline="central"
              textAnchor="middle"
              fill="white"
              className={className}
            >
              {text}
            </text>
          </mask>
        </defs>

        {/* ForeignObject embeds the HTML5 Canvas inside the masked SVG region */}
        <foreignObject
          width="100%"
          height="100%"
          mask="url(#sine-ribbons-text-mask)"
        >
          <canvas
            ref={canvasRef}
            className="h-full w-full block"
          />
        </foreignObject>
      </svg>
    </div>
  );
}
