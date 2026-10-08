import { useCallback, useEffect, useRef } from "react";

import { attachThumbnailHls, type ThumbnailHlsController } from "../media/attachThumbnailHls";
import { detectPlayerCapabilities } from "@/lib/player/media/capabilities";
import type { SegmentByteCache } from "@/lib/player/media/segmentByteCache";

interface UseThumbnailPreviewOptions {
  src: string | null;
  mediaKey: string;
  cache: SegmentByteCache | null;
  enabled: boolean;
}

export interface UseThumbnailPreviewResult {
  requestFrame: (timeSeconds: number) => Promise<ImageBitmap | null>;
}

const MAX_DECODED_FRAMES = 24;
const TIME_BUCKET_SECONDS = 5;
const SEEK_TIMEOUT_MS = 2000;
const THUMB_WIDTH = 160;
const THUMB_HEIGHT = 90;

export function useThumbnailPreview({
  src,
  mediaKey,
  cache,
  enabled,
}: UseThumbnailPreviewOptions): UseThumbnailPreviewResult {
  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null);
  const thumbnailHlsRef = useRef<ThumbnailHlsController | null>(null);
  const frameCacheRef = useRef<Map<number, ImageBitmap>>(new Map());
  const inFlightPromiseRef = useRef<{ bucketTime: number; promise: Promise<ImageBitmap | null> } | null>(null);
  const inFlightAbortRef = useRef<AbortController | null>(null);
  const inFlightBucketRef = useRef<number | null>(null);
  const lastBucketRef = useRef<number | null>(null);
  const predictiveTimerRef = useRef<number | null>(null);

  const cleanupDecoder = useCallback(() => {
    if (predictiveTimerRef.current !== null) {
      window.clearTimeout(predictiveTimerRef.current);
      predictiveTimerRef.current = null;
    }

    if (inFlightAbortRef.current) {
      inFlightAbortRef.current.abort();
      inFlightAbortRef.current = null;
    }
    inFlightPromiseRef.current = null;
    inFlightBucketRef.current = null;

    if (thumbnailHlsRef.current) {
      thumbnailHlsRef.current.destroy();
      thumbnailHlsRef.current = null;
    }

    if (hiddenVideoRef.current) {
      hiddenVideoRef.current.pause();
      hiddenVideoRef.current.removeAttribute("src");
      hiddenVideoRef.current.load();
      hiddenVideoRef.current.remove();
      hiddenVideoRef.current = null;
    }

    for (const bitmap of frameCacheRef.current.values()) {
      try {
        bitmap.close();
      } catch {
        // ignore
      }
    }
    frameCacheRef.current.clear();
    lastBucketRef.current = null;
  }, []);

  useEffect(() => {
    cleanupDecoder();
    return () => {
      cleanupDecoder();
    };
  }, [mediaKey, cleanupDecoder]);

  const initDecoderIfNeeded = useCallback((): HTMLVideoElement | null => {
    if (!enabled || !src || !cache || typeof window === "undefined") {
      return null;
    }

    if (hiddenVideoRef.current) {
      return hiddenVideoRef.current;
    }

    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.style.position = "fixed";
    video.style.left = "-9999px";
    video.style.top = "-9999px";
    video.style.width = `${THUMB_WIDTH}px`;
    video.style.height = `${THUMB_HEIGHT}px`;
    video.style.opacity = "0";
    video.style.pointerEvents = "none";
    document.body.appendChild(video);

    hiddenVideoRef.current = video;
    thumbnailHlsRef.current = attachThumbnailHls(video, src, cache, mediaKey);

    return video;
  }, [cache, enabled, mediaKey, src]);

  const decodeFrameAtBucket = useCallback(
    async (bucketTime: number, isPrefetch = false): Promise<ImageBitmap | null> => {
      if (!enabled || !src || !cache) {
        return null;
      }

      // Check cache first
      const cached = frameCacheRef.current.get(bucketTime);
      if (cached) {
        frameCacheRef.current.delete(bucketTime);
        frameCacheRef.current.set(bucketTime, cached);
        return cached;
      }

      // If already decoding this exact bucket, return active promise
      if (inFlightPromiseRef.current && inFlightPromiseRef.current.bucketTime === bucketTime) {
        return inFlightPromiseRef.current.promise;
      }

      const video = initDecoderIfNeeded();
      if (!video) {
        return null;
      }

      // Cancel previous in-flight user request or prefetch only if target bucket changed
      if (inFlightAbortRef.current && inFlightBucketRef.current !== bucketTime) {
        inFlightAbortRef.current.abort();
      }

      const abortController = new AbortController();
      inFlightAbortRef.current = abortController;
      inFlightBucketRef.current = bucketTime;

      const decodePromise = (async (): Promise<ImageBitmap | null> => {
        try {
          const caps = detectPlayerCapabilities();

          await new Promise<void>((resolve, reject) => {
            let timer: number | null = null;
            let rvfcHandle: number | null = null;

            const cleanup = () => {
              if (timer !== null) window.clearTimeout(timer);
              video.removeEventListener("seeked", onFrameReady);
              video.removeEventListener("error", onError);
              abortController.signal.removeEventListener("abort", onAbort);
              if (rvfcHandle !== null && "cancelVideoFrameCallback" in video) {
                (
                  video as HTMLVideoElement & {
                    cancelVideoFrameCallback: (id: number) => void;
                  }
                ).cancelVideoFrameCallback(rvfcHandle);
              }
            };

            const onFrameReady = () => {
              cleanup();
              resolve();
            };

            const onError = () => {
              cleanup();
              reject(new Error("Thumbnail decode error"));
            };

            const onAbort = () => {
              cleanup();
              reject(new Error("Aborted"));
            };

            abortController.signal.addEventListener("abort", onAbort, { once: true });

            timer = window.setTimeout(() => {
              cleanup();
              reject(new Error("Seek timeout"));
            }, SEEK_TIMEOUT_MS);

            // Direct GPU presentation hook (requestVideoFrameCallback) fires significantly faster than seeked
            if (caps.hasRVFC && "requestVideoFrameCallback" in video) {
              rvfcHandle = (
                video as HTMLVideoElement & {
                  requestVideoFrameCallback: (cb: () => void) => number;
                }
              ).requestVideoFrameCallback(onFrameReady);
            }

            video.addEventListener("seeked", onFrameReady, { once: true });
            video.addEventListener("error", onError, { once: true });

            try {
              // Standardize seeking to currentTime to ensure MediaSource buffer synchronization
              video.currentTime = bucketTime;
            } catch (err) {
              cleanup();
              reject(err);
            }
          });

          if (abortController.signal.aborted) {
            return null;
          }

          // Draw frame to OffscreenCanvas / Canvas -> ImageBitmap
          let bitmap: ImageBitmap;
          if (typeof OffscreenCanvas !== "undefined") {
            const offscreen = new OffscreenCanvas(THUMB_WIDTH, THUMB_HEIGHT);
            const ctx = offscreen.getContext("2d");
            if (!ctx) return null;
            ctx.drawImage(video, 0, 0, THUMB_WIDTH, THUMB_HEIGHT);
            bitmap = offscreen.transferToImageBitmap();
          } else {
            const canvas = document.createElement("canvas");
            canvas.width = THUMB_WIDTH;
            canvas.height = THUMB_HEIGHT;
            const ctx = canvas.getContext("2d");
            if (!ctx) return null;
            ctx.drawImage(video, 0, 0, THUMB_WIDTH, THUMB_HEIGHT);
            bitmap = await createImageBitmap(canvas);
          }

          // Cache eviction policy
          if (frameCacheRef.current.size >= MAX_DECODED_FRAMES) {
            const oldest = frameCacheRef.current.entries().next();
            if (!oldest.done) {
              const [oldKey, oldBitmap] = oldest.value;
              frameCacheRef.current.delete(oldKey);
              try {
                oldBitmap.close();
              } catch {
                // ignore
              }
            }
          }

          frameCacheRef.current.set(bucketTime, bitmap);

          // Schedule predictive pre-caching for next adjacent bucket while idle (0ms hit)
          if (!isPrefetch) {
            const prev = lastBucketRef.current;
            lastBucketRef.current = bucketTime;
            const direction = prev !== null && prev <= bucketTime ? 5 : -5;
            const predictedBucket = Math.max(0, bucketTime + direction);

            if (!frameCacheRef.current.has(predictedBucket)) {
              if (predictiveTimerRef.current !== null) {
                window.clearTimeout(predictiveTimerRef.current);
              }
              predictiveTimerRef.current = window.setTimeout(() => {
                if (!inFlightAbortRef.current) {
                  void decodeFrameAtBucket(predictedBucket, true);
                }
              }, 45);
            }
          }

          return bitmap;
        } catch {
          return null;
        } finally {
          if (inFlightAbortRef.current === abortController) {
            inFlightAbortRef.current = null;
            inFlightBucketRef.current = null;
          }
          if (inFlightPromiseRef.current?.bucketTime === bucketTime) {
            inFlightPromiseRef.current = null;
          }
        }
      })();

      inFlightPromiseRef.current = { bucketTime, promise: decodePromise };
      return decodePromise;
    },
    [cache, enabled, initDecoderIfNeeded, src]
  );

  const requestFrame = useCallback(
    (timeSeconds: number): Promise<ImageBitmap | null> => {
      const bucketTime = Math.max(
        0,
        Math.floor(timeSeconds / TIME_BUCKET_SECONDS) * TIME_BUCKET_SECONDS
      );
      return decodeFrameAtBucket(bucketTime, false);
    },
    [decodeFrameAtBucket]
  );

  return { requestFrame };
}
