export interface EmbedCapabilities {
  startAt: boolean;
  events: boolean; // postMessage progress events
  theme: boolean;
  autoplay: boolean;
  lang: boolean;
  idType: "tmdb" | "imdb" | "both";
  anime?: boolean;
  tvControls?: boolean;
}

export interface EmbedThemeConfig {
  primary?: string;
  secondary?: string;
}

export interface EmbedBuildUrlOptions {
  tmdbId?: number | string;
  imdbId?: string;
  anilistId?: number | string;
  type: "movie" | "tv" | "anime";
  season?: number;
  episode?: number;
  startAtSec?: number;
  progress?: number;
  theme?: EmbedThemeConfig;
  lang?: string;
  autoplay?: boolean;
  nextEpisode?: boolean;
  episodeSelector?: boolean;
  autoplayNextEpisode?: boolean;
}

export type EmbedEventType =
  | "play"
  | "pause"
  | "seeked"
  | "timeupdate"
  | "ended"
  | "next"
  | "media_data";

export const DEFAULT_EMBED_SANDBOX =
  "allow-scripts allow-same-origin allow-forms allow-presentation";

export interface EmbedNormalizedEvent {
  event: EmbedEventType;
  currentTime?: number;
  duration?: number;
  videoId?: string;
  rawData?: unknown;
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
