import type { StreamFormat } from "@/components/player/types";
import type { TimeWindow } from "./types";

export type CaptureFailure = "unreadable" | "stalled" | "cancelled";

export class CaptureError extends Error {
  constructor(readonly reason: CaptureFailure) {
    super(reason);
  }
}

export interface CapturedAudio {
  samples: Float32Array;
  sampleRate: number;
  /** Video time of samples[0], in seconds. */
  windowStart: number;
}

export interface HlsSegment {
  start: number;
  end: number;
  duration: number;
  url: string;
}

export interface ParsedManifest {
  initUrl: string | null;
  segments: HlsSegment[];
}

export interface FetchAudioOptions {
  sourceUrl: string;
  format?: StreamFormat;
  window: TimeWindow;
  signal: AbortSignal;
  headers?: Record<string, string>;
  onLog?: (msg: string) => void;
}

/** Maximum number of segments downloaded per dialogue window (~15-18s) */
const MAX_TARGET_SEGMENTS = 3;

/**
 * Resolves a relative or absolute URL against a base URL.
 */
function resolveUrl(relativeOrAbsolute: string, baseUrl: string): string {
  try {
    return new URL(relativeOrAbsolute, baseUrl).toString();
  } catch {
    return relativeOrAbsolute;
  }
}

/**
 * Inspects a master manifest to find the most bandwidth-efficient sub-playlist.
 * Prefers audio-only tracks; falls back to the lowest-bandwidth video stream.
 */
export function findBestSubPlaylist(manifestText: string, baseUrl: string): string | null {
  // 1. Audio-only track if available (smallest payload, pure audio)
  const audioMatch = manifestText.match(/#EXT-X-MEDIA:TYPE=AUDIO[^\n]*URI=["']([^"']+)["']/i);
  if (audioMatch) {
    return resolveUrl(audioMatch[1], baseUrl);
  }

  // 2. Lowest-bandwidth video playlist
  const lines = manifestText.split(/\r?\n/);
  const streams: Array<{ bandwidth: number; url: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("#EXT-X-STREAM-INF:")) {
      const bwMatch = line.match(/BANDWIDTH=(\d+)/i);
      const bandwidth = bwMatch ? Number.parseInt(bwMatch[1], 10) : Number.POSITIVE_INFINITY;

      let nextLine = lines[i + 1]?.trim();
      let offset = 1;
      while (nextLine && nextLine.startsWith("#")) {
        offset++;
        nextLine = lines[i + offset]?.trim();
      }

      if (nextLine) {
        streams.push({ bandwidth, url: resolveUrl(nextLine, baseUrl) });
      }
    }
  }

  if (streams.length > 0) {
    streams.sort((a, b) => a.bandwidth - b.bandwidth);
    return streams[0].url;
  }

  return null;
}

/**
 * Attempts to probe for a lower-resolution variant (480p/360p) of a media playlist
 * if the given URL is high-res (1080p/720p). Audio quality is identical, but bandwidth
 * is reduced by 70-85%.
 */
async function probeLowResPlaylist(url: string, signal: AbortSignal): Promise<string | null> {
  const candidates: string[] = [];
  if (url.includes("-s1080p-")) {
    candidates.push(url.replace("-s1080p-", "-s480p-"), url.replace("-s1080p-", "-s360p-"));
  } else if (url.includes("-s720p-")) {
    candidates.push(url.replace("-s720p-", "-s480p-"), url.replace("-s720p-", "-s360p-"));
  } else if (url.includes("1080p")) {
    candidates.push(url.replace("1080p", "480p"), url.replace("1080p", "360p"));
  } else if (url.includes("720p")) {
    candidates.push(url.replace("720p", "480p"), url.replace("720p", "360p"));
  }

  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate, { method: "HEAD", signal });
      if (res.ok) return candidate;
    } catch {
      // Continue to next or fallback
    }
  }
  return null;
}

/**
 * Parses an HLS media playlist to extract the initialization segment (if fMP4)
 * and all segment timing information.
 */
