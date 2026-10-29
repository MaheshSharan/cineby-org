export type PlayerMode = "native" | "hybrid" | "embed";

export interface EmbedCapabilities {
  startAt: boolean;
  events: boolean; // postMessage progress events
  theme: boolean;
  autoplay: boolean;
  lang: boolean;
  idType: "tmdb" | "imdb" | "both";
}

export interface EmbedBuildUrlOptions {
  tmdbId?: number | string;
  imdbId?: string;
  type: "movie" | "tv";
  season?: number;
  episode?: number;
  startAtSec?: number;
  theme?: { primary?: string; secondary?: string };
  lang?: string;
  autoplay?: boolean;
}

export interface EmbedNormalizedEvent {
  event: "play" | "pause" | "seeked" | "timeupdate" | "ended";
  currentTime?: number;
  duration?: number;
  videoId?: string;
}

export interface EmbedIframeOptions {
  allow: string;
  referrerPolicy: React.HTMLAttributeReferrerPolicy;
  sandbox?: string;
}

export interface EmbedProvider {
  id: string;
  name: string;
  capabilities: EmbedCapabilities;
  allowedOrigins: string[];
  buildUrl(options: EmbedBuildUrlOptions): string;
  parseEvent(origin: string, data: unknown): EmbedNormalizedEvent | null;
  iframe: EmbedIframeOptions;
}
