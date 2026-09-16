export interface PlayerCapabilities {
  hasWebCodecs: boolean;
  hasRVFC: boolean;
  hasFastSeek: boolean;
  hasOffscreenCanvas: boolean;
}

let cachedCapabilities: PlayerCapabilities | null = null;

export function detectPlayerCapabilities(): PlayerCapabilities {
  if (cachedCapabilities) {
    return cachedCapabilities;
  }

  if (typeof window === "undefined") {
    return {
      hasWebCodecs: false,
      hasRVFC: false,
      hasFastSeek: false,
      hasOffscreenCanvas: false,
    };
  }

  const hasWebCodecs =
    typeof (window as unknown as { VideoDecoder?: unknown }).VideoDecoder ===
    "function";
  const hasRVFC = "requestVideoFrameCallback" in HTMLVideoElement.prototype;
  const hasFastSeek = "fastSeek" in HTMLVideoElement.prototype;
  const hasOffscreenCanvas = typeof OffscreenCanvas !== "undefined";

  cachedCapabilities = {
    hasWebCodecs,
    hasRVFC,
    hasFastSeek,
    hasOffscreenCanvas,
  };

  return cachedCapabilities;
}
