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
} as const;

const IMDB_ID_REGEX = /^tt\d+$/i;

/**
 * Fetch direct MP4 trailer streams for a media item using its IMDb ID.
 * Routed through Cineby's internal cached proxy endpoint (/api/trailer/[id])
 * to prevent third-party domain leaks, CORS/WAF rejections, and direct client IP leakage.
 */
export async function getTrailerUrl(imdbId?: string | null): Promise<string | null> {
  if (!TRAILER_CONFIG.enabled || !imdbId || !IMDB_ID_REGEX.test(imdbId.trim())) {
    return null;
  }

  try {
    const res = await fetch(`/api/trailer/${encodeURIComponent(imdbId.trim())}`);
    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as { url?: string | null };
    return data?.url ?? null;
  } catch {
    return null;
  }
}
