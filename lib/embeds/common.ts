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
 * Allows exact match or legitimate subdomains of allowed origins with matching protocol.
 */
export function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  if (!origin || typeof origin !== "string") return false;
  try {
    const originObj = new URL(origin);
    const originProtocol = originObj.protocol.toLowerCase();
    const originHostname = originObj.hostname.toLowerCase();
    const originPort = originObj.port;

    return allowedOrigins.some((allowed) => {
      try {
        const allowedObj = new URL(allowed);
        if (originProtocol !== allowedObj.protocol.toLowerCase()) {
          return false;
        }
        if (originPort !== allowedObj.port) {
          return false;
        }
        const allowedHostname = allowedObj.hostname.toLowerCase();
        return (
          originHostname === allowedHostname ||
          originHostname.endsWith(`.${allowedHostname}`)
        );
      } catch {
        const normAllowed = allowed.toLowerCase().replace(/\/+$/, "");
        return originObj.origin.toLowerCase() === normAllowed;
      }
    });
  } catch {
    const normOrigin = origin.toLowerCase().trim().replace(/\/+$/, "");
    return allowedOrigins.some((a) => normOrigin === a.toLowerCase().trim().replace(/\/+$/, ""));
  }
}

/** Parses a JSON string or accepts an object; anything that is not a plain object yields null. */
export function toRecord(data: unknown): Record<string, unknown> | null {
  if (typeof data === "string") {
    try {
      return toRecord(JSON.parse(data));
    } catch {
      return null;
    }
  }
  return data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
}

/** A finite, non-negative number from a number or numeric string, otherwise undefined. */
export function toNonNegativeNumber(value: unknown): number | undefined {
  const parsed = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

const VALID_EVENT_TYPES = new Set<EmbedEventType>([
  "play",
  "pause",
  "seeked",
  "timeupdate",
  "ended",
  "next",
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

  let innerData: Record<string, unknown> | null = null;
  if (obj.type === "PLAYER_EVENT") {
    if (typeof obj.data === "object" && obj.data !== null && !Array.isArray(obj.data)) {
      innerData = obj.data as Record<string, unknown>;
    } else if (typeof obj.data === "string") {
      try {
        const parsed = JSON.parse(obj.data);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          innerData = parsed as Record<string, unknown>;
        }
      } catch {
        // invalid JSON string in data
      }
    }
  }

  if (obj.type === "MEDIA_DATA") {
    eventName = "media_data";
    rawData = obj.data;

    if (typeof obj.data === "string") {
      try {
        const parsedData = JSON.parse(obj.data);
        if (Array.isArray(parsedData) && parsedData.length > 0) {
          const lastItem = parsedData[parsedData.length - 1];
          if (lastItem && typeof lastItem === "object") {
            extractTimes(lastItem as Record<string, unknown>);
          }
        } else if (parsedData && typeof parsedData === "object") {
          extractTimes(parsedData as Record<string, unknown>);
        }
      } catch {
        // raw string kept in rawData
      }
    } else if (Array.isArray(obj.data) && obj.data.length > 0) {
      const lastItem = obj.data[obj.data.length - 1];
      if (lastItem && typeof lastItem === "object") {
        extractTimes(lastItem as Record<string, unknown>);
      }
    } else if (obj.data && typeof obj.data === "object") {
      extractTimes(obj.data as Record<string, unknown>);
    }
  } else if (innerData) {
    eventName = String(innerData.event || "");
    extractTimes(innerData);
    videoId =
      innerData.video_id !== undefined
        ? String(innerData.video_id)
        : innerData.videoId !== undefined
        ? String(innerData.videoId)
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
  if (eventName === "nextepisode" || eventName === "next_episode") {
    eventName = "next";
  }

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
