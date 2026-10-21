import type { MediaType } from "@/lib/tmdb/types";

export interface HeroPickItem {
  mediaType: MediaType;
  id: number;
}

/**
 * Curated Hero Carousel Spotlight Picks.
 *
 * Array order determines carousel slide position (Pos 1, Pos 2, etc.).
 * When fewer than 12 picks are provided, remaining carousel slots
 * are automatically backfilled with top trending releases.
 */
export const HERO_SPOTLIGHT_PICKS: readonly HeroPickItem[] = [
  { mediaType: "movie", id: 537915 }, // After
  { mediaType: "tv", id: 34524 }, // Teen Wolf
  { mediaType: "tv", id: 5920 }, // The Mentalist
  { mediaType: "tv", id: 1396 }, // Breaking Bad
  { mediaType: "tv", id: 108978 }, // Reacher
  { mediaType: "movie", id: 10229 }, // A Walk to Remember
] as const;
