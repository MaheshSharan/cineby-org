import type { MediaSummary, Paginated } from "../types";
import { withoutTakenDown } from "@/lib/takedowns";
import { tmdbGet } from "./client";
import { getTmdbConfig } from "./config";
import { toMediaSummary } from "./transform";
import { validateSearchMulti } from "./validate";
import { cachedFetch, tmdbCacheKeys } from "@/lib/cache";

export async function searchMulti(query: string, page = 1): Promise<Paginated<MediaSummary>> {
  return cachedFetch({
    key: tmdbCacheKeys.search(query, page),
    profile: "search",
    fetcher: async () => {
      const { defaultLanguage } = getTmdbConfig();

      const raw = await tmdbGet<unknown>({
        path: "/search/multi",
        params: { query, page, language: defaultLanguage },
      });

      const { items, page: resultPage, totalPages, totalResults } = validateSearchMulti(raw);

      return {
        page: resultPage,
        results: withoutTakenDown(items.map((item) => toMediaSummary(item.record, item.mediaType))),
        totalPages,
        totalResults,
      };
    },
  });
}