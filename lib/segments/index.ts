import type { MediaSegment, SegmentFetchParams, SegmentProviderName, SegmentProviderResult } from "./types";
import { getSegmentProviderPriority } from "@/lib/env/server";
import { fetchIntroDbSegments } from "./introdb";
import { fetchSkipDbSegments } from "./skipdb";

export * from "./types";
export { fetchIntroDbSegments } from "./introdb";
export { fetchSkipDbSegments } from "./skipdb";

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
