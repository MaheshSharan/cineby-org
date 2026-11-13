import type { MediaType } from "@/lib/tmdb";

export interface TakedownEntry {
  mediaType: MediaType;
  /** TMDB id: the number right after /movie/ or /tv/ in the URL. */
  id: number;
  /** For humans reading this file only; it is never matched against. */
  title: string;
}

/**
 * Titles removed after a copyright notice. Add one line per title (a TV show covers all its seasons
 * and episodes). A listed title redirects to the home page everywhere and disappears from every list.
 */
export const TAKEDOWN_LIST: readonly TakedownEntry[] = [
  { mediaType: "movie", id: 1798903, title: "Killsave" },
  { mediaType: "movie", id: 1422041, title: "La bola negra" },
  { mediaType: "movie", id: 791523, title: "Wildwood" },
  { mediaType: "tv", id: 1396, title: "Breaking Bad" },
];
