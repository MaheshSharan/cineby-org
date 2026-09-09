import type { MediaType } from "@/lib/tmdb";

export function getYear(dateString: string | null): string {
  if (!dateString) {
    return "";
  }

  return dateString.slice(0, 4);
}

export function getMediaHref(mediaType: MediaType, id: number): string {
  return mediaType === "tv" ? `/tv/${id}` : `/movie/${id}`;
}

export function getPlayHref(mediaType: MediaType, id: number, timeSeconds?: number | null): string {
  const base = `${getMediaHref(mediaType, id)}?play=true`;
  return timeSeconds && timeSeconds > 0 ? `${base}&t=${Math.floor(timeSeconds)}` : base;
}

export function getEpisodeHref(
  id: number,
  seasonNumber: number,
  episodeNumber: number,
  timeSeconds?: number | null
): string {
  const base = `/tv/${id}/${seasonNumber}/${episodeNumber}?play=true`;
  return timeSeconds && timeSeconds > 0 ? `${base}&t=${Math.floor(timeSeconds)}` : base;
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