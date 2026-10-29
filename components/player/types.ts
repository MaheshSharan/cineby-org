import type { SeasonEpisodes } from "@/lib/tmdb";

export type MediaType = "movie" | "tv";

export const ONBOARD_ADS_PLAYER_INFO_KEY = "onboard_ads_player_info";

export const ADGUARD_CHROME_STORE_URL =
  "https://chromewebstore.google.com/detail/adguard-adblocker/bgnkhhnnamicmpeenaelnjfhikgbkllg?hl=en&pli=1";

export type QualityLabel = "2160p" | "1080p" | "720p" | "480p";

export type PlaybackRate = 0.25 | 0.5 | 0.75 | 1 | 1.25 | 1.5 | 1.75 | 2;

export interface PlayerMedia {
  mediaType: MediaType;
  mediaId: number;
  imdbId?: string | null;
  anilistId?: number | string | null;
  title: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  episodeName?: string | null;
  duration?: string | null;
  runtime?: number | null;
  releaseYear?: string | null;
  progress?: number | null;
  progressSeconds?: number | null;
  seasons?: PlayerSeason[];
  initialEpisodes?: SeasonEpisodes | null;
}

export interface PlayerSeason {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  overview: string;
}

export interface Episode {
  id: number;
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  overview: string;
  stillPath: string | null;
  runtime: number | null;
  airDate: string | null;
  voteAverage: number;
}

export interface PlayerSettings {
  volume: number;
  muted: boolean;
  rate: PlaybackRate;
  quality: QualityLabel | null;
  serverId: string;
  subtitleLang: string | null;
  autoNext: boolean;
}
