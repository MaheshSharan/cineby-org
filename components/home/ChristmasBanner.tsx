import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { buildImageUrl } from "@/lib/tmdb/image";
import type { MediaSummary } from "@/lib/tmdb/types";
import { CHRISTMAS_KEYWORD_ID, getChristmasStatus } from "@/lib/christmas";
import { getMediaHref } from "@/lib/utils/media";

export { CHRISTMAS_KEYWORD_ID, getChristmasStatus };

// Full-width edge-to-edge festive fairy lights string
function FairyLights() {
  const bulbs = useMemo(() => {
    const colors = [
      { fill: "#ef4444", grad: "xg-ef4444" },
      { fill: "#facc15", grad: "xg-facc15" },
      { fill: "#22c55e", grad: "xg-22c55e" },
      { fill: "#38bdf8", grad: "xg-38bdf8" },
      { fill: "#f8fafc", grad: "xg-f8fafc" },
    ];
    const list: { cx: number; cy: number; fill: string; grad: string; delay: number; dur: number }[] = [];
    const count = 30;
    for (let i = 0; i < count; i++) {
      const cx = 20 + i * 46;
      const isDip = i % 2 === 1;
      const cy = isDip ? 25 : 20;
      const c = colors[i % colors.length];
      list.push({
        cx,
        cy,
        fill: c.fill,
        grad: c.grad,
        delay: (i * 0.35) % 2.4,
        dur: 2 + (i % 3) * 0.6,
      });
    }
    return list;
  }, []);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-9 sm:h-10 overflow-hidden" aria-hidden="true">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1400 42"
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
        className="w-full h-full"
      >
        <defs>
          <radialGradient id="xg-ef4444">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="xg-facc15">
            <stop offset="0%" stopColor="#facc15" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="xg-22c55e">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="xg-38bdf8">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="xg-f8fafc">
            <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#f8fafc" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g className="xmas-wire">
        {/* Scalloped wire spanning 1400px width */}
        <path
          d="M0 4 Q46 25 92 4 M92 4 Q138 25 184 4 M184 4 Q230 25 276 4 M276 4 Q322 25 368 4 M368 4 Q414 25 460 4 M460 4 Q506 25 552 4 M552 4 Q598 25 644 4 M644 4 Q690 25 736 4 M736 4 Q782 25 828 4 M828 4 Q874 25 920 4 M920 4 Q966 25 1012 4 M1012 4 Q1058 25 1104 4 M1104 4 Q1150 25 1196 4 M1196 4 Q1242 25 1288 4 M1288 4 Q1334 25 1400 4"
          stroke="#163824"
          strokeWidth="1.5"
          fill="none"
          shapeRendering="auto"
        />

        {/* Dainty glowing bulbs */}
        {bulbs.map((b, idx) => (
          <g
            key={idx}
            className={`xmas-bulb xmas-bulb-${idx % 3}`}
            style={{
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.dur}s`,
            }}
          >
            <circle cx={b.cx} cy={b.cy} r="11" fill={`url(#${b.grad})`} />
            <rect x={b.cx - 1.5} y={b.cy - 8} width="3" height="3" fill="#14532d" />
            <rect x={b.cx - 2} y={b.cy - 5} width="4" height="6" rx="1" fill={b.fill} />
            <rect x={b.cx - 1} y={b.cy + 1} width="2" height="1.5" fill={b.fill} />
            <rect x={b.cx - 1} y={b.cy - 4} width="1" height="2.5" fill="#fff" opacity="0.8" />
          </g>
        ))}
        </g>
      </svg>
    </div>
  );
}

// Fixed star positions (no Math.random) so the server and browser render the same sky.
const SKY_STARS = Array.from({ length: 34 }, (_, i) => ({
  left: (i * 37 + (i % 5) * 11) % 97,
  top: (i * 53 + (i % 4) * 7) % 62,
  size: i % 7 === 0 ? 3 : i % 3 === 0 ? 2 : 1.5,
  delay: (i * 0.43) % 4,
  dur: 2.2 + (i % 5) * 0.7,
}));

// Twinkling stars, a slow aurora glow and an occasional shooting star
function NightSky() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden" aria-hidden="true">
      <div
        className="xmas-aurora absolute -top-10 left-[8%] h-40 w-[70%] rounded-full blur-3xl"
        style={{ background: "radial-gradient(ellipse at center, rgba(52,211,153,0.22) 0%, rgba(56,189,248,0.12) 45%, transparent 72%)" }}
      />
      {SKY_STARS.map((star, i) => (
        <span
          key={i}
          className="xmas-star absolute rounded-full bg-white"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: star.size,
            height: star.size,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.dur}s`,
            boxShadow: star.size >= 3 ? "0 0 6px 1px rgba(255,255,255,0.7)" : undefined,
          }}
        />
      ))}
      <span
        className="xmas-shooting-star absolute right-[30%] top-[14%] h-px w-16"
        style={{ background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.95))" }}
      />
    </div>
  );
}

// Foreground snow glints: fixed positions, each flashes at its own time
const SNOW_SPARKLES = [
  { x: 70, y: 186, d: 0 }, { x: 190, y: 178, d: 1.1 }, { x: 330, y: 190, d: 2.3 },
  { x: 450, y: 181, d: 0.6 }, { x: 580, y: 188, d: 1.8 }, { x: 690, y: 183, d: 2.9 },
  { x: 800, y: 189, d: 0.3 }, { x: 930, y: 180, d: 1.5 }, { x: 1040, y: 190, d: 2.6 },
  { x: 1150, y: 182, d: 0.9 }, { x: 1260, y: 187, d: 2.0 }, { x: 1350, y: 179, d: 1.3 },
];

// Detailed realistic Christmas Moon with lunar craters & atmospheric halo
function FestiveMoon() {
  return (
    <div
      className="pointer-events-none absolute top-4 right-[16%] sm:right-[20%] md:right-[24%] h-24 w-24 sm:h-28 sm:w-28 rounded-full overflow-hidden z-10"
      style={{
        background: "radial-gradient(circle at 42% 42%, #ffffff 0%, #f1f5f9 45%, #cbd5e1 80%, #94a3b8 100%)",
        boxShadow:
          "0 0 35px 8px rgba(255, 255, 230, 0.65), 0 0 80px 25px rgba(200, 235, 255, 0.3), 0 0 140px 60px rgba(180, 225, 240, 0.12)",
      }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" className="w-full h-full opacity-60">
        <path
          d="M25 35 Q35 25 50 28 Q65 32 60 48 Q55 60 40 55 Q28 50 25 35 Z"
          fill="#64748b"
          opacity="0.25"
        />
        <path
          d="M55 45 Q70 40 78 55 Q82 70 70 75 Q58 75 55 65 Z"
          fill="#64748b"
          opacity="0.22"
        />
        <path
          d="M20 58 Q32 55 35 68 Q32 80 22 78 Q15 72 20 58 Z"
          fill="#64748b"
          opacity="0.2"
        />

        <circle cx="38" cy="42" r="7" fill="#475569" opacity="0.22" />
        <circle cx="37" cy="41" r="6" fill="#f8fafc" opacity="0.25" />

        <circle cx="68" cy="58" r="6" fill="#475569" opacity="0.25" />
        <circle cx="67" cy="57" r="5" fill="#f8fafc" opacity="0.25" />

        <circle cx="48" cy="72" r="8" fill="#475569" opacity="0.2" />
        <circle cx="47" cy="71" r="7" fill="#f8fafc" opacity="0.22" />

        <circle cx="30" cy="26" r="4.5" fill="#475569" opacity="0.2" />
        <circle cx="75" cy="35" r="4" fill="#475569" opacity="0.18" />
        <circle cx="58" cy="22" r="3" fill="#475569" opacity="0.15" />

        <circle
          cx="50"
          cy="50"
          r="49"
          fill="none"
          stroke="rgba(100, 116, 139, 0.3)"
          strokeWidth="3"
        />
      </svg>
    </div>
  );
}

const TREE_LIGHT_COLORS = ["#ef4444", "#facc15", "#38bdf8", "#22c55e", "#f472b6"];

// Light positions along the three garlands of a tree (tree space is 40 wide, 56 tall)
const TREE_LIGHTS = [
  [8, 38.5], [14, 42], [20, 43.5], [26, 42], [32, 38.5],
  [12, 25], [20, 29], [28, 24.5],
  [15.5, 12], [20, 14.5], [24.5, 11.5],
];

interface ChristmasTreeProps {
  x: number;
  baseY: number;
  scale: number;
  delay?: number;
}

// Layered pine with snow caps, glowing garlands, baubles and a pulsing star
function ChristmasTree({ x, baseY, scale, delay = 0 }: ChristmasTreeProps) {
  return (
    <g transform={`translate(${x - 20 * scale}, ${baseY - 55 * scale}) scale(${scale})`}>
      <ellipse cx="20" cy="55" rx="17" ry="2.6" fill="#7fb6a0" opacity="0.4" />
      <g className="xmas-tree-sway" style={{ animationDelay: `${delay}s` }}>
        <rect x="18" y="46" width="5" height="9" fill="#3a1e0c" rx="1" />
        <polygon points="20,22 1,48 39,48" fill="url(#treeTierA)" />
        <polygon points="20,10 5,33 35,33" fill="url(#treeTierB)" />
        <polygon points="20,0 10,19 30,19" fill="url(#treeTierC)" />
        <path d="M1 48 Q8 43 13 46.5 Q20 41 27 46.5 Q32 43 39 48 Z" fill="#f1f8f4" />
        <path d="M5 33 Q11 29 16 31.5 Q20 28 24 31.5 Q29 29 35 33 Z" fill="#f1f8f4" />
        <path d="M10 19 Q15 15.5 20 17 Q25 15.5 30 19 Z" fill="#f1f8f4" />
        <path d="M7 40 Q20 49 33 38" fill="none" stroke="#fbbf24" strokeWidth="0.9" opacity="0.85" />
        <path d="M11 26 Q20 32 29 25" fill="none" stroke="#fbbf24" strokeWidth="0.9" opacity="0.85" />
        <path d="M14 13 Q20 17 26 12" fill="none" stroke="#fbbf24" strokeWidth="0.9" opacity="0.85" />
        {TREE_LIGHTS.map(([lx, ly], i) => (
          <circle
            key={i}
            cx={lx}
            cy={ly}
            r="1.25"
            fill={TREE_LIGHT_COLORS[i % TREE_LIGHT_COLORS.length]}
            className="xmas-ornament"
            style={{ animationDelay: `${(delay + i * 0.37) % 2.6}s` }}
          />
        ))}
        <circle cx="16" cy="36" r="1.7" fill="#dc2626" />
        <circle cx="25" cy="34.5" r="1.7" fill="#2563eb" />
        <circle cx="19" cy="22" r="1.4" fill="#f59e0b" />
        <polygon
          points="20,-6 21.4,-2 25.5,-2 22.2,0.5 23.4,4.5 20,2 16.6,4.5 17.8,0.5 14.5,-2 18.6,-2"
          fill="#fde047"
          className="xmas-topper"
        />
      </g>
    </g>
  );
}

// Presents stacked under a tree
function GiftBoxes({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x="0" y="0" width="12" height="9" fill="#dc2626" rx="0.8" />
      <rect x="5" y="0" width="2" height="9" fill="#fde047" />
      <rect x="0" y="3.5" width="12" height="2" fill="#fde047" />
      <rect x="14" y="3" width="9" height="6" fill="#2563eb" rx="0.8" />
      <rect x="18" y="3" width="1.6" height="6" fill="#f8fafc" />
      <rect x="5" y="-7" width="8" height="7" fill="#16a34a" rx="0.8" />
      <rect x="8.4" y="-7" width="1.4" height="7" fill="#fde047" />
    </g>
  );
}

const TREE_GROVE: ChristmasTreeProps[] = [
  { x: 95, baseY: 178, scale: 1.9, delay: 0.4 },
  { x: 205, baseY: 168, scale: 1.4, delay: 1.2 },
  { x: 320, baseY: 180, scale: 2.1, delay: 2.0 },
  { x: 470, baseY: 166, scale: 1.5, delay: 0.8 },
  { x: 880, baseY: 166, scale: 1.5, delay: 1.6 },
  { x: 985, baseY: 180, scale: 2.1, delay: 0.2 },
  { x: 1105, baseY: 170, scale: 1.45, delay: 2.4 },
  { x: 1215, baseY: 180, scale: 1.9, delay: 1.0 },
  { x: 1325, baseY: 168, scale: 1.5, delay: 1.8 },
];

const RIDGE_PINES = [40, 120, 210, 290, 395, 470, 560, 840, 930, 1020, 1110, 1190, 1280, 1365];
const SMOKE_PUFFS = [0, 0.55, 1.1, 1.65, 2.2, 2.75, 3.3, 3.85];
const ICICLE_XS = [-3, 2, 7, 12, 17, 29, 34, 39, 44, 49];
const EAVE_LIGHT_XS = [-4, 3, 10, 17, 24, 31, 38, 45, 52];

// Snowy valley: forest ridge, a cozy log cabin with a smoking stone chimney, and a grove of lit trees
function SnowyWinterLandscape() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 w-full" aria-hidden="true">
      <svg
        viewBox="0 0 1400 200"
        preserveAspectRatio="xMidYMax slice"
        className="w-full h-40 sm:h-48 md:h-56 overflow-visible"
      >
        <defs>
          <linearGradient id="snowGradBack" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e4d36" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#0d281a" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="snowGradMid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8fc3ad" />
            <stop offset="55%" stopColor="#3d735b" />
            <stop offset="100%" stopColor="#163826" />
          </linearGradient>
          <linearGradient id="snowGradFront" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor="#e2f1ea" />
            <stop offset="100%" stopColor="#b4d7c7" />
          </linearGradient>
          <linearGradient id="treeTierA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f4a28" />
            <stop offset="100%" stopColor="#082b17" />
          </linearGradient>
          <linearGradient id="treeTierB" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#176b38" />
            <stop offset="100%" stopColor="#0e4a28" />
          </linearGradient>
          <linearGradient id="treeTierC" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22964a" />
            <stop offset="100%" stopColor="#15693a" />
          </linearGradient>
          <radialGradient id="cabinGlow">
            <stop offset="0%" stopColor="#fde68a" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="smokeGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
        </defs>

        {/* Distant forest ridge with pines */}
        <path
          d="M0 200 L0 118 Q100 100 220 112 Q340 90 460 108 Q580 88 700 104 Q820 86 940 104 Q1060 88 1180 106 Q1300 94 1400 110 L1400 200 Z"
          fill="url(#snowGradBack)"
        />
        <g fill="#14402a" opacity="0.8">
          {RIDGE_PINES.map((px, i) => {
            const top = 76 + (i % 3) * 6;
            const base = 112 + (i % 3) * 2;
            return <polygon key={px} points={`${px},${top} ${px - 11},${base} ${px + 11},${base}`} />;
          })}
        </g>

        {/* Mid-distance rolling hill */}
        <path
          d="M0 200 L0 138 Q200 114 400 134 Q600 110 800 132 Q1000 112 1200 130 Q1320 122 1400 132 L1400 200 Z"
          fill="url(#snowGradMid)"
          opacity="0.9"
        />

        {/* Front snow drift the cabin sits on */}
        <path
          d="M0 200 L0 158 Q250 138 500 154 Q750 134 1000 152 Q1250 138 1400 150 L1400 200 Z"
          fill="url(#snowGradFront)"
        />

        {/* Warm glow around the cabin */}
        <circle cx="700" cy="118" r="100" fill="url(#cabinGlow)" className="xmas-window" />

        {/* LOG CABIN */}
        <g transform="translate(645, 72) scale(2.4)">
          {/* Chimney smoke: wavering puffs that drift and grow */}
          {SMOKE_PUFFS.map((delay, i) => (
            <circle
              key={delay}
              cx={37 + (i % 2) * 0.8}
              cy="-10"
              r={3 + (i % 3) * 0.7}
              fill="url(#smokeGrad)"
              className="xmas-smoke-puff"
              style={{ animationDelay: `${delay}s`, animationDuration: `${4.2 + (i % 3) * 0.5}s` }}
            />
          ))}

          {/* Stone chimney with snow cap */}
          <rect x="33" y="-8" width="8" height="16" fill="#6b7280" />
          <g stroke="#4b5563" strokeWidth="0.5">
            <line x1="33" y1="-3" x2="41" y2="-3" />
            <line x1="33" y1="2" x2="41" y2="2" />
            <line x1="37" y1="-8" x2="37" y2="-3" />
            <line x1="35" y1="-3" x2="35" y2="2" />
            <line x1="39" y1="-3" x2="39" y2="2" />
          </g>
          <rect x="32" y="-10" width="10" height="3" fill="#f8fafc" rx="1.2" />

          {/* Log walls with end caps */}
          <rect x="0" y="8" width="46" height="26" fill="#6b4226" rx="1.5" />
          {[13, 18, 23, 28].map((ly) => (
            <line key={ly} x1="0" y1={ly} x2="46" y2={ly} stroke="#3f2411" strokeWidth="0.9" />
          ))}
          {[10.5, 15.5, 20.5, 25.5, 30.5].map((ly) => (
            <g key={ly}>
              <circle cx="0.6" cy={ly} r="1.6" fill="#8a5a33" />
              <circle cx="45.4" cy={ly} r="1.6" fill="#8a5a33" />
            </g>
          ))}

          {/* Windows: warm light, frames, curtains */}
          <rect x="3" y="11" width="16" height="16" fill="#fde68a" opacity="0.28" rx="3" className="xmas-window" />
          <rect x="27" y="11" width="16" height="16" fill="#fde68a" opacity="0.28" rx="3" className="xmas-window" style={{ animationDelay: "0.9s" }} />
          <rect x="6" y="14" width="10" height="10" fill="#fef08a" rx="1" className="xmas-window" />
          <rect x="30" y="14" width="10" height="10" fill="#fef08a" rx="1" className="xmas-window" style={{ animationDelay: "0.9s" }} />
          <path d="M6 14 L9 14 L6 20 Z M16 14 L13 14 L16 20 Z" fill="#b91c1c" opacity="0.8" />
          <path d="M30 14 L33 14 L30 20 Z M40 14 L37 14 L40 20 Z" fill="#b91c1c" opacity="0.8" />
          <g stroke="#78350f" strokeWidth="0.8" fill="none">
            <rect x="6" y="14" width="10" height="10" />
            <line x1="11" y1="14" x2="11" y2="24" />
            <line x1="6" y1="19" x2="16" y2="19" />
            <rect x="30" y="14" width="10" height="10" />
            <line x1="35" y1="14" x2="35" y2="24" />
            <line x1="30" y1="19" x2="40" y2="19" />
          </g>
          {/* Snowy sills */}
          <rect x="5" y="24" width="12" height="1.6" fill="#f8fafc" rx="0.8" />
          <rect x="29" y="24" width="12" height="1.6" fill="#f8fafc" rx="0.8" />

          {/* Door, wreath, step */}
          <rect x="19" y="17" width="8" height="17" fill="#3b1f0c" rx="0.8" />
          <circle cx="25.2" cy="25.5" r="0.7" fill="#facc15" />
          <circle cx="23" cy="21.5" r="2.5" fill="none" stroke="#166534" strokeWidth="1.3" />
          <circle cx="23" cy="24" r="0.75" fill="#ef4444" />
          <circle cx="21.3" cy="20.6" r="0.5" fill="#fde047" className="xmas-ornament" />
          <circle cx="24.7" cy="20.6" r="0.5" fill="#38bdf8" className="xmas-ornament" style={{ animationDelay: "0.8s" }} />
          <rect x="17" y="34" width="12" height="2.2" fill="#8a5a33" rx="0.6" />
          <rect x="17" y="34" width="12" height="0.9" fill="#f8fafc" />

          {/* Snow-covered roof with overhang and icicles */}
          <polygon points="-5,8 23,-6 51,8" fill="#1e3a2b" />
          <path d="M-8 8 Q23 -10 54 8 Q23 -3 -8 8 Z" fill="#ffffff" />
          <path d="M-8 8 Q-2 5 4 8 Q10 5 16 8 Q22 4 28 8 Q34 5 40 8 Q46 5 54 8" fill="none" stroke="#e2e8f0" strokeWidth="0.6" />
          {ICICLE_XS.map((ix, i) => (
            <polygon key={ix} points={`${ix},8.4 ${ix + 1.1},8.4 ${ix + 0.55},${11 + (i % 3)}`} fill="#dbeafe" opacity="0.9" />
          ))}
          {/* Fairy lights along the eaves */}
          {EAVE_LIGHT_XS.map((ex, i) => (
            <circle
              key={ex}
              cx={ex}
              cy={9.8 + (i % 2) * 0.8}
              r="1.15"
              fill={TREE_LIGHT_COLORS[i % 4]}
              className="xmas-ornament"
              style={{ animationDelay: `${i * 0.33}s` }}
            />
          ))}

          {/* Lamp post */}
          <rect x="-9" y="16" width="1.2" height="19" fill="#374151" />
          <circle cx="-8.4" cy="15" r="5" fill="#fde68a" opacity="0.3" className="xmas-window" />
          <circle cx="-8.4" cy="15" r="1.6" fill="#fef3c7" className="xmas-window" />

          {/* Woodpile */}
          <rect x="50" y="29" width="9" height="2.4" fill="#5c381e" rx="1.2" />
          <rect x="50" y="31.6" width="9" height="2.4" fill="#6b4226" rx="1.2" />
          <rect x="52" y="26.6" width="6" height="2.4" fill="#6b4226" rx="1.2" />
          <rect x="49.5" y="25.4" width="10" height="1.6" fill="#f8fafc" rx="0.8" />
        </g>

        {/* Snow mound against the cabin base */}
        <ellipse cx="700" cy="153" rx="70" ry="6" fill="#f8fafc" />

        {/* Fence with snow caps beside the cabin */}
        <g>
          {[520, 536, 552, 568].map((fx) => (
            <g key={fx}>
              <rect x={fx} y="140" width="3" height="16" fill="#6b4226" rx="0.6" />
              <rect x={fx - 0.5} y="138.5" width="4" height="2" fill="#f8fafc" rx="1" />
            </g>
          ))}
          <rect x="519" y="145" width="53" height="2" fill="#6b4226" />
          <rect x="519" y="144" width="53" height="1" fill="#f8fafc" />
        </g>

        {/* Snowman */}
        <g transform="translate(588, 128)">
          <ellipse cx="11" cy="32" rx="11" ry="2.4" fill="#0d281a" opacity="0.2" />
          <circle cx="11" cy="25" r="8.5" fill="#f1f5f9" />
          <circle cx="11" cy="14" r="6" fill="#ffffff" />
          <circle cx="11" cy="6.6" r="4.3" fill="#ffffff" />
          <polygon points="11,6.6 17,7.6 11,8.7" fill="#f97316" />
          <circle cx="9.6" cy="5.4" r="0.6" fill="#111827" />
          <circle cx="12.5" cy="5.4" r="0.6" fill="#111827" />
          <rect x="6" y="10.6" width="10" height="2" fill="#dc2626" rx="0.8" />
          <rect x="13.4" y="11" width="2" height="5" fill="#dc2626" rx="0.6" />
          <rect x="6.8" y="0.6" width="8.4" height="2.8" fill="#1f2937" />
          <rect x="8.4" y="-3.4" width="5.2" height="4.2" fill="#1f2937" />
          <rect x="8.4" y="-0.4" width="5.2" height="1" fill="#dc2626" />
          <circle cx="11" cy="18" r="0.7" fill="#111827" />
          <circle cx="11" cy="22" r="0.7" fill="#111827" />
          <line x1="3.6" y1="14" x2="-4" y2="9" stroke="#52321c" strokeWidth="1.1" strokeLinecap="round" />
          <line x1="18.4" y1="14" x2="26" y2="9" stroke="#52321c" strokeWidth="1.1" strokeLinecap="round" />
        </g>

        {/* Hero tree beside the cabin, with presents */}
        <ChristmasTree x={800} baseY={176} scale={2.35} delay={0.6} />
        <GiftBoxes x={768} y={168} />
        <GiftBoxes x={826} y={170} />

        {/* Tree grove */}
        {TREE_GROVE.map((tree) => (
          <ChristmasTree key={tree.x} {...tree} />
        ))}

        {/* Foreground snow blanket */}
        <path
          d="M0 200 L0 178 Q300 162 600 174 Q900 160 1150 172 Q1300 166 1400 170 L1400 200 Z"
          fill="#f8fafc"
          opacity="0.97"
        />

        {/* Footpath from the door */}
        <path d="M690 156 Q668 172 640 200 L734 200 Q716 176 712 156 Z" fill="#dbeafe" opacity="0.55" />

        {/* Snow glints */}
        {SNOW_SPARKLES.map((sp) => (
          <path
            key={sp.x}
            d={`M${sp.x} ${sp.y - 4} L${sp.x + 1} ${sp.y - 1} L${sp.x + 4} ${sp.y} L${sp.x + 1} ${sp.y + 1} L${sp.x} ${sp.y + 4} L${sp.x - 1} ${sp.y + 1} L${sp.x - 4} ${sp.y} L${sp.x - 1} ${sp.y - 1} Z`}
            fill="#ffffff"
            className="xmas-sparkle"
            style={{ animationDelay: `${sp.d}s` }}
          />
        ))}
      </svg>
    </div>
  );
}

// 5 fanned card offsets with gentle rotation & elevation
const FAN_CARDS = [
  { rot: -7, y: 12, z: 1 },
  { rot: -3.5, y: 3, z: 2 },
  { rot: 0, y: -4, z: 5 },
  { rot: 3.5, y: 3, z: 2 },
  { rot: 7, y: 12, z: 1 },
];

interface ChristmasBannerProps {
  movies: MediaSummary[];
}

export function ChristmasBanner({ movies }: ChristmasBannerProps) {
  const status = useMemo(() => getChristmasStatus(), []);
  const displayMovies = movies.slice(0, 5);
  const miniThumbMovies = movies.slice(0, 3);
  const isCountdown = !status.isEve && !status.isChristmasDay && status.daysRemaining > 0;

  if (!status.isActive) {
    return null;
  }

  return (
    <section className="xmas-banner relative mx-auto w-full overflow-hidden rounded-2xl border border-red-900/40 bg-gradient-to-br from-[#0a1a12] via-[#102a1c] to-[#1e3a2a] my-3">
      {/* Google font import for "Mountains of Christmas" + Keyframes */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Mountains+of+Christmas:wght@700&display=swap');

        @keyframes xmas-twinkle-a { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
        @keyframes xmas-twinkle-b { 0%, 100% { opacity: 0.4; } 20% { opacity: 1; } 40% { opacity: 0.55; } 60% { opacity: 1; } 80% { opacity: 0.5; } }
        @keyframes xmas-twinkle-c { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
        .xmas-bulb { animation: xmas-twinkle-a 2.4s ease-in-out infinite; }
        .xmas-bulb-1 { animation-name: xmas-twinkle-b; }
        .xmas-bulb-2 { animation-name: xmas-twinkle-c; }

        @keyframes xmas-wire-sway { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(1.6px); } }
        .xmas-wire { animation: xmas-wire-sway 6s ease-in-out infinite; }

        .xmas-star { opacity: 0.4; animation: xmas-twinkle-b 3s ease-in-out infinite; }
        @keyframes xmas-aurora { 0%, 100% { opacity: 0.35; transform: translateX(-4%); } 50% { opacity: 0.7; transform: translateX(5%); } }
        .xmas-aurora { animation: xmas-aurora 14s ease-in-out infinite; }
        @keyframes xmas-shoot {
          0%, 86% { transform: translate(0, 0) rotate(-25deg); opacity: 0; }
          88% { opacity: 1; }
          100% { transform: translate(-240px, 110px) rotate(-25deg); opacity: 0; }
        }
        .xmas-shooting-star { opacity: 0; animation: xmas-shoot 13s linear 4s infinite; }

        @keyframes xmas-window { 0%, 100% { opacity: 1; } 45% { opacity: 0.8; } 55% { opacity: 0.95; } 75% { opacity: 0.74; } }
        .xmas-window { animation: xmas-window 3.4s ease-in-out infinite; }
        @keyframes xmas-tree-sway { 0%, 100% { transform: rotate(-0.9deg); } 50% { transform: rotate(0.9deg); } }
        .xmas-tree-sway { transform-box: fill-box; transform-origin: 50% 100%; animation: xmas-tree-sway 5.5s ease-in-out infinite; }
        .xmas-ornament { animation: xmas-twinkle-b 2.4s ease-in-out infinite; }
        @keyframes xmas-topper { 0%, 100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.3); opacity: 1; } }
        .xmas-topper { transform-box: fill-box; transform-origin: center; animation: xmas-topper 2.6s ease-in-out infinite; }
        @keyframes xmas-sparkle { 0%, 100% { transform: scale(0); opacity: 0; } 50% { transform: scale(1); opacity: 0.95; } }
        .xmas-sparkle { transform-box: fill-box; transform-origin: center; animation: xmas-sparkle 3.2s ease-in-out infinite; }

        @keyframes xmas-shimmer { 0% { transform: translateX(-130%); } 55%, 100% { transform: translateX(130%); } }
        .xmas-pill::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(100deg, transparent 30%, rgba(255, 255, 255, 0.28) 50%, transparent 70%);
          animation: xmas-shimmer 4.5s ease-in-out infinite;
        }
        @keyframes xmas-badge-glow { 0%, 100% { box-shadow: 0 0 0 0 rgba(252, 211, 77, 0.45); } 50% { box-shadow: 0 0 10px 2px rgba(252, 211, 77, 0.35); } }
        .xmas-pill-badge { animation: xmas-badge-glow 2.6s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .xmas-banner *, .xmas-banner *::after { animation: none !important; }
        }

        .xmas-poster {
          transform: rotate(var(--r)) translateY(var(--y));
          transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), z-index 0s;
        }
        .xmas-poster:hover {
          transform: translateY(-14px) rotate(0deg) scale(1.08) !important;
          z-index: 30 !important;
        }

        @keyframes xmas-swing {
          0%, 100% { transform: rotate(-6deg); }
          50% { transform: rotate(6deg); }
        }
        .xmas-swing {
          animation: xmas-swing 3.2s ease-in-out infinite;
          transform-origin: 50% -50px;
        }

        @keyframes xmas-smoke {
          0% { transform: translate(0, 0) scale(0.5); opacity: 0; }
          12% { opacity: 0.75; }
          35% { transform: translate(3px, -9px) scale(1.2); }
          60% { transform: translate(-2px, -18px) scale(1.8); opacity: 0.45; }
          100% { transform: translate(7px, -29px) scale(2.5); opacity: 0; }
        }
        .xmas-smoke-puff {
          transform-box: fill-box;
          transform-origin: center;
          animation: xmas-smoke 4.5s ease-out infinite;
        }
      `}</style>

      <NightSky />

      {/* Full-width edge-to-edge fairy lights along top */}
      <FairyLights />

      {/* Hanging Christmas bauble ornament (top right) */}
      <div className="absolute right-4 top-1 z-20 hidden sm:block pointer-events-none" aria-hidden="true">
        <div className="relative flex h-10 w-10 items-center justify-center">
          <span className="xmas-swing relative flex flex-col items-center">
            <span className="absolute bottom-full left-1/2 h-14 w-px -translate-x-1/2 bg-white/40" />
            <svg viewBox="0 0 12 14" className="h-7 w-auto drop-shadow-[0_0_8px_rgba(251,146,60,0.7)]" shapeRendering="crispEdges">
              <rect x="4" y="0" width="4" height="2" fill="#a1a1aa" />
              <rect x="3" y="2" width="6" height="1" fill="#f97316" />
              <rect x="1" y="3" width="10" height="2" fill="#f97316" />
              <rect x="0" y="5" width="12" height="2" fill="#fb923c" />
              <rect x="0" y="7" width="12" height="1" fill="#facc15" />
              <rect x="0" y="8" width="12" height="2" fill="#f97316" />
              <rect x="1" y="10" width="10" height="2" fill="#ea580c" />
              <rect x="3" y="12" width="6" height="1" fill="#c2410c" />
              <rect x="2" y="4" width="2" height="2" fill="#fff" opacity="0.6" />
            </svg>
          </span>
        </div>
      </div>

      {/* Detailed realistic full moon with craters & atmospheric halo */}
      <FestiveMoon />

      {/* Multi-layered snowy landscape with center cabin & live rising chimney smoke */}
      <SnowyWinterLandscape />

      {/* Main banner grid content */}
      <div className="relative z-20 grid gap-6 p-5 pt-12 sm:p-6 sm:pt-14 md:grid-cols-[1fr_auto] md:items-center md:gap-8 md:p-10 lg:p-12 pb-44 sm:pb-44 md:pb-44 lg:pb-48">

        {/* Left Column: Heading, countdown, copy, unified collection card button */}
        <div className="max-w-md text-center md:text-left mx-auto md:mx-0">

          {/* Dynamic Holiday / Countdown Pill */}
          <span
            aria-label={status.pillText}
            className="xmas-pill relative mb-3 inline-flex items-center gap-2 overflow-hidden rounded-full border border-amber-300/40 bg-gradient-to-r from-red-800/70 via-red-600/50 to-emerald-700/55 py-1 pl-1 pr-4 text-xs font-semibold text-red-50 shadow-[0_0_20px_rgba(239,68,68,0.35)] backdrop-blur-sm"
          >
            <span className="xmas-pill-badge flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-red-950/75 px-1.5 text-[13px] font-bold tabular-nums text-amber-200 ring-1 ring-amber-300/50">
              {isCountdown ? (
                status.daysRemaining
              ) : (
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                  <path d="M12 2 L14.6 8.6 L21.5 9.2 L16.2 13.8 L17.9 20.6 L12 16.9 L6.1 20.6 L7.8 13.8 L2.5 9.2 L9.4 8.6 Z" fill="#fde047" />
                </svg>
              )}
            </span>
            <span className="relative tracking-wide">
              {isCountdown ? `${status.daysRemaining === 1 ? "day" : "days"} to Christmas` : status.pillText}
            </span>
          </span>

          {/* Exact calligraphy title: "Cozy up for the holidays." */}
          <h2
            className="mt-2 text-4xl sm:text-5xl md:text-5xl lg:text-6xl font-bold leading-tight text-red-100 tracking-wide"
            style={{
              fontFamily: "'Mountains of Christmas', cursive, sans-serif",
              textShadow: "0 2px 0 rgba(127,29,29,0.7), 0 0 22px rgba(220,38,38,0.25)",
            }}
          >
            Cozy up for the holidays.
          </h2>

          <p className="mt-3 text-sm md:text-base text-emerald-50/80 max-w-sm mx-auto md:mx-0">
            Warm family films, classics, and new favorites to share.
          </p>

          {/* Unified "Browse Christmas Movies" collection card button */}
          <div className="mt-5 flex justify-center md:justify-start">
            <Link
              href={`/browse/movie?keywords=${CHRISTMAS_KEYWORD_ID}`}
              aria-label="Browse Christmas Movies Collection"
              className="group inline-flex items-center gap-3.5 rounded-2xl border border-white/20 bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.9)] p-2.5 pr-5 text-left text-white shadow-xl shadow-black/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
            >
              {/* 3 mini fanned poster thumbnails */}
              <div className="relative flex h-14 w-20 shrink-0 items-center">
                {miniThumbMovies.map((m, idx) => {
                  const pUrl = buildImageUrl(m.posterPath, "w185");
                  const rot = (idx - 1) * 7;
                  const left = idx * 14;
                  return (
                    <div
                      key={m.id}
                      className="absolute h-14 w-10 rounded-md overflow-hidden ring-1 ring-white/30 shadow-lg transition-transform duration-300 group-hover:scale-105"
                      style={{
                        left: `${left}px`,
                        zIndex: 3 - idx,
                        transform: `rotate(${rot}deg)`,
                      }}
                    >
                      {pUrl ? (
                        <Image
                          src={pUrl}
                          alt={m.title}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      ) : (
                        <div className="w-full h-full bg-emerald-950 flex items-center justify-center text-[8px] text-white/50">
                          🎄
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="min-w-0 pr-1">
                <div className="text-sm sm:text-base font-bold leading-tight text-white flex items-center gap-1.5">
                  <span>Browse Christmas Movies</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
                <div className="text-xs text-white/80 mt-0.5">
                  3,400+ festive films to explore
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Right Column: 5 fanned posters with postcard borders */}
        {displayMovies.length > 0 && (
          <div className="flex items-end justify-center pb-2 md:justify-end shrink-0">
            {displayMovies.map((movie, i) => {
              const posterUrl = buildImageUrl(movie.posterPath, "w342");
              const cfg = FAN_CARDS[i] ?? { rot: 0, y: 0, z: 1 };

              return (
                <Link
                  key={movie.id}
                  href={getMediaHref(movie.mediaType, movie.id, movie.title)}
                  className={`xmas-poster relative -mx-1.5 sm:-mx-2 md:-mx-2.5 lg:-mx-3 w-24 sm:w-28 md:w-28 lg:w-32 shrink-0 cursor-pointer ${
                    i === 0 ? "hidden sm:block" : ""
                  }`}
                  aria-label={movie.title}
                  style={{
                    "--r": `${cfg.rot}deg`,
                    "--y": `${cfg.y}px`,
                    zIndex: cfg.z,
                  } as React.CSSProperties}
                  title={movie.title}
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl shadow-2xl shadow-black/85 ring-2 ring-white/25 sm:ring-[3px] sm:ring-white/30 bg-slate-900">
                    {posterUrl ? (
                      <Image
                        src={posterUrl}
                        alt={movie.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 96px, (max-width: 1024px) 112px, 128px"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center p-2 text-center">
                        <span className="text-white/40 text-xs">{movie.title}</span>
                      </div>
                    )}

                    <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-end p-2">
                      <span className="text-white text-[11px] font-medium line-clamp-2 leading-tight">
                        {movie.title}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
