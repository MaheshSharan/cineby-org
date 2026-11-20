import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { buildImageUrl } from "@/lib/tmdb/image";
import type { MediaSummary } from "@/lib/tmdb/types";
import { CHRISTMAS_KEYWORD_ID, getChristmasStatus } from "@/lib/christmas";

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
            className="xmas-bulb"
            style={{
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.dur}s`,
            }}
          >
            <circle cx={b.cx} cy={b.cy} r="9" fill={`url(#${b.grad})`} />
            <rect x={b.cx - 1.5} y={b.cy - 8} width="3" height="3" fill="#14532d" />
            <rect x={b.cx - 2} y={b.cy - 5} width="4" height="6" rx="1" fill={b.fill} />
            <rect x={b.cx - 1} y={b.cy + 1} width="2" height="1.5" fill={b.fill} />
            <rect x={b.cx - 1} y={b.cy - 4} width="1" height="2.5" fill="#fff" opacity="0.8" />
          </g>
        ))}
      </svg>
    </div>
  );
}

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

// Continuous snowy winter landscape with center cabin & live rising chimney smoke (left trees removed)
function SnowyWinterLandscape() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 w-full overflow-hidden" aria-hidden="true">
      <svg
        viewBox="0 0 1400 170"
        preserveAspectRatio="none"
        className="w-full h-28 sm:h-36 md:h-44"
      >
        <defs>
          <linearGradient id="snowGradBack" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e4d36" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0d281a" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="snowGradMid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#78ad97" />
            <stop offset="50%" stopColor="#3d735b" />
            <stop offset="100%" stopColor="#163826" />
          </linearGradient>
          <linearGradient id="snowGradFront" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#e2f1ea" />
            <stop offset="100%" stopColor="#b4d7c7" />
          </linearGradient>
          <linearGradient id="snowGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#d5ede2" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Layer 1: Distant dark forest silhouette ridge */}
        <path
          d="M0 170 L0 105 Q120 85 240 100 Q360 70 480 95 Q600 65 720 90 Q840 70 960 88 Q1080 65 1200 85 Q1320 75 1400 95 L1400 170 Z"
          fill="url(#snowGradBack)"
        />

        {/* Layer 2: Mid-distance rolling snowy hill */}
        <path
          d="M0 170 L0 120 Q160 95 320 115 Q480 88 640 110 Q800 85 960 105 Q1120 80 1280 102 Q1350 95 1400 110 L1400 170 Z"
          fill="url(#snowGradMid)"
          opacity="0.85"
        />

        {/* SINGLE COZY WINTER CABIN IN THE CENTER with LIVE animated rising chimney smoke */}
        <g transform="translate(560, 92) scale(1.35)">
          {/* Animated live chimney smoke puffs */}
          <circle cx="36" cy="-10" r="3.5" fill="#ffffff" className="xmas-smoke-puff" style={{ animationDelay: "0s" }} />
          <circle cx="36" cy="-10" r="4" fill="#ffffff" className="xmas-smoke-puff" style={{ animationDelay: "0.7s" }} />
          <circle cx="36" cy="-10" r="4.5" fill="#ffffff" className="xmas-smoke-puff" style={{ animationDelay: "1.4s" }} />
          <circle cx="36" cy="-10" r="5" fill="#ffffff" className="xmas-smoke-puff" style={{ animationDelay: "2.1s" }} />
          <circle cx="36" cy="-10" r="5.5" fill="#ffffff" className="xmas-smoke-puff" style={{ animationDelay: "2.8s" }} />

          {/* Chimney */}
          <rect x="33" y="-8" width="6" height="15" fill="#52321c" />
          <rect x="32" y="-10" width="8" height="3" fill="#3b1f0c" rx="1" />

          {/* Cabin Walls */}
          <rect x="0" y="8" width="46" height="26" fill="#5c381e" rx="1.5" />
          <line x1="0" y1="13" x2="46" y2="13" stroke="#402310" strokeWidth="1" />
          <line x1="0" y1="18" x2="46" y2="18" stroke="#402310" strokeWidth="1" />
          <line x1="0" y1="23" x2="46" y2="23" stroke="#402310" strokeWidth="1" />
          <line x1="0" y1="28" x2="46" y2="28" stroke="#402310" strokeWidth="1" />

          {/* Two warm glowing amber windows */}
          <rect x="6" y="14" width="10" height="10" fill="#fef08a" rx="1" />
          <line x1="11" y1="14" x2="11" y2="24" stroke="#78350f" strokeWidth="0.8" />
          <line x1="6" y1="19" x2="16" y2="19" stroke="#78350f" strokeWidth="0.8" />

          <rect x="30" y="14" width="10" height="10" fill="#fef08a" rx="1" />
          <line x1="35" y1="14" x2="35" y2="24" stroke="#78350f" strokeWidth="0.8" />
          <line x1="30" y1="19" x2="40" y2="19" stroke="#78350f" strokeWidth="0.8" />

          {/* Center wooden door */}
          <rect x="19" y="17" width="8" height="17" fill="#3b1f0c" rx="0.5" />
          <circle cx="25.5" cy="25" r="0.8" fill="#facc15" />

          {/* Snow-covered gabled roof */}
          <polygon points="-5,8 23,-6 51,8" fill="#1e3a2b" />
          <path d="M-8 8 Q23 -10 54 8 Q23 -3 -8 8 Z" fill="#ffffff" />
        </g>

        {/* Layer 3: Main rolling white snow drifts with gentle slope */}
        <path
          d="M0 170 L0 135 Q180 110 360 128 Q540 102 720 122 Q900 98 1080 118 Q1260 102 1400 122 L1400 170 Z"
          fill="url(#snowGradFront)"
        />

        {/* Snow highlights along top of drift */}
        <path
          d="M0 136 Q180 111 360 129 Q540 103 720 123 Q900 99 1080 119 Q1260 103 1400 123 L1400 129 Q1260 109 1080 125 Q900 105 720 129 Q540 109 360 135 Q180 117 0 142 Z"
          fill="url(#snowGlow)"
        />

        {/* Foreground undulating bright snow blanket */}
        <path
          d="M0 170 L0 150 Q220 132 460 146 Q700 126 940 142 Q1180 128 1400 142 L1400 170 Z"
          fill="#f8fafc"
          opacity="0.95"
        />

        {/* Trees positioned to the right of cabin framing the fanned posters */}
        {/* Tree 1: Right next to center cabin */}
        <g transform="translate(710, 74) scale(1.55)">
          <rect x="18" y="44" width="5" height="9" fill="#3a1e0c" rx="1" />
          <polygon points="20,24 3,46 37,46" fill="#0d2b17" />
          <path d="M3 46 Q10 42 20 44 Q30 42 37 46 Z" fill="#ffffff" />
          <polygon points="20,12 8,32 32,32" fill="#14532d" />
          <path d="M8 32 Q14 28 20 30 Q26 28 32 32 Z" fill="#ffffff" />
          <polygon points="20,2 12,18 28,18" fill="#166534" />
          <circle cx="15" cy="38" r="1.3" fill="#ef4444" />
          <circle cx="26" cy="40" r="1.3" fill="#38bdf8" />
          <polygon points="20,-2 21.2,1.2 24.5,1.2 21.8,3.2 22.8,6.5 20,4.5 17.2,6.5 18.2,3.2 15.5,1.2 18.8,1.2" fill="#fde047" />
        </g>

        {/* Tree 2: Mid-right hill under cards */}
        <g transform="translate(960, 62) scale(1.75)">
          <rect x="18" y="44" width="5" height="10" fill="#3a1e0c" rx="1" />
          <polygon points="20,24 2,46 38,46" fill="#0d2b17" />
          <path d="M2 46 Q10 42 20 44 Q30 42 38 46 Z" fill="#ffffff" />
          <polygon points="20,12 7,32 33,32" fill="#14532d" />
          <path d="M7 32 Q14 28 20 30 Q26 28 33 32 Z" fill="#ffffff" />
          <polygon points="20,2 11,18 29,18" fill="#166534" />
          <circle cx="13" cy="40" r="1.4" fill="#facc15" />
          <circle cx="28" cy="41" r="1.4" fill="#38bdf8" />
          <polygon points="20,-2 21.2,1.2 24.5,1.2 21.8,3.2 22.8,6.5 20,4.5 17.2,6.5 18.2,3.2 15.5,1.2 18.8,1.2" fill="#fde047" />
        </g>

        {/* Tree 3: Big prominent Christmas tree on the far right edge */}
        <g transform="translate(1300, 38) scale(2.2)">
          <rect x="18" y="44" width="5" height="10" fill="#3a1e0c" rx="1" />
          <polygon points="20,24 2,46 38,46" fill="#0d2b17" />
          <path d="M2 46 Q10 42 20 44 Q30 42 38 46 Z" fill="#ffffff" />
          <polygon points="20,12 7,32 33,32" fill="#14532d" />
          <path d="M7 32 Q14 28 20 30 Q26 28 33 32 Z" fill="#ffffff" />
          <polygon points="20,2 11,18 29,18" fill="#166534" />
          <circle cx="14" cy="40" r="1.5" fill="#ef4444" />
          <circle cx="27" cy="41" r="1.5" fill="#facc15" />
          <polygon points="20,-2 21.2,1.2 24.5,1.2 21.8,3.2 22.8,6.5 20,4.5 17.2,6.5 18.2,3.2 15.5,1.2 18.8,1.2" fill="#fde047" />
        </g>
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

  if (!status.isActive) {
    return null;
  }

  return (
    <section className="relative mx-auto w-full overflow-hidden rounded-2xl border border-red-900/40 bg-gradient-to-br from-[#0a1a12] via-[#102a1c] to-[#1e3a2a] my-3">
      {/* Google font import for "Mountains of Christmas" + Keyframes */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Mountains+of+Christmas:wght@700&display=swap');

        @keyframes xmas-bulb {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        .xmas-bulb {
          animation: xmas-bulb 2.4s ease-in-out infinite;
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
          0% {
            transform: translateY(0) translateX(0) scale(0.6);
            opacity: 0;
          }
          15% {
            opacity: 0.55;
          }
          60% {
            opacity: 0.35;
          }
          100% {
            transform: translateY(-44px) translateX(12px) scale(2.6);
            opacity: 0;
          }
        }
        .xmas-smoke-puff {
          transform-box: fill-box;
          transform-origin: center;
          animation: xmas-smoke 3.5s ease-out infinite;
        }
      `}</style>

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
      <div className="relative z-20 grid gap-6 p-5 pt-12 sm:p-6 sm:pt-14 md:grid-cols-[1fr_auto] md:items-center md:gap-8 md:p-10 lg:p-12">

        {/* Left Column: Heading, countdown, copy, unified collection card button */}
        <div className="max-w-md text-center md:text-left mx-auto md:mx-0">

          {/* Dynamic Holiday / Countdown Pill */}
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-red-400/40 bg-[hsl(var(--accent)/0.25)] px-3 py-1 text-xs font-semibold text-red-100 backdrop-blur-sm shadow-sm">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M12 2 L6 10 L10 10 L4 20 L20 20 L14 10 L18 10 Z" fill="#14532d" />
              <circle cx="9" cy="14" r="1" fill="#ef4444" />
              <circle cx="15" cy="16" r="1" fill="#facc15" />
            </svg>
            <span>{status.pillText}</span>
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
                  href={`/${movie.mediaType}/${movie.id}`}
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
