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
/**
 * Curated Hero Carousel Spotlight Picks (Disabled for dynamic trending feed).
 * Kept as static fallback structure.
 */
export const HERO_SPOTLIGHT_PICKS: readonly HeroPickItem[] = [] as const;

export const BACKUP_HERO_SPOTLIGHT_PICKS: readonly HeroPickItem[] = [
  { mediaType: "tv", id: 276161 },   // Teach You a Lesson (2026)
  { mediaType: "tv", id: 1396 },     // Breaking Bad
  { mediaType: "movie", id: 155 },   // The Dark Knight
  { mediaType: "tv", id: 200709 },   // Weak Hero
  { mediaType: "movie", id: 1726 },  // Iron Man (2008)
  { mediaType: "tv", id: 273240 },   // Off Campus (2026)
  { mediaType: "tv", id: 108978 },   // Reacher
] as const;
