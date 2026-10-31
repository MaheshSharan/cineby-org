import { useMemo, useState } from "react";
import type { GetServerSideProps } from "next";
import Link from "next/link";

import type { MediaSummary } from "@/lib/tmdb";
import { deduplicateMediaPool, getMediaKey } from "@/lib/tmdb/deduplicate";
import {
  discoverMovies,
  discoverTv,
  getGenres,
  getMediaLogo,
  getTopRatedMovies,
  getTopRatedTv,
  getTrending,
} from "@/lib/tmdb/server";
import { getHeroPicksMedia } from "@/lib/tmdb/server/heroPicks";

import { BrowseByProviderRow } from "@/components/home/BrowseByProviderRow";
import { ContinueWatchingRow } from "@/components/home/ContinueWatchingRow";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { LazyContentRow } from "@/components/home/LazyContentRow";
import { OnlyOnRow } from "@/components/home/OnlyOnRow";
import { TopTenRow } from "@/components/home/TopTenRow";
import { NativeBannerAd } from "@/components/ads/NativeBannerAd";
import { PageSeo } from "@/components/seo/PageSeo";
import { buildSiteNavigationJsonLd, buildWebSiteJsonLd, sanitizeJsonLd } from "@/lib/seo/jsonLd";

const HERO_ITEMS = 12;
const ROW_ITEMS = 20;
const ANIMATION_GENRE_ID = 16;

interface HomePageProps {
  heroItems: MediaSummary[];
  trendingMovies: MediaSummary[];
  genreNames: Record<number, string>;
  topTenItems?: MediaSummary[];
  onlyOnNetflix?: MediaSummary[];
  trendingSeries?: MediaSummary[];
  topRatedMovies?: MediaSummary[];
  topRatedSeries?: MediaSummary[];
}

