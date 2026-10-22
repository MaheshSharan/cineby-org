import type { MediaSummary } from "@/lib/tmdb/types";
import { HERO_SPOTLIGHT_PICKS, type HeroPickItem } from "@/lib/constants/heroPicks";
import { getMediaLogo, getMovieDetails } from "@/lib/tmdb/server/movies";
import { getTvDetails } from "@/lib/tmdb/server/tv";
import { logger } from "@/lib/logger";

/**
 * Resolves a single HeroPickItem into a full MediaSummary with logo.
 */
async function resolvePickToMediaSummary(pick: HeroPickItem): Promise<MediaSummary | null> {
  try {
    if (pick.mediaType === "movie") {
      const details = await getMovieDetails(pick.id);
      const logoPath = await getMediaLogo("movie", pick.id);
      return {
        id: details.id,
        mediaType: "movie",
        title: details.title,
        overview: details.overview,
        posterPath: details.posterPath,
        backdropPath: details.backdropPath,
        releaseDate: details.releaseDate,
        voteAverage: details.voteAverage,
        voteCount: details.voteCount,
        popularity: details.popularity,
        originalLanguage: details.originalLanguage,
        genreIds: details.genres.map((g) => g.id),
        logoPath,
      };
    }

    const details = await getTvDetails(pick.id);
    const logoPath = await getMediaLogo("tv", pick.id);
    return {
      id: details.id,
      mediaType: "tv",
      title: details.title,
      overview: details.overview,
      posterPath: details.posterPath,
      backdropPath: details.backdropPath,
      releaseDate: details.releaseDate,
      voteAverage: details.voteAverage,
      voteCount: details.voteCount,
      popularity: details.popularity,
      originalLanguage: details.originalLanguage,
      genreIds: details.genres.map((g) => g.id),
      logoPath,
    };
  } catch (error) {
    logger.warn(`[HeroPicks] Failed to resolve pick ${pick.mediaType}:${pick.id}`, undefined, error);
    return null;
  }
}

/**
 * Resolves curated hero picks from HERO_SPOTLIGHT_PICKS in parallel.
 * Works seamlessly on Cloudflare Workers edge environment (zero fs dependency).
 */
export async function getHeroPicksMedia(picks: readonly HeroPickItem[] = HERO_SPOTLIGHT_PICKS): Promise<MediaSummary[]> {
  if (!picks || picks.length === 0) {
    return [];
  }

  try {
    const results = await Promise.all(picks.map((pick) => resolvePickToMediaSummary(pick)));
    return results.filter((item): item is MediaSummary => item !== null);
  } catch (error) {
    logger.warn("[HeroPicks] Could not resolve hero picks, falling back to trending", undefined, error);
    return [];
  }
}
