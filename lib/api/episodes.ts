import type { SeasonEpisodes } from "@/lib/tmdb";
import { ApiError, getJson } from "@/lib/api/client";

export { ApiError as EpisodeApiError };

export async function getSeasonEpisodes(
  tvId: number,
  seasonNumber: number
): Promise<SeasonEpisodes> {
  return getJson<SeasonEpisodes>(`/api/tmdb/tv/${tvId}/season/${seasonNumber}`);
}
