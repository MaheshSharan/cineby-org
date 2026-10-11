import type { MediaSegment } from "@/components/player/types";

export interface SegmentRequestParams {
  imdbId?: string | null;
  tmdbId?: number | string | null;
  mediaType: "movie" | "tv";
  season?: number;
  episode?: number;
  duration?: number;
  signal?: AbortSignal;
}

interface SegmentsApiResponse {
  segments?: MediaSegment[];
  error?: string;
}

/**
 * Client-facing API helper to fetch media segments (intro, outro, recap).
 * Centralizes endpoint URL, parameter serialization, error handling, and type safety.
 */
export async function getSegments(params: SegmentRequestParams): Promise<MediaSegment[]> {
  const query = new URLSearchParams();
  if (params.imdbId) query.set("imdb_id", params.imdbId);
  if (params.tmdbId) query.set("tmdb_id", String(params.tmdbId));
  query.set("media_type", params.mediaType);
  if (params.season !== undefined) query.set("season", String(params.season));
  if (params.episode !== undefined) query.set("episode", String(params.episode));
  if (params.duration !== undefined) query.set("duration", String(params.duration));

  try {
    const res = await fetch(`/api/segments?${query.toString()}`, {
      signal: params.signal,
    });

    if (!res.ok) {
      return [];
    }

    const data = (await res.json()) as SegmentsApiResponse;
    return Array.isArray(data.segments) ? data.segments : [];
  } catch {
    // Intentional fallback: segments (intro/outro skip) are non-critical enhancements.
    // Network failures or aborts safely return empty segment list without interrupting playback.
    return [];
  }
}
