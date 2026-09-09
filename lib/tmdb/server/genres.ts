import type { GenreList, MediaType } from "../types";
import { tmdbGet } from "./client";
import { getTmdbConfig } from "./config";
import { toGenreList } from "./transform";
import { validateGenreList } from "./validate";
import { cachedFetch, TMDB_TTL_SECONDS, tmdbCacheKeys } from "@/lib/cache";

export async function getGenres(mediaType: MediaType): Promise<GenreList> {
  return cachedFetch({
    key: tmdbCacheKeys.genres(mediaType),
    ttlSeconds: TMDB_TTL_SECONDS.genres,
    fetcher: async () => {
      const { defaultLanguage } = getTmdbConfig();

      const raw = await tmdbGet<unknown>({
        path: `/genre/${mediaType}/list`,
        params: { language: defaultLanguage },
      });

      return toGenreList(validateGenreList(raw));
    },
  });
}