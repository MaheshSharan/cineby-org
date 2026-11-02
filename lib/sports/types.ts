export interface SportSubstream {
  id: number;
  name: string;
  tag: string;
  uri_name: string;
  source_tag?: string;
  locale?: string;
  iframe: string;
}

export interface SportMatch {
  id: number;
  name: string;
  tag: string;
  source_tag?: string;
  poster?: string;
  blurhash?: string;
  colors?: [string, string] | string[];
  uri_name: string;
  starts_at: number; // Unix timestamp in seconds
  ends_at: number;   // Unix timestamp in seconds
  always_live: number | boolean;
  locale?: string;
  category_name: string;
  iframe: string;
  substreams?: SportSubstream[];
  viewers?: string | number;
}

export interface SportCategoryGroup {
  category: string;
  id: number;
  always_live?: boolean;
  streams: SportMatch[];
}

export interface SportsApiResponse {
  success: boolean;
  timestamp?: number;
  streams: SportCategoryGroup[];
}

export interface FlattenedSportsData {
  all: SportMatch[];
  liveNow: SportMatch[];
  upcoming: SportMatch[];
  categories: string[];
}

export function getSportWatchHref(uriName: string): string {
  // Normalize uriName by splitting path segments and encoding each, or encoding the URI properly
  const cleanUri = (uriName || "").replace(/^\/+/, "");
  const encodedSegments = cleanUri.split("/").map((seg) => encodeURIComponent(seg)).join("/");
  return `/sports/${encodedSegments}`;
}

export interface HeroSportItem {
  id: number;
  isSport: true;
  title: string;
  tag: string;
  category: string;
  poster: string;
  uri_name: string;
  viewers?: string | number;
  starts_at: number;
  ends_at: number;
  always_live: number | boolean;
}