export function parseHlsManifest(manifestText: string, playlistUrl: string): ParsedManifest {
  const lines = manifestText.split(/\r?\n/);
  let initUrl: string | null = null;
  const segments: HlsSegment[] = [];
  let currentTime = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("#EXT-X-MAP:")) {
      const match = line.match(/URI=["']([^"']+)["']/i);
      if (match) {
        initUrl = resolveUrl(match[1], playlistUrl);
      }
    } else if (line.startsWith("#EXTINF:")) {
      const durationStr = line.slice(8).split(",")[0].trim();
      const duration = Number.parseFloat(durationStr);

      let nextLine = lines[i + 1]?.trim();
      let offset = 1;
      while (nextLine && nextLine.startsWith("#")) {
        offset++;
        nextLine = lines[i + offset]?.trim();
      }

      if (nextLine && !Number.isNaN(duration)) {
        segments.push({
          start: currentTime,
          end: currentTime + duration,
          duration,
          url: resolveUrl(nextLine, playlistUrl),
        });
        currentTime += duration;
      }
    }
  }

  return { initUrl, segments };
}

/**
 * Mixes all channels of an AudioBuffer down to a single mono Float32Array.
 */
function downmixToMono(buffer: AudioBuffer): Float32Array {
  const channelCount = buffer.numberOfChannels;
  const length = buffer.length;
  const monoSamples = new Float32Array(length);

  for (let c = 0; c < channelCount; c++) {
    const channelData = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) {
      monoSamples[i] += channelData[i] / channelCount;
    }
  }

  return monoSamples;
}

/**
 * Fetches targeted audio chunks directly, bypasses video player playback,
 * and decodes PCM samples instantaneously with the browser's Web Audio engine.
 */
