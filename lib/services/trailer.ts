/**
 * Centralized integration layer for direct MP4 trailers.
 * Can be globally or individually toggled via TRAILER_CONFIG.
 */

export interface TrailerStream {
  quality: string;
  url: string;
  mimeType: string;
}

export interface TrailerResponse {
  id: string;
  trailer?: {
    id: string;
    name: string;
    runtime: number;
    thumbnail: string;
    streams: TrailerStream[];
  };
}

export const TRAILER_CONFIG = {
  /** Master switch for direct MP4 trailers */
  enabled: true,
  /** Endpoint for oldest trailer API */
  get trailerEndpoint(): string {
    const endpoint = process.env.TRAILER_API_URL?.trim();
    if (!endpoint) {
      throw new Error("Missing required environment variable: TRAILER_API_URL");
    }
    return endpoint;
  },
} as const;

/**
 * Fetch direct MP4 trailer streams for a media item using its IMDb ID.
 * Returns the highest quality MP4 stream URL available (e.g. 1080p -> 720p -> 480p).
 */
export async function getTrailerUrl(imdbId?: string | null): Promise<string | null> {
  if (!TRAILER_CONFIG.enabled || !imdbId) {
    return null;
  }

  try {
    const res = await fetch(`${TRAILER_CONFIG.trailerEndpoint}?id=${encodeURIComponent(imdbId)}`);
    if (!res.ok) return null;

    const data = (await res.json()) as TrailerResponse;
    const streams = data?.trailer?.streams ?? [];

    if (streams.length === 0) return null;

    // Filter to MP4 streams
    const mp4Streams = streams.filter(
      (s) => s.mimeType.toUpperCase() === "MP4" || s.url.includes(".mp4")
    );

    const candidates = mp4Streams.length > 0 ? mp4Streams : streams;

    // Preference: 1080p > 720p > 480p > SD > first available
    const preferredOrder = ["1080p", "720p", "480p", "SD"];
    for (const q of preferredOrder) {
      const match = candidates.find((s) => s.quality.toLowerCase() === q.toLowerCase());
      if (match?.url) return match.url;
    }

    return candidates[0]?.url ?? null;
  } catch {
    return null;
  }
}
