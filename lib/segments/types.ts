import type { MediaSegment, SegmentType } from "@/components/player/types";

export type SegmentProviderName = "introdb" | "skipdb";

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
