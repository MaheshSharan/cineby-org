import type { MediaSegment, SegmentFetchParams, SegmentProviderName, SegmentProviderResult } from "./types";
import { getEnvVar } from "@/lib/env";
import { fetchIntroDbSegments } from "./introdb";
import { fetchSkipDbSegments } from "./skipdb";

export * from "./types";
export { fetchIntroDbSegments } from "./introdb";
export { fetchSkipDbSegments } from "./skipdb";

/**
 * Default provider priority.
 * IntroDB is permanent/primary, SkipDB is fallback.
 * To switch priority in code, modify this array.
 * Alternatively, configure the SEGMENT_PROVIDER_PRIORITY environment variable (e.g. "skipdb,introdb").
 */
export const DEFAULT_SEGMENT_PROVIDER_PRIORITY: readonly SegmentProviderName[] = [
  "introdb",
  "skipdb",
];

export function getSegmentProviderPriority(): SegmentProviderName[] {
  const envPriority = getEnvVar("SEGMENT_PROVIDER_PRIORITY")?.trim();
  if (!envPriority) {
    return [...DEFAULT_SEGMENT_PROVIDER_PRIORITY];
  }

  const parsed = envPriority
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter((p): p is SegmentProviderName => p === "introdb" || p === "skipdb");

  return parsed.length > 0 ? parsed : [...DEFAULT_SEGMENT_PROVIDER_PRIORITY];
}

/**
 * Fetches media segments following the provider priority order.
 * If the primary provider returns valid segments, those are returned.
 * If empty or error occurs, it falls back to the next provider in the chain.
 */
export async function fetchSegmentsWithFallback(
  params: SegmentFetchParams,
  priority?: SegmentProviderName[]
): Promise<SegmentProviderResult> {
  const providers = priority && priority.length > 0 ? priority : getSegmentProviderPriority();

  for (const provider of providers) {
    let segments: MediaSegment[] = [];

    if (provider === "introdb") {
      segments = await fetchIntroDbSegments(params);
    } else if (provider === "skipdb") {
      segments = await fetchSkipDbSegments(params);
    }

    if (segments.length > 0) {
      return {
        segments,
        providerUsed: provider,
      };
    }
  }

  return {
    segments: [],
  };
}
