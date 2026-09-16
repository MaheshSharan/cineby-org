import Hls from "hls.js";

import { createCachingLoader } from "@/lib/player/media/cachingHlsLoader";
import type { SegmentByteCache } from "@/lib/player/media/segmentByteCache";

export interface ThumbnailHlsController {
  destroy: () => void;
}

export function attachThumbnailHls(
  video: HTMLVideoElement,
  src: string,
  cache: SegmentByteCache,
  mediaKey: string
): ThumbnailHlsController {
  const blobUrlToRevoke = src.startsWith("blob:") ? src : null;

  video.muted = true;
  video.volume = 0;

  const hls = new Hls({
    enableWorker: true,
    loader: createCachingLoader(cache, mediaKey),
    backBufferLength: 0,
    maxBufferLength: 2,
    maxMaxBufferLength: 5,
    capLevelToPlayerSize: true,
  });

  // Strip audio and subtitle demuxing/buffering completely for thumbnail decoder
  const disableNonVideoTracks = () => {
    try {
      hls.audioTrack = -1;
      hls.subtitleTrack = -1;
    } catch {
      // ignore
    }
  };

  hls.on(Hls.Events.MANIFEST_PARSED, disableNonVideoTracks);
  hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, disableNonVideoTracks);
  hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, disableNonVideoTracks);

  hls.loadSource(src);
  hls.attachMedia(video);

  return {
    destroy: () => {
      hls.off(Hls.Events.MANIFEST_PARSED, disableNonVideoTracks);
      hls.off(Hls.Events.AUDIO_TRACKS_UPDATED, disableNonVideoTracks);
      hls.off(Hls.Events.SUBTITLE_TRACKS_UPDATED, disableNonVideoTracks);
      hls.destroy();
      if (blobUrlToRevoke) {
        URL.revokeObjectURL(blobUrlToRevoke);
      }
    },
  };
}
