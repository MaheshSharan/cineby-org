import type { MediaSummary, MediaType } from "@/lib/tmdb";
import { getTrending } from "@/lib/tmdb/server/trending";
import { discoverMovies, discoverTv, getUpcomingMedia } from "@/lib/tmdb/server/discover";
import { getPopularMovies } from "@/lib/tmdb/server/movies";
import { getPopularTv } from "@/lib/tmdb/server/tv";
import { appCacheKeys, cachedFetch } from "@/lib/cache";
import { logger } from "@/lib/logger";

const MAX_PAGES = 10; // 10 pages * 20 items = 200 items per feed

/**
 * Fetches and deduplicates titles across multiple TMDB discovery feeds:
 * 1. Trending (day)
 * 2. Trending (week)
 * 3. Popular
 * 4. Top Rated / High Engagement Discover
 *
 * All results are passed through an in-memory Set<number>() to strictly guarantee
 * no duplicate IDs ever enter the sitemap.
 */
export async function getSitemapMediaCatalog(
  mediaType: MediaType,
  maxPages = MAX_PAGES
): Promise<MediaSummary[]> {
  const cacheKey = appCacheKeys.sitemapCatalog(mediaType);

  return cachedFetch({
    key: cacheKey,
    profile: "sitemap",
    fetcher: async () => {
      const uniqueIds = new Set<number>();
      const collected: MediaSummary[] = [];

      const addItem = (item: MediaSummary) => {
        if (!item || !item.id || !item.title) return;
        if (!uniqueIds.has(item.id)) {
          uniqueIds.add(item.id);
          collected.push(item);
        }
      };

      // 1. Fetch Trending (Day & Week)
      for (const window of ["day", "week"] as const) {
        for (let p = 1; p <= Math.min(maxPages, 5); p++) {
          try {
            const res = await getTrending(mediaType, window, p);
            for (const item of res.results) {
              addItem(item);
            }
          } catch (err) {
            logger.warn(`[sitemap] Error fetching trending ${mediaType} ${window} p${p}`, {
              error: err instanceof Error ? err.message : String(err),
            });
            break;
          }
        }
      }

      // 2. Fetch Popular
      for (let p = 1; p <= maxPages; p++) {
        try {
          const res = mediaType === "movie" ? await getPopularMovies(p) : await getPopularTv(p);
          for (const item of res.results) {
            addItem(item);
          }
        } catch (err) {
          logger.warn(`[sitemap] Error fetching popular ${mediaType} p${p}`, {
            error: err instanceof Error ? err.message : String(err),
          });
          break;
        }
      }

      // 3. Discover (Sort by Popularity / Vote Average)
      for (let p = 1; p <= maxPages; p++) {
        try {
          const res =
            mediaType === "movie"
              ? await discoverMovies({ sortBy: "popularity.desc", page: p, voteCountGte: 50 })
              : await discoverTv({ sortBy: "popularity.desc", page: p, voteCountGte: 50 });

          for (const item of res.results) {
            addItem(item);
          }
        } catch (err) {
          logger.warn(`[sitemap] Error discovering ${mediaType} p${p}`, {
            error: err instanceof Error ? err.message : String(err),
          });
          break;
        }
      }

      // 4. Anticipatory Pre-Release Indexation: Upcoming Releases (Next 35 days)
      for (let p = 1; p <= Math.min(maxPages, 5); p++) {
        try {
          const res = await getUpcomingMedia({ mediaType, daysAhead: 35, page: p });
          for (const item of res.results) {
            addItem(item);
          }
        } catch (err) {
          logger.warn(`[sitemap] Error fetching upcoming pre-release ${mediaType} p${p}`, {
            error: err instanceof Error ? err.message : String(err),
          });
          break;
        }
      }

      logger.info(`[sitemap] Compiled ${collected.length} unique ${mediaType} entries for sitemap.`);
      return collected;
    },
  });
}
