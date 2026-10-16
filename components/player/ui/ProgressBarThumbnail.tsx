import { useEffect, useRef, useState } from "react";
import type { ProviderThumbnailPreview } from "../hooks/useProviderThumbnails";

interface ProgressBarThumbnailProps {
  hoverTime: number | null;
  hoverProgress: number;
  providerThumbnail?: ProviderThumbnailPreview | null;
  requestFrame?: (timeSeconds: number) => Promise<ImageBitmap | null>;
}

const DEBOUNCE_MS = 100;
const TIME_BUCKET_SECONDS = 5;

export function ProgressBarThumbnail({
  hoverTime,
  providerThumbnail,
  requestFrame,
}: ProgressBarThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasBitmap, setHasBitmap] = useState(false);
  const activeBucketRef = useRef<number | null>(null);

  const currentBucket =
    hoverTime !== null
      ? Math.max(0, Math.floor(hoverTime / TIME_BUCKET_SECONDS) * TIME_BUCKET_SECONDS)
      : null;

  useEffect(() => {
    // If provider thumbnails are supplied, client frame decoder is bypassed
    if (providerThumbnail || !requestFrame) {
      return;
    }

    activeBucketRef.current = currentBucket;

    if (currentBucket === null) {
      setHasBitmap(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      if (activeBucketRef.current !== currentBucket) return;

      const bitmap = await requestFrame(currentBucket);
      if (activeBucketRef.current !== currentBucket) {
        return;
      }

      if (!bitmap) {
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      try {
        const ctx = canvas.getContext("bitmaprenderer");
        if (ctx) {
          ctx.transferFromImageBitmap(bitmap);
          setHasBitmap(true);
        } else {
          const ctx2d = canvas.getContext("2d");
          if (ctx2d) {
            ctx2d.drawImage(bitmap, 0, 0, 160, 90);
            setHasBitmap(true);
          }
        }
      } catch {
        // Keep existing frame if transfer fails
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [currentBucket, providerThumbnail, requestFrame]);

  if (hoverTime === null) {
    return null;
  }

  // Provider thumbnail rendering (sprite background or standalone image)
  if (providerThumbnail) {
    const isSprite = providerThumbnail.w > 0 && providerThumbnail.h > 0;
    const style: React.CSSProperties = isSprite
      ? {
          backgroundImage: `url(${providerThumbnail.url})`,
          backgroundPosition: `-${providerThumbnail.x}px -${providerThumbnail.y}px`,
          backgroundRepeat: "no-repeat",
          width: `${providerThumbnail.w}px`,
          height: `${providerThumbnail.h}px`,
        }
      : {
          backgroundImage: `url(${providerThumbnail.url})`,
          backgroundPosition: "center",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          width: "160px",
          height: "90px",
        };

    return (
      <div className="overflow-hidden rounded-xl border border-white/20 bg-black/85 p-1 shadow-2xl backdrop-blur-md mb-2 transition-opacity duration-150 opacity-100">
        <div
          style={style}
          className="block rounded-lg bg-black/80 shadow-inner"
        />
      </div>
    );
  }

  // Client frame decoding fallback
  if (!requestFrame) {
    return null;
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border border-white/20 bg-black/85 p-1 shadow-2xl backdrop-blur-md mb-2 transition-opacity duration-150 ${
        hasBitmap ? "opacity-100" : "opacity-0"
      }`}
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
