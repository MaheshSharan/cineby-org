import Hls from "hls.js";

import { createCachingLoader } from "@/lib/player/media/cachingHlsLoader";
import type { SegmentByteCache } from "@/lib/player/media/segmentByteCache";
import type { QualityLabel } from "../types";

export interface HlsController {
  destroy: () => void;
  setQuality: (quality: QualityLabel | null) => void;
  getLevels: () => { height: number; bitrate: number }[];
}

function getHlsQualityCap(quality: QualityLabel | null): number {
  switch (quality) {
    case "2160p":
      return 2160;
    case "1080p":
      return 1080;
    case "720p":
      return 720;
    case "480p":
      return 480;
    default:
      return 0;
  }
}

export interface HlsOptions {
  onLevelSwitched?: (levelHeight: number) => void;
  onError?: (error: unknown) => void;
  cache?: SegmentByteCache;
  mediaKey?: string;
}

export function attachHls(
  video: HTMLVideoElement,
  src: string,
  options?: HlsOptions
): HlsController {
  // If src is a Blob URL created for a rewritten M3U8, revoke it on destroy
  // to release the memory held by the Blob.
  const blobUrlToRevoke = src.startsWith("blob:") ? src : null;

  const hls = new Hls({
    enableWorker: true,
    backBufferLength: 30,
    maxBufferLength: 20,
    maxMaxBufferLength: 40,
    startLevel: -1,
    capLevelToPlayerSize: true,
    ...(options?.cache && options?.mediaKey
      ? { loader: createCachingLoader(options.cache, options.mediaKey) }
      : {}),
  });

  hls.loadSource(src);
  hls.attachMedia(video);

  const notifyLevel = (levelIndex: number) => {
    const level = hls.levels[levelIndex];
    if (level?.height) {
      options?.onLevelSwitched?.(level.height);
    }
  };

  hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
    notifyLevel(data.level);
  });

  hls.on(Hls.Events.MANIFEST_PARSED, () => {
    if (hls.currentLevel >= 0) {
      notifyLevel(hls.currentLevel);
    }
  });

  hls.on(Hls.Events.ERROR, (_event, data) => {
    if (data.fatal) {
      options?.onError?.(data);
    }
  });

  return {
    destroy: () => {
      hls.destroy();
      if (blobUrlToRevoke) {
        URL.revokeObjectURL(blobUrlToRevoke);
      }
    },
    setQuality: (quality) => {
      const cap = getHlsQualityCap(quality);

      if (cap === 0) {
        hls.currentLevel = -1;
        return;
      }

      const target = hls.levels.findLastIndex((level) => level.height <= cap);
      hls.currentLevel = target >= 0 ? target : hls.levels.length - 1;
    },
    getLevels: () =>
      hls.levels.map((level) => ({
        height: level.height,
        bitrate: level.bitrate,
      })),
  };
}

export function supportsHls(video: HTMLVideoElement): boolean {
  return Hls.isSupported() || video.canPlayType("application/vnd.apple.mpegurl") === "probably";
}
