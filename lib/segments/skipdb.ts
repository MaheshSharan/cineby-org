import type { MediaSegment, SegmentFetchParams, SegmentType } from "./types";

interface SkipDbSegmentRaw {
  start_ms: number;
  end_ms?: number;
  match?: string;
  adjusted?: boolean;
  offset_ms?: number;
  confidence?: number;
}

interface SkipDbApiResponse {
  imdb_id: string;
  season?: number;
  episode?: number;
  segments?: {
    intro?: SkipDbSegmentRaw | null;
    recap?: SkipDbSegmentRaw | null;
    outro?: SkipDbSegmentRaw | null;
    preview?: SkipDbSegmentRaw | null;
  };
  intro_length_estimate_ms?: number | null;
}

export function buildSkipDbUrl(params: SegmentFetchParams): URL | null {
  const baseUrl = process.env.SKIPDB_API_URL?.replace(/\/+$/, "");
  if (!baseUrl) {
    return null;
  }
  const url = new URL(`${baseUrl}/api/segments`);

  url.searchParams.set("imdb_id", params.imdbId);
  url.searchParams.set("adjust", "conservative");

  if (typeof params.season === "number" && Number.isInteger(params.season) && params.season > 0) {
    url.searchParams.set("season", String(params.season));
  }
  if (typeof params.episode === "number" && Number.isInteger(params.episode) && params.episode > 0) {
    url.searchParams.set("episode", String(params.episode));
  }
  if (typeof params.duration === "number" && Number.isFinite(params.duration) && params.duration > 0) {
    url.searchParams.set("duration", String(Math.round(params.duration)));
  }

  return url;
}

type SkipDbSupportedSegmentType = "intro" | "recap" | "outro" | "preview";

export function parseSkipDbSegments(data: unknown, durationSec?: number): MediaSegment[] {
  if (!data || typeof data !== "object") return [];

  const payload = data as SkipDbApiResponse;
  const rawSegments = payload.segments;
  if (!rawSegments) return [];

  const parsedSegments: MediaSegment[] = [];
  const types: readonly SkipDbSupportedSegmentType[] = ["intro", "recap", "outro", "preview"];

  for (const type of types) {
    const seg = rawSegments[type];
    if (!seg || typeof seg.start_ms !== "number") continue;

    const start = seg.start_ms / 1000;
    let end = typeof seg.end_ms === "number" ? seg.end_ms / 1000 : 0;

    // Outro can omit end_ms when it continues through to the stream duration
    if (type === "outro" && end <= start && durationSec && durationSec > start) {
      end = durationSec;
    }

    if (end > start) {
      parsedSegments.push({
        type,
        start,
        end,
      });
    }
  }

  return parsedSegments.sort((a, b) => a.start - b.start);
}

export async function fetchSkipDbSegments(
  params: SegmentFetchParams,
  timeoutMs = 4000
): Promise<MediaSegment[]> {
  try {
    const url = buildSkipDbUrl(params);
    if (!url) {
      return [];
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": "Cineby/1.0",
    };

    const apiKey = process.env.SKIPDB_API_KEY?.trim();
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const apiRes = await fetch(url.toString(), {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!apiRes.ok) {
      return [];
    }

    const data: unknown = await apiRes.json().catch(() => null);
    return parseSkipDbSegments(data, params.duration);
  } catch {
    return [];
  }
}
