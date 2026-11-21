import type { MediaSummary, MediaType, Paginated } from "@/lib/tmdb";
import { ApiError, getJson } from "@/lib/api/client";

interface ResultsResponse {
  results?: MediaSummary[];
}

interface LogoResponse {
  logoPath?: string | null;
}

function toResults(data: ResultsResponse): MediaSummary[] {
  return Array.isArray(data.results) ? data.results : [];
}

/** Items for a home page row, given the row's own API URL. Returns nothing instead of throwing. */
export async function getRowItems(rowUrl: string): Promise<MediaSummary[]> {
  try {
    return toResults(await getJson<ResultsResponse>(rowUrl));
  } catch (error) {
    if (error instanceof ApiError) return [];
    throw error;
  }
}

export function getWeeklyTrending(): Promise<MediaSummary[]> {
  return getRowItems("/api/tmdb/trending?mediaType=all&timeWindow=week");
}

export function getProviderTitles(providerId: number | string): Promise<MediaSummary[]> {
  return getRowItems(`/api/discover/provider?providerId=${providerId}`);
}

export async function getMediaLogoPath(mediaType: MediaType, id: number | string): Promise<string | null> {
  try {
    const data = await getJson<LogoResponse>(`/api/tmdb/logo?mediaType=${mediaType}&id=${id}`);
    return data.logoPath ?? null;
  } catch (error) {
    if (error instanceof ApiError) return null;
    throw error;
  }
}

export function browseMedia(params: URLSearchParams): Promise<Paginated<MediaSummary>> {
  return getJson<Paginated<MediaSummary>>(`/api/tmdb/browse?${params.toString()}`);
}
