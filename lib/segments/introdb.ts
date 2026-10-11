import type { MediaSegment, SegmentFetchParams, SegmentType } from "./types";
import { getEnvVar } from "@/lib/env";

export function parseTimeValue(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (trimmed.includes(":")) {
      const parts = trimmed.split(":").map((p) => Number.parseFloat(p));
      if (parts.some((p) => Number.isNaN(p))) return null;

      if (parts.length === 3) {
        // [HH, MM, SS]
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      }
      if (parts.length === 2) {
        // [MM, SS]
        return parts[0] * 60 + parts[1];
      }
      return null;
    }

    const num = Number.parseFloat(trimmed);
    return Number.isFinite(num) && num >= 0 ? num : null;
  }

  return null;
}

export function normalizeSegmentType(raw: string): SegmentType | null {
  const clean = raw.toLowerCase().trim().replace(/[\s_]+/g, "-");
  if (clean === "intro") return "intro";
  if (clean === "recap") return "recap";
  if (clean === "outro" || clean === "credits" || clean === "end-credits") return "outro";
  if (clean === "post-credits" || clean === "post-credit" || clean === "postcredits") return "post-credits";
  if (clean === "preview") return "preview";
  return null;
}

export function extractSegmentRange(
  raw: Record<string, unknown>,
  type: SegmentType,
  durationSec?: number
): { start: number; end: number } | null {
  let start: number | null = null;
  let end: number | null = null;

  if (raw.start_sec !== undefined) {
    start = parseTimeValue(raw.start_sec);
  } else if (raw.start_ms !== undefined) {
    const ms = parseTimeValue(raw.start_ms);
    start = ms !== null ? ms / 1000 : null;
  } else if (raw.start !== undefined) {
    start = parseTimeValue(raw.start);
  } else if (raw.start_time !== undefined) {
    start = parseTimeValue(raw.start_time);
  }

  if (raw.end_sec !== undefined) {
    end = parseTimeValue(raw.end_sec);
  } else if (raw.end_ms !== undefined) {
    const ms = parseTimeValue(raw.end_ms);
    end = ms !== null ? ms / 1000 : null;
  } else if (raw.end !== undefined) {
    end = parseTimeValue(raw.end);
  } else if (raw.end_time !== undefined) {
    end = parseTimeValue(raw.end_time);
  }

  if (start === null) return null;

  // Outro can omit end when it continues through to the stream duration
  if (type === "outro" && (end === null || end <= start) && durationSec && durationSec > start) {
    end = durationSec;
  }

  if (end === null || end <= start) return null;

  return { start, end };
}

export function parseIntroDbSegments(data: unknown, durationSec?: number): MediaSegment[] {
  if (!data || typeof data !== "object") return [];

  const results: MediaSegment[] = [];

  // Shape 1: Top-level array of segment objects
  if (Array.isArray(data)) {
    for (const item of data) {
      if (item && typeof item === "object") {
        const itemObj = item as Record<string, unknown>;
        const rawType = (itemObj.segment_type || itemObj.type) as string | undefined;
        if (!rawType) continue;
        const normalizedType = normalizeSegmentType(rawType);
        if (!normalizedType) continue;

        const range = extractSegmentRange(itemObj, normalizedType, durationSec);
        if (range) {
          results.push({ type: normalizedType, start: range.start, end: range.end });
        }
      }
    }
    return results.sort((a, b) => a.start - b.start);
  }

  const obj = data as Record<string, unknown>;

  // Shape 2: obj.segments is an array
  if (Array.isArray(obj.segments)) {
    for (const item of obj.segments) {
      if (item && typeof item === "object") {
        const itemObj = item as Record<string, unknown>;
        const rawType = (itemObj.segment_type || itemObj.type) as string | undefined;
        if (!rawType) continue;
        const normalizedType = normalizeSegmentType(rawType);
        if (!normalizedType) continue;

        const range = extractSegmentRange(itemObj, normalizedType, durationSec);
        if (range) {
          results.push({ type: normalizedType, start: range.start, end: range.end });
        }
      }
    }
    return results.sort((a, b) => a.start - b.start);
  }

  // Shape 3: Segment dictionary either under obj.segments or directly at obj root
  const segmentSource =
    obj.segments && typeof obj.segments === "object" && !Array.isArray(obj.segments)
      ? (obj.segments as Record<string, unknown>)
      : obj;

  const candidateKeys = [
    "intro",
    "recap",
    "outro",
    "post_credits",
    "post-credits",
    "preview",
    "credits",
    "end_credits",
  ];

  for (const key of candidateKeys) {
    const segVal = segmentSource[key];
    if (segVal && typeof segVal === "object" && !Array.isArray(segVal)) {
      const normalizedType = normalizeSegmentType(key);
      if (!normalizedType) continue;

      const range = extractSegmentRange(segVal as Record<string, unknown>, normalizedType, durationSec);
      if (range) {
        // Avoid duplicate types if both post_credits and post-credits are present
        if (!results.some((r) => r.type === normalizedType && Math.abs(r.start - range.start) < 0.1)) {
          results.push({ type: normalizedType, start: range.start, end: range.end });
        }
      }
    }
  }

  return results.sort((a, b) => a.start - b.start);
}

export function buildIntroDbUrl(params: SegmentFetchParams): URL | null {
  const baseUrl = getEnvVar("INTRODB_API_URL")?.replace(/\/+$/, "");
  if (!baseUrl) {
    return null;
  }
  const url = new URL(`${baseUrl}/segments`);

  url.searchParams.set("imdb_id", params.imdbId);

  if (params.mediaType === "movie") {
    url.searchParams.set("is_movie", "true");
  } else {
    if (typeof params.season === "number" && Number.isInteger(params.season) && params.season > 0) {
      url.searchParams.set("season", String(params.season));
    }
    if (typeof params.episode === "number" && Number.isInteger(params.episode) && params.episode > 0) {
      url.searchParams.set("episode", String(params.episode));
    }
  }

  return url;
}

export async function fetchIntroDbSegments(
  params: SegmentFetchParams,
  timeoutMs = 4000
): Promise<MediaSegment[]> {
  try {
    const url = buildIntroDbUrl(params);
    if (!url) {
      return [];
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": "Cineby/1.0",
    };

    const apiKey = getEnvVar("INTRODB_API_KEY")?.trim();
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
    return parseIntroDbSegments(data, params.duration);
  } catch {
    return [];
  }
}