export default function Home({
  heroItems,
  topTenItems,
  onlyOnNetflix,
  trendingMovies,
  trendingSeries,
  topRatedMovies,
  topRatedSeries,
  genreNames,
}: HomePageProps) {
  const [activeProviderId, setActiveProviderId] = useState<number>(8);

  const excludeKeys = useMemo(() => {
    const keys: string[] = [];
    const collect = (items?: MediaSummary[]) => {
      if (!items) return;
      for (const item of items) {
        keys.push(getMediaKey(item));
      }
    };
    collect(heroItems);
    collect(trendingMovies);
    collect(topTenItems);
    collect(trendingSeries);
    collect(topRatedMovies);
    collect(topRatedSeries);
    return keys;
  }, [heroItems, trendingMovies, topTenItems, trendingSeries, topRatedMovies, topRatedSeries]);

  const viewAllMovieLink = (
    <Link
      href="/browse/movie"
      className="flex items-center gap-1 text-sm font-medium text-white/50 hover:text-white transition-colors duration-200"
    >
      <span>View All</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
    </Link>
  );

  const viewAllTvLink = (
    <Link
      href="/browse/tv"
      className="flex items-center gap-1 text-sm font-medium text-white/50 hover:text-white transition-colors duration-200"
    >
      <span>View All</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
    </Link>
  );

  return (
    <>
      <PageSeo
        title="Cineby: Watch Free Movies & TV Shows Online | Streaming Platform"
        description="Watch free movies and TV shows online. Browse trending titles, top-rated series and popular streaming providers, and keep your own watchlist on Cineby."
        path="/"
        jsonLd={sanitizeJsonLd([buildWebSiteJsonLd(), buildSiteNavigationJsonLd()])}
      />

      <h1 className="sr-only">Cineby: Watch Free Movies & TV Shows Online</h1>

      <HeroCarousel items={heroItems} genreNames={genreNames} />

      <div className="relative z-10 mx-auto flex max-w-[1360px] flex-col gap-10 px-4 mt-1 sm:mt-2 md:mt-3 md:gap-14 pb-16">
        <ContinueWatchingRow />

        <LazyContentRow
          title="Trending Movies"
          initialItems={trendingMovies}
          action={viewAllMovieLink}
        />

        <BrowseByProviderRow onSelectProvider={(id) => setActiveProviderId(id)} />

        <LazyContentRow
          title="Trending Series"
          initialItems={trendingSeries}
          fetchUrl="/api/tmdb/trending?mediaType=tv&timeWindow=day"
          action={viewAllTvLink}
        />

        <NativeBannerAd className="my-2" />

        <TopTenRow items={topTenItems} />

        <OnlyOnRow
          initialItems={onlyOnNetflix}
          activeProviderId={activeProviderId}
          excludeMediaKeys={excludeKeys}
          onProviderChange={(id) => setActiveProviderId(id)}
        />

        <LazyContentRow
          title="Top Rated Movies"
          initialItems={topRatedMovies}
          fetchUrl="/api/tmdb/browse?mediaType=movie&sortBy=vote_average.desc"
        />

        <LazyContentRow
          title="Top Rated Series"
          initialItems={topRatedSeries}
          fetchUrl="/api/tmdb/browse?mediaType=tv&sortBy=vote_average.desc"
        />
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<HomePageProps> = async ({ res }) => {
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");

  const emptyPaginated = { results: [], page: 1, totalPages: 1, totalResults: 0 };
  const safePaginated = <T extends { results: MediaSummary[] }>(p: Promise<T>): Promise<T> =>
    p.catch(() => emptyPaginated as unknown as T);
  const safeGenres = (p: Promise<{ genres: Array<{ id: number; name: string }> }>) =>
    p.catch(() => ({ genres: [] }));

  const [
    heroPicks,
    heroP1,
    heroP2,
    trendingMoviesP1,
    trendingMoviesP2,
    movieGenres,
    tvGenres,
    trendingSeriesP1,
    trendingSeriesP2,
    topTenWeek,
    topRatedMoviesData,
    topRatedSeriesData,
    netflixMovies,
    netflixTv,
  ] = await Promise.all([
    getHeroPicksMedia().catch(() => []),
    safePaginated(getTrending("all", "day", 1)),
    safePaginated(getTrending("all", "day", 2)),
    safePaginated(getTrending("movie", "day", 1)),
    safePaginated(getTrending("movie", "day", 2)),
    safeGenres(getGenres("movie")),
    safeGenres(getGenres("tv")),
    safePaginated(getTrending("tv", "day", 1)),
    safePaginated(getTrending("tv", "day", 2)),
    safePaginated(getTrending("all", "week", 1)),
    safePaginated(getTopRatedMovies(1)),
    safePaginated(getTopRatedTv(1)),
    safePaginated(discoverMovies({ providerId: 8, watchRegion: "US", sortBy: "popularity.desc", page: 1 })),
    safePaginated(discoverTv({ providerId: 8, watchRegion: "US", sortBy: "popularity.desc", page: 1 })),
  ]);

  const seenKeys = new Set<string>();

  // Filter out any Animation titles (TMDB genre ID 16) from the hero carousel pool
  const nonAnimatedHeroPool = [...heroPicks, ...heroP1.results, ...heroP2.results].filter(
    (item) => !item.genreIds || !item.genreIds.includes(ANIMATION_GENRE_ID)
  );
  const heroItems = deduplicateMediaPool(nonAnimatedHeroPool, seenKeys, HERO_ITEMS);

  const trendingMoviesPool = [...trendingMoviesP1.results, ...trendingMoviesP2.results];
  const trendingMovies = deduplicateMediaPool(trendingMoviesPool, seenKeys, ROW_ITEMS);

  const genreNames: Record<number, string> = {};
  for (const genre of movieGenres.genres) {
    genreNames[genre.id] = genre.name;
  }
  for (const genre of tvGenres.genres) {
    genreNames[genre.id] = genre.name;
  }

  const trendingSeriesPool = [...trendingSeriesP1.results, ...trendingSeriesP2.results];
  const trendingSeries = deduplicateMediaPool(trendingSeriesPool, seenKeys, ROW_ITEMS);

  const topTenRaw = topTenWeek.results.slice(0, 10);
  const topTenItems = await Promise.all(
    topTenRaw.map(async (item, idx) => {
      if (idx === 0) {
        return {
          ...item,
          logoPath: await getMediaLogo(item.mediaType, item.id).catch(() => null),
        };
      }
      return item;
    })
  );

  const netflixPool: MediaSummary[] = [];
  const maxNetLen = Math.max(netflixMovies.results.length, netflixTv.results.length);
  for (let i = 0; i < maxNetLen; i += 1) {
    if (i < netflixMovies.results.length) netflixPool.push(netflixMovies.results[i]);
    if (i < netflixTv.results.length) netflixPool.push(netflixTv.results[i]);
  }
  const onlyOnNetflix = deduplicateMediaPool(netflixPool, seenKeys, ROW_ITEMS);

  const topRatedMovies = deduplicateMediaPool(topRatedMoviesData.results, seenKeys, ROW_ITEMS);
  const topRatedSeries = deduplicateMediaPool(topRatedSeriesData.results, seenKeys, ROW_ITEMS);

  return {
    props: {
      heroItems: await Promise.all(
        heroItems.map(async (item) => ({
          ...item,
          logoPath: await getMediaLogo(item.mediaType, item.id),
        }))
      ),
      trendingMovies,
      trendingSeries,
      topTenItems,
      onlyOnNetflix,
      topRatedMovies,
      topRatedSeries,
      genreNames,
    },
  };
};