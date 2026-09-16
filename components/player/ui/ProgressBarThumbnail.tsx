import { useEffect, useRef, useState } from "react";

interface ProgressBarThumbnailProps {
  hoverTime: number | null;
  hoverProgress: number;
  requestFrame: (timeSeconds: number) => Promise<ImageBitmap | null>;
}

const DEBOUNCE_MS = 100;

export function ProgressBarThumbnail({
  hoverTime,
  hoverProgress,
  requestFrame,
}: ProgressBarThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasBitmap, setHasBitmap] = useState(false);
  const activeHoverTimeRef = useRef<number | null>(null);

  useEffect(() => {
    activeHoverTimeRef.current = hoverTime;

    if (hoverTime === null) {
      setHasBitmap(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      // If hover changed before debounce elapsed, ignore
      if (activeHoverTimeRef.current !== hoverTime) return;

      const bitmap = await requestFrame(hoverTime);
      if (activeHoverTimeRef.current !== hoverTime || !bitmap) {
        setHasBitmap(false);
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        setHasBitmap(false);
        return;
      }

      try {
        const ctx = canvas.getContext("bitmaprenderer");
        if (ctx) {
          ctx.transferFromImageBitmap(bitmap);
          setHasBitmap(true);
        } else {
          // Fallback for environments lacking ImageBitmapRenderingContext
          const ctx2d = canvas.getContext("2d");
          if (ctx2d) {
            ctx2d.drawImage(bitmap, 0, 0, 160, 90);
            setHasBitmap(true);
          } else {
            setHasBitmap(false);
          }
        }
      } catch {
        setHasBitmap(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [hoverTime, requestFrame]);

  if (hoverTime === null) {
    return null;
  }

  return (
    <div
      className={`pointer-events-none absolute -top-11 -translate-y-full -translate-x-1/2 overflow-hidden rounded-xl border border-white/20 bg-black/85 p-1 shadow-2xl backdrop-blur-md z-40 transition-opacity duration-150 ${
        hasBitmap ? "opacity-100" : "opacity-0"
      }`}
      style={{
        left: `clamp(85px, ${hoverProgress}%, calc(100% - 85px))`,
      }}
    >
      <canvas
        ref={canvasRef}
        width={160}
        height={90}
        className="block h-[90px] w-[160px] rounded-lg bg-black/80 object-cover shadow-inner"
      />
    </div>
  );
}
