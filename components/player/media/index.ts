import type { StreamFormat } from "../types";
import { attachDash, type DashController } from "./dash";
import { attachHls, type HlsController } from "./hls";
import { attachNative, type NativeController } from "./native";

export type MediaEngine = HlsController | DashController | NativeController;

export interface MediaEngineOptions {
  onLevelSwitched?: (levelHeight: number) => void;
  onError?: (error: unknown) => void;
}

export function createMediaEngine(
  video: HTMLVideoElement,
  src: string,
  format: StreamFormat,
  options?: MediaEngineOptions
): MediaEngine {
  switch (format) {
    case "hls":
      return attachHls(video, src, options);
    case "dash":
      return attachDash(video, src);
    case "mp4":
    case "webm":
    case "mkv":
    default:
      return attachNative(video, src);
  }
}
