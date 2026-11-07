export interface User {
  id: number;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  activeProfileId?: number | null;
  hasProfiles?: boolean;
}

export interface WatchlistItem {
  id: number;
  mediaType: "movie" | "tv";
  mediaId: number;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  addedAt: string;
}

export interface HistoryEntry {
  id: number;
  mediaType: "movie" | "tv";
  mediaId: number;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  titleBackdropPath?: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  duration: string | null;
  progress: number | null;
  progressSeconds?: number | null;
  watchedAt: string;
}
