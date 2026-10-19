import type { MediaSegment, SegmentType } from "@/components/player/types";

export const SEGMENT_PROVIDER_NAMES = ["introdb", "skipdb"] as const;
export type SegmentProviderName = (typeof SEGMENT_PROVIDER_NAMES)[number];

export interface SegmentFetchParams {
  imdbId: string;
  mediaType: "movie" | "tv";
  season?: number;
  episode?: number;
  duration?: number;
}

export interface SegmentProviderResult {
  segments: MediaSegment[];
  providerUsed?: SegmentProviderName;
}

export type { MediaSegment, SegmentType };
