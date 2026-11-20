import { useEffect, useRef } from "react";

interface Flake {
  x: number;
  y: number;
  r: number;
  vy: number;
  vy0: number;
  drift: number;
  phase: number;
  burst: boolean;
}

interface SnowCanvasProps {
  continuous?: boolean;
  vanish?: boolean;
  amount?: number;
}

export function SnowCanvas({
  continuous = true,
  vanish = false,
  amount = 0.5,
}: SnowCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const flakesRef = useRef<Flake[]>([]);
  const rafRef = useRef<number>(0);

  const continuousRef = useRef(continuous);
  continuousRef.current = continuous;

  const vanishRef = useRef(vanish);
  vanishRef.current = vanish;

  const amountRef = useRef(amount);
  amountRef.current = amount;

  const startLoopRef = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;

    // Retina / HiDPI crisp rendering
    const onResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    onResize();
    window.addEventListener("resize", onResize);

    // Flake factory
    const createFlake = (isBurst: boolean, initialY?: number): Flake => {
      const vy = isBurst
        ? 1.5 + 2.5 * Math.random()
        : 0.4 + 0.8 * Math.random();
      return {
        x: Math.random() * width,
        y: initialY != null ? initialY : -10,
        r: isBurst ? 1.5 + 2.5 * Math.random() : 1 + 2 * Math.random(),
        vy,
        vy0: vy,
        drift: 0.3 + 0.8 * Math.random(),
        phase: Math.random() * Math.PI * 2,
        burst: isBurst,
      };
    };

    // Mouse wind momentum tracker
    let mouseWind = 0;
    let lastMouseX: number | null = null;
    const onMouseMove = (e: MouseEvent) => {
      if (lastMouseX !== null) {
        mouseWind = Math.max(-4, Math.min(4, mouseWind + (e.clientX - lastMouseX) * 0.04));
      }
      lastMouseX = e.clientX;
    };
    window.addEventListener("mousemove", onMouseMove, { passive: true });

    // Main particle tick
    const tick = () => {
      const flakes = flakesRef.current;
      mouseWind *= 0.96;

      const targetCount = continuousRef.current
        ? Math.round((width / 14) * amountRef.current)
        : 0;

      const nonBurstCount = flakes.reduce((acc, f) => acc + (f.burst ? 0 : 1), 0);

      // Smooth gradual spawn
      if (nonBurstCount < targetCount && Math.random() < 0.3 * amountRef.current) {
        flakes.push(createFlake(false));
      }

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";

      for (let i = flakes.length - 1; i >= 0; i--) {
        const f = flakes[i];
        f.phase += 0.01;

        if (vanishRef.current) {
          f.vy = Math.min(1.08 * f.vy, 30);
        } else {
          f.vy += (f.vy0 - f.vy) * 0.1;
        }

        f.y += f.vy;
        f.x += Math.sin(f.phase) * f.drift + mouseWind * f.r * 0.5;

        // Wrap horizontal edges
        if (f.x < -10) f.x = width + 10;
        else if (f.x > width + 10) f.x = -10;

        // Bottom edge recycling
        if (f.y > height + 10) {
          if (!f.burst && continuousRef.current && nonBurstCount <= targetCount) {
            f.y = -10;
            f.x = Math.random() * width;
          } else {
            flakes.splice(i, 1);
            continue;
          }
        }

        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, 2 * Math.PI);
        ctx.fill();
      }

      rafRef.current = flakes.length || continuousRef.current
        ? requestAnimationFrame(tick)
        : 0;
    };

    const startLoop = () => {
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    startLoopRef.current = startLoop;

    // Optional blizzard shake burst
    const onShake = () => {
      for (let i = 0; i < 260; i++) {
        flakesRef.current.push(createFlake(true, -Math.random() * height * 0.6));
      }
      startLoop();
    };

    window.addEventListener("xmas-shake", onShake);
    startLoop();

    return () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("xmas-shake", onShake);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  useEffect(() => {
    if (continuous) {
      startLoopRef.current();
    }
  }, [continuous]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[45] h-full w-full"
      aria-hidden="true"
    />
  );
}
