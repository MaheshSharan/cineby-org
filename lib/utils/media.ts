import type { PlayerSeason } from "@/components/player/types";
import { encryptMediaToken } from "@/lib/seo/obfuscate";
import type { MediaType, Season } from "@/lib/tmdb";
import { slugify } from "@/lib/utils/slug";

export function getYear(dateString: string | null): string {
  if (!dateString) {
    return "";
  }

  return dateString.slice(0, 4);
}

export function getMediaHref(mediaType: MediaType, id: number, title?: string | null): string {
  const token = encryptMediaToken(Number(id), mediaType);
  const slug = slugify(title);
  const identifier = slug ? `${token}-${slug}` : token;
  return mediaType === "tv" ? `/tv/${identifier}` : `/movie/${identifier}`;
}

export function getPlayHref(
  mediaType: MediaType,
  id: number,
  timeSeconds?: number | null,
  title?: string | null
): string {
  const base = getMediaHref(mediaType, id, title);
  return timeSeconds && timeSeconds > 0 ? `${base}?t=${Math.floor(timeSeconds)}` : base;
}

export function getEpisodeHref(
  id: number,
  seasonNumber: number,
  episodeNumber: number,
  timeSeconds?: number | null,
  title?: string | null
): string {
  const token = encryptMediaToken(Number(id), "tv");
  const slug = slugify(title);
  const identifier = slug ? `${token}-${slug}` : token;
  const base = `/tv/${identifier}/${seasonNumber}/${episodeNumber}`;
  return timeSeconds && timeSeconds > 0 ? `${base}?t=${Math.floor(timeSeconds)}` : base;
}

export function formatPlaybackTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`;
  }
  return `${mins}:${pad(secs)}`;
}

export function getMediaTypeLabel(mediaType: MediaType): string {
  return mediaType === "tv" ? "TV Show" : "Movie";
}

/**
 * Builds the canonical identity key for a media playback session.
 * Used for stream selection, subtitle tracking, and player segment caching.
 */
export function getMediaKey(
  mediaType: string,
  mediaId: number | string,
  seasonNumber?: number | null,
  episodeNumber?: number | null
): string {
  const isTv = mediaType === "tv";
  const season = isTv ? (seasonNumber ?? 0) : 0;
  const episode = isTv ? (episodeNumber ?? 0) : 0;
  return `${mediaType}-${mediaId}-${season}-${episode}`;
}

export function formatRuntime(minutes: number | null): string {
  if (!minutes || minutes <= 0) {
    return "";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes}m`;
}

export function parseRuntimeToMinutes(duration: string | null | undefined): number {
  if (!duration) return 0;
  const match = duration.match(/(?:(\d+)\s*h(?:ours?)?)?\s*(?:(\d+)\s*m(?:in(?:utes?)?)?)?/i);
  if (!match) return 0;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  return hours * 60 + minutes;
}

export function calculateResumeSeconds(
  progress: number | null | undefined,
  durationOrMinutes: string | number | null | undefined
): number {
  if (!progress || progress <= 0) return 0;
  const totalMinutes =
    typeof durationOrMinutes === "number"
      ? durationOrMinutes
      : parseRuntimeToMinutes(durationOrMinutes);

  if (totalMinutes <= 0) return 0;
  return Math.floor((totalMinutes * 60 * progress) / 100);
}

export function formatTimeLeft(
  progressPercent: number | null | undefined,
  durationOrMinutes: string | number | null | undefined,
  progressSeconds?: number | null
): string {
  const totalMinutes =
    typeof durationOrMinutes === "number"
      ? durationOrMinutes
      : parseRuntimeToMinutes(durationOrMinutes);

  if (totalMinutes > 0) {
    const totalSeconds = totalMinutes * 60;
    const watchedSeconds =
      progressSeconds && progressSeconds > 0
        ? progressSeconds
        : Math.floor((totalSeconds * (progressPercent || 0)) / 100);
    const leftSeconds = Math.max(0, totalSeconds - watchedSeconds);
    const leftMinutes = Math.round(leftSeconds / 60);

    if (leftMinutes <= 0) return "Finished";
    const hours = Math.floor(leftMinutes / 60);
    const remainingMins = leftMinutes % 60;

    if (hours > 0 && remainingMins > 0) {
      return `${hours}hr ${remainingMins}m left`;
    }
    if (hours > 0) {
      return `${hours}hr left`;
    }
    return `${remainingMins}m left`;
  }

  if (progressPercent && progressPercent > 0 && progressPercent < 100) {
    return `${Math.round(100 - progressPercent)}% left`;
  }

  return "";
}

export function toPlayerSeasons(
  seasons?: readonly (Season | PlayerSeason)[] | null
): PlayerSeason[] {
  if (!Array.isArray(seasons)) return [];
  return seasons
    .filter(
      (season): season is Season | PlayerSeason =>
        Boolean(
          season &&
          typeof season.seasonNumber === "number" &&
          season.seasonNumber > 0 &&
          typeof season.episodeCount === "number" &&
          season.episodeCount > 0
        )
    )
    .map((season) => ({
      seasonNumber: season.seasonNumber,
      name: season.name?.trim() || `Season ${season.seasonNumber}`,
      episodeCount: season.episodeCount,
      overview: season.overview ?? "",
    }))
    .sort((a, b) => a.seasonNumber - b.seasonNumber);
}
