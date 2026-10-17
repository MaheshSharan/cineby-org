import { useEffect, useRef } from "react";

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

const RIBBONS: RibbonConfig[] = [
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
    colorStart: "rgba(225, 29, 72, 0.75)", // rose-600
    colorMid: "rgba(168, 85, 247, 0.60)",   // purple-500
    colorEnd: "rgba(59, 130, 246, 0.30)",   // blue-500
    edgeColor: "rgba(255, 255, 255, 0.95)",
    lineWidth: 2.2,
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
    colorStart: "rgba(244, 63, 94, 0.70)", // rose-500
    colorMid: "rgba(139, 92, 246, 0.55)",  // violet-500
    colorEnd: "rgba(236, 72, 153, 0.25)",  // pink-500
    edgeColor: "rgba(254, 205, 211, 0.92)",
    lineWidth: 1.9,
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
    colorStart: "rgba(147, 51, 234, 0.65)", // purple-600
    colorMid: "rgba(225, 29, 72, 0.50)",   // rose-600
    colorEnd: "rgba(99, 102, 241, 0.20)",  // indigo-500
    edgeColor: "rgba(243, 232, 255, 0.90)",
    lineWidth: 1.8,
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
    colorStart: "rgba(236, 72, 153, 0.65)", // pink-500
    colorMid: "rgba(244, 63, 94, 0.45)",   // rose-500
    colorEnd: "rgba(124, 58, 237, 0.20)",  // violet-600
    edgeColor: "rgba(255, 255, 255, 0.95)",
    lineWidth: 2.0,
  },
];

interface SineRibbonsTextProps {
  text: string;
  className?: string;
}

export function SineRibbonsText({ text, className = "" }: SineRibbonsTextProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

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

    const computeWaveY = (x: number, r: RibbonConfig, t: number, h: number) => {
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

      // Deep dark backdrop inside the letters
      const bgGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        10,
        width * 0.5,
        height * 0.5,
        Math.max(width, height)
      );
      bgGrad.addColorStop(0, "#22081e");
      bgGrad.addColorStop(0.5, "#0d0414");
      bgGrad.addColorStop(1, "#020104");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.globalCompositeOperation = "screen";

      const step = 4;

      for (let rIdx = 0; rIdx < RIBBONS.length; rIdx++) {
        const ribbon = RIBBONS[rIdx];
        const upperPoints: Array<{ x: number; y: number }> = [];
        const lowerPoints: Array<{ x: number; y: number }> = [];

        for (let x = 0; x <= width + step; x += step) {
          const y = computeWaveY(x, ribbon, time, height);
          const halfThick = (ribbon.thickness / 2) * (0.7 + Math.sin(x * 0.004 + time * 0.01) * 0.3);
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
        ribbonGrad.addColorStop(0, ribbon.colorStart);
        ribbonGrad.addColorStop(0.5, ribbon.colorMid);
        ribbonGrad.addColorStop(1, ribbon.colorEnd);
        ctx.fillStyle = ribbonGrad;
        ctx.fill();

        // Glowing crest edge line
        ctx.beginPath();
        ctx.moveTo(upperPoints[0].x, upperPoints[0].y);
        for (let i = 1; i < upperPoints.length; i++) {
          ctx.lineTo(upperPoints[i].x, upperPoints[i].y);
        }
        ctx.strokeStyle = ribbon.edgeColor;
        ctx.lineWidth = ribbon.lineWidth;
        ctx.shadowColor = ribbon.edgeColor;
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
