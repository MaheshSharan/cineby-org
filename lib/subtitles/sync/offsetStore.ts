import { MAX_SHIFT_SEC } from "./correlate";

const STORAGE_KEY = "cineby_subtitle_offsets";
const MAX_ENTRIES = 200;

type OffsetMap = Record<string, number>;

/** Clamps to the range we can ever have measured, and to millisecond precision. */
export function sanitizeOffset(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.round(Math.max(-MAX_SHIFT_SEC, Math.min(MAX_SHIFT_SEC, value)) * 1000) / 1000;
}

export function offsetKey(mediaKey: string, serverId: string | undefined, trackId: string): string {
  return `${mediaKey}|${serverId ?? ""}|${trackId}`;
}

function readMap(): OffsetMap {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object") return {};
    const entries = Object.entries(parsed as Record<string, unknown>);
    return Object.fromEntries(entries.map(([key, value]) => [key, sanitizeOffset(value)]));
  } catch {
    return {};
  }
}

export function loadOffset(key: string): number {
  return readMap()[key] ?? 0;
}

/** Saves an offset; zero removes the entry. Oldest entries are dropped past MAX_ENTRIES. */
export function saveOffset(key: string, offsetSec: number): void {
  const map = readMap();
  const value = sanitizeOffset(offsetSec);
  delete map[key];
  if (value !== 0) map[key] = value;

  const entries = Object.entries(map).slice(-MAX_ENTRIES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Storage full or blocked: the offset still applies for this session.
  }
}
