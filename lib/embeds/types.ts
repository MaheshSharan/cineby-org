export interface EmbedCapabilities {
  startAt: boolean;
  events: boolean; // postMessage progress events
  theme: boolean;
  autoplay: boolean;
  lang: boolean;
  idType: "tmdb" | "imdb" | "both";
  anime?: boolean;
  tvControls?: boolean;
  /** The embedded player runs its own Up Next / auto-advance, so the site must not navigate on "ended". */
  handlesNextEpisode?: boolean;
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
  title?: string;
  /** Absolute image URL shown while the player loads. */
  posterUrl?: string;
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
  | "durationchange"
  | "ended"
  | "next"
  | "episode"
  | "media_data";

export const DEFAULT_EMBED_SANDBOX =
  "allow-scripts allow-same-origin allow-forms allow-presentation";

export interface EmbedNormalizedEvent {
  event: EmbedEventType;
  currentTime?: number;
  duration?: number;
  videoId?: string;
  /** Set on "episode" events: the episode the viewer moved to inside the embedded player. */
  season?: number;
  episode?: number;
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
  /** For embeds with no start-time URL parameter: the message that seeks to the resume position. */
  resume?: { targetOrigin: string; buildMessage(startAtSec: number): unknown };
}
