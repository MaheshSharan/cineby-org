import type { EmbedEventType, EmbedNormalizedEvent } from "./types";

/**
 * Strips leading '#' and validates if a string is a 6-digit hex color.
 */
export function cleanHexColor(hex?: string): string | undefined {
  if (!hex || typeof hex !== "string") return undefined;
  const clean = hex.trim().replace(/^#/, "");
  return /^[0-9a-fA-F]{6}$/.test(clean) ? clean : undefined;
}

/**
 * Verifies if an event origin matches any of the allowed origins.
 */
export function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  if (!origin || typeof origin !== "string") return false;
  try {
    const originObj = new URL(origin);
    const normOrigin = originObj.origin.toLowerCase();
    return allowedOrigins.some((allowed) => {
      try {
        const allowedNorm = new URL(allowed).origin.toLowerCase();
        return normOrigin === allowedNorm;
      } catch {
        return normOrigin === allowed.toLowerCase().replace(/\/+$/, "");
      }
    });
  } catch {
    const normOrigin = origin.toLowerCase().trim().replace(/\/+$/, "");
    return allowedOrigins.some((a) => normOrigin === a.toLowerCase().trim().replace(/\/+$/, ""));
  }
}

const VALID_EVENT_TYPES = new Set<EmbedEventType>([
  "play",
  "pause",
  "seeked",
  "timeupdate",
  "ended",
  "media_data",
]);

/**
 * Parses and normalizes incoming postMessage payloads from embed providers.
 * Supports:
 * - Stringified JSON (Vidy's standard format & stringified Vixsrc)
 * - Structured object payloads (Vixsrc standard format)
 * - Vidy PLAYER_EVENT and MEDIA_DATA schemas
 * - Vixsrc { type: "PLAYER_EVENT", data: { ... } } and direct schemas
 */
export function parseEmbedMessage(
  origin: string,
  allowedOrigins: string[],
  data: unknown
): EmbedNormalizedEvent | null {
  if (!isOriginAllowed(origin, allowedOrigins)) {
    return null;
  }

  let payload: unknown = data;
  if (typeof data === "string") {
    const trimmed = data.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
      return null;
    }
    try {
      payload = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const obj = payload as Record<string, unknown>;
  let eventName = "";
  let currentTime: number | undefined;
  let duration: number | undefined;
  let videoId: string | undefined;
  let rawData: unknown = undefined;

  function extractTimes(record: Record<string, unknown>) {
    const cTime = record.currentTime ?? record.progress ?? record.progressSeconds ?? record.time;
    if (typeof cTime === "number" && Number.isFinite(cTime) && cTime >= 0) {
      currentTime = cTime;
    } else if (typeof cTime === "string" && cTime.trim() !== "") {
      const parsed = Number(cTime);
      if (Number.isFinite(parsed) && parsed >= 0) {
        currentTime = parsed;
      }
    }

    const dur = record.duration ?? record.totalTime;
    if (typeof dur === "number" && Number.isFinite(dur) && dur >= 0) {
      duration = dur;
    } else if (typeof dur === "string" && dur.trim() !== "") {
      const parsed = Number(dur);
      if (Number.isFinite(parsed) && parsed >= 0) {
        duration = parsed;
      }
    }
  }

  if (obj.type === "MEDIA_DATA") {
    eventName = "media_data";
    rawData = obj.data;

    if (typeof obj.data === "string") {
      try {
        const parsedData = JSON.parse(obj.data);
        if (parsedData && typeof parsedData === "object") {
          extractTimes(parsedData as Record<string, unknown>);
        }
      } catch {
        // raw string kept in rawData
      }
    } else if (obj.data && typeof obj.data === "object") {
      extractTimes(obj.data as Record<string, unknown>);
    }
  } else if (obj.type === "PLAYER_EVENT" && typeof obj.data === "object" && obj.data !== null) {
    const inner = obj.data as Record<string, unknown>;
    eventName = String(inner.event || "");
    extractTimes(inner);
    videoId =
      inner.video_id !== undefined
        ? String(inner.video_id)
        : inner.videoId !== undefined
        ? String(inner.videoId)
        : undefined;
  } else if (typeof obj.event === "string") {
    eventName = obj.event;
    extractTimes(obj);
    videoId =
      obj.video_id !== undefined
        ? String(obj.video_id)
        : obj.videoId !== undefined
        ? String(obj.videoId)
        : undefined;
  } else if (typeof obj.type === "string" && VALID_EVENT_TYPES.has(obj.type.toLowerCase() as EmbedEventType)) {
    eventName = obj.type.toLowerCase();
    extractTimes(obj);
    videoId =
      obj.video_id !== undefined
        ? String(obj.video_id)
        : obj.videoId !== undefined
        ? String(obj.videoId)
        : undefined;
  }

  eventName = eventName.toLowerCase().trim();
  if (!VALID_EVENT_TYPES.has(eventName as EmbedEventType)) {
    return null;
  }

  const result: EmbedNormalizedEvent = {
    event: eventName as EmbedEventType,
    currentTime,
    duration,
    videoId,
  };

  if (rawData !== undefined) {
    result.rawData = rawData;
  }

  return result;
}