export async function fetchAndDecodeSegmentAudio(options: FetchAudioOptions): Promise<CapturedAudio> {
  const { sourceUrl, format, window: win, signal, onLog } = options;

  if (signal.aborted) {
    throw new CaptureError("cancelled");
  }

  // Handle direct MP4 / non-HLS audio files
  if (format === "mp4" || format === "webm") {
    onLog?.(`Fetching direct ${format.toUpperCase()} audio stream...`);
    const res = await fetch(sourceUrl, { signal });
    if (!res.ok) throw new CaptureError("unreadable");
    const arrayBuf = await res.arrayBuffer();

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioContext = new AudioContextClass();
    try {
      const decoded = await audioContext.decodeAudioData(arrayBuf);
      return {
        samples: downmixToMono(decoded),
        sampleRate: decoded.sampleRate,
        windowStart: 0,
      };
    } finally {
      void audioContext.close();
    }
  }

  // 1. Fetch initial HLS playlist
  onLog?.("Fetching stream playlist...");
  let currentPlaylistUrl = sourceUrl;
  let manifestRes = await fetch(currentPlaylistUrl, { signal });
  if (!manifestRes.ok) throw new CaptureError("unreadable");
  let manifestText = await manifestRes.text();

  // 2. If master playlist, resolve to lowest-bandwidth sub-playlist or audio track
  const subPlaylistUrl = findBestSubPlaylist(manifestText, currentPlaylistUrl);
  if (subPlaylistUrl) {
    onLog?.("Master playlist detected. Selected optimized media stream for audio extraction.");
    currentPlaylistUrl = subPlaylistUrl;
    manifestRes = await fetch(currentPlaylistUrl, { signal });
    if (!manifestRes.ok) throw new CaptureError("unreadable");
    manifestText = await manifestRes.text();
  } else {
    // If given a direct high-res media playlist, probe for a lower-res variant to save bandwidth
    const lowResUrl = await probeLowResPlaylist(currentPlaylistUrl, signal);
    if (lowResUrl) {
      try {
        const probeRes = await fetch(lowResUrl, { signal });
        if (probeRes.ok) {
          onLog?.("Selected lightweight stream variant for fast audio extraction.");
          currentPlaylistUrl = lowResUrl;
          manifestText = await probeRes.text();
        }
      } catch {
        // Fallback to current
      }
    }
  }

  // 3. Parse media playlist segments
  const { initUrl, segments } = parseHlsManifest(manifestText, currentPlaylistUrl);
  if (segments.length === 0) {
    onLog?.("No valid audio/video segments found in media playlist.");
    throw new CaptureError("unreadable");
  }

  // 4. Find segments covering target window [win.start, win.end]
  const overlapping = segments.filter((s) => s.end > win.start && s.start < win.end);
  let targetSegments = overlapping.length > 0 ? overlapping : [segments[0]];

  // Cap target segments to prevent excessive downloads
  if (targetSegments.length > MAX_TARGET_SEGMENTS) {
    targetSegments = targetSegments.slice(0, MAX_TARGET_SEGMENTS);
  }

  const rangeSpan = `${targetSegments[0].start.toFixed(1)}s - ${targetSegments[targetSegments.length - 1].end.toFixed(1)}s`;
  onLog?.(`Targeted ${targetSegments.length} segment(s) [${rangeSpan}]. Fetching in parallel...`);

  // 5. Download init header (if fMP4) and segment payloads in parallel
  const initPromise = initUrl
    ? fetch(initUrl, { signal }).then(async (r) => (r.ok ? new Uint8Array(await r.arrayBuffer()) : null))
    : Promise.resolve(null);

  const segmentPromises = targetSegments.map(async (seg) => {
    const res = await fetch(seg.url, { signal });
    if (!res.ok) throw new CaptureError("stalled");
    return new Uint8Array(await res.arrayBuffer());
  });

  const [initBytes, segmentBuffers] = await Promise.all([initPromise, Promise.all(segmentPromises)]);

  // 6. Concatenate into a single contiguous ISO-BMFF container
  const totalLength = (initBytes ? initBytes.byteLength : 0) + segmentBuffers.reduce((sum, b) => sum + b.byteLength, 0);
  const combined = new Uint8Array(totalLength);
  let writeOffset = 0;

  if (initBytes) {
    combined.set(initBytes, writeOffset);
    writeOffset += initBytes.byteLength;
  }
  for (const buf of segmentBuffers) {
    combined.set(buf, writeOffset);
    writeOffset += buf.byteLength;
  }

  const kbSize = (totalLength / 1024).toFixed(0);
  onLog?.(`Downloaded ${kbSize} KB. Decoding PCM audio directly via Web Audio...`);

  // 7. Instant browser Web Audio decode
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioContext = new AudioContextClass();

  try {
    let decodedBuffer: AudioBuffer;
    try {
      // Decode all combined target segments
      decodedBuffer = await audioContext.decodeAudioData(combined.buffer.slice(0));
    } catch {
      // Fallback: decode first segment with init
      if (segmentBuffers.length > 1) {
        onLog?.("Multi-segment decode fallback: decoding primary segment...");
        const fallbackLength = (initBytes ? initBytes.byteLength : 0) + segmentBuffers[0].byteLength;
        const fallbackBytes = new Uint8Array(fallbackLength);
        if (initBytes) fallbackBytes.set(initBytes, 0);
        fallbackBytes.set(segmentBuffers[0], initBytes ? initBytes.byteLength : 0);
        decodedBuffer = await audioContext.decodeAudioData(fallbackBytes.buffer.slice(0));
      } else {
        throw new CaptureError("unreadable");
      }
    }

    const durationSec = decodedBuffer.duration.toFixed(2);
    onLog?.(`Decoded ${durationSec}s PCM audio (${decodedBuffer.sampleRate}Hz, ${decodedBuffer.numberOfChannels}ch).`);

    return {
      samples: downmixToMono(decodedBuffer),
      sampleRate: decodedBuffer.sampleRate,
      windowStart: targetSegments[0].start,
    };
  } catch (error) {
    if (error instanceof CaptureError) throw error;
    onLog?.(`Audio decode failure: ${error instanceof Error ? error.message : String(error)}`);
    throw new CaptureError("unreadable");
  } finally {
    void audioContext.close();
  }
}
