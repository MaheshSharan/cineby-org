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
  { mediaType: "tv", id: 276161 },   // Teach You a Lesson (2026)
  { mediaType: "tv", id: 1396 },     // Breaking Bad
  { mediaType: "movie", id: 155 },   // The Dark Knight
  { mediaType: "tv", id: 200709 },   // Weak Hero
  { mediaType: "movie", id: 1726 },  // Iron Man (2008)
  { mediaType: "tv", id: 273240 },   // Off Campus (2026)
  { mediaType: "tv", id: 108978 },   // Reacher
  { mediaType: "tv", id: 5920 },     // The Mentalist
  { mediaType: "tv", id: 1399 },     // Game of Thrones
  { mediaType: "tv", id: 34524 },    // Teen Wolf
  { mediaType: "tv", id: 278573 },   // Perfect Crown (2026)
  { mediaType: "tv", id: 127529 },   // Bloodhounds
] as const;
