import type { MediaSummary } from "@/lib/tmdb";
import { buildSourceImageUrl } from "@/lib/tmdb/image";
import { getYear } from "@/lib/utils/media";

import { SITE_NAME } from "./site";

// Search engines cut descriptions at roughly this length.
const MAX_DESCRIPTION_LENGTH = 160;

type SeoMedia = Pick<MediaSummary, "title" | "overview" | "releaseDate">;

export function truncateDescription(text: string, maxLength = MAX_DESCRIPTION_LENGTH): string {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const clipped = normalized.slice(0, maxLength - 1);
  const lastSpace = clipped.lastIndexOf(" ");
  const atWordBoundary = lastSpace > maxLength / 2 ? clipped.slice(0, lastSpace) : clipped;

  return `${atWordBoundary.replace(/[.,;:!?-]+$/, "")}…`;
}

export function buildMediaTitle(media: Pick<SeoMedia, "title" | "releaseDate">): string {
  const year = getYear(media.releaseDate);
  const yearSuffix = year ? ` (${year})` : "";

  return `${media.title}${yearSuffix} | ${SITE_NAME}`;
}

export function buildMediaDescription(media: SeoMedia): string {
  const overview = truncateDescription(media.overview);

  if (overview) {
    return overview;
  }

  // TMDB has no overview for some titles; an empty description would leave search engines to guess one.
  const year = getYear(media.releaseDate);
  const yearSuffix = year ? ` (${year})` : "";

  return `Explore synopsis, cast, and release details for ${media.title}${yearSuffix} on ${SITE_NAME}.`;
}

export function getMediaOpenGraphImageUrl(
  media: Pick<MediaSummary, "backdropPath" | "posterPath">
): string | null {
  return buildSourceImageUrl(media.backdropPath, "w1280") ?? buildSourceImageUrl(media.posterPath, "w780");
}

export function getMediaOpenGraphImage(
  media: Pick<MediaSummary, "backdropPath" | "posterPath">
): { url: string; width: number; height: number } | null {
  if (media.backdropPath) {
    const url = buildSourceImageUrl(media.backdropPath, "w1280");
    if (url) {
      return { url, width: 1280, height: 720 };
    }
  }

  if (media.posterPath) {
    const url = buildSourceImageUrl(media.posterPath, "w780");
    if (url) {
      return { url, width: 780, height: 1170 };
    }
  }

  return null;
}

