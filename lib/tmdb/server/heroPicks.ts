import type { MediaSummary, MediaType } from "@/lib/tmdb/types";
import { getMediaLogo, getMovieDetails } from "@/lib/tmdb/server/movies";
import { getTvDetails } from "@/lib/tmdb/server/tv";
import { logger } from "@/lib/logger";

export interface HeroPickConfig {
  mediaType: MediaType;
  id: number;
  position: number;
}

/**
 * Parses raw text content into structured HeroPickConfig entries.
 * Line order determines carousel position (1-indexed).
 */
export function parseHeroPicksText(rawText: string): HeroPickConfig[] {
  const lines = rawText.split(/\r?\n/);
  const picks: HeroPickConfig[] = [];
  const seen = new Set<string>();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = /^(movie|tv)=(\d+)$/i.exec(line);
    if (!match) {
      continue;
    }

    const mediaType = match[1].toLowerCase() as MediaType;
    const id = Number.parseInt(match[2], 10);
    const key = `${mediaType}:${id}`;

    if (!Number.isFinite(id) || id <= 0 || seen.has(key)) {
      continue;
    }

    seen.add(key);
    picks.push({
      mediaType,
      id,
      position: picks.length + 1,
    });
  }

  return picks;
}

/**
 * Resolves a single HeroPick into full MediaSummary with logo.
 */
async function resolvePickToMediaSummary(pick: HeroPickConfig): Promise<MediaSummary | null> {
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
 * Reads data/hero-picks.txt and resolves configured media items in parallel.
 * Falls back gracefully to an empty array on any missing file or read issue.
 */
export async function getHeroPicksMedia(): Promise<MediaSummary[]> {
  try {
    // Dynamic import of fs to preserve edge/worker bundling compatibility
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filePath = path.join(process.cwd(), "data", "hero-picks.txt");

    const content = await fs.readFile(filePath, "utf-8");
    const configs = parseHeroPicksText(content);

    if (configs.length === 0) {
      return [];
    }

    const results = await Promise.all(configs.map((config) => resolvePickToMediaSummary(config)));
    return results.filter((item): item is MediaSummary => item !== null);
  } catch (error) {
    logger.warn("[HeroPicks] Could not load data/hero-picks.txt, falling back to trending", undefined, error);
    return [];
  }
}
