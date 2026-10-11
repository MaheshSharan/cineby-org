import { useMemo, useState } from "react";
import type { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";

import type { MediaSummary } from "@/lib/tmdb";
import { deduplicateMediaPool, getMediaKey } from "@/lib/tmdb/deduplicate";
import {
  getGenres,
  getMediaLogo,
  getTrending,
} from "@/lib/tmdb/server";

import { BrowseByProviderRow } from "@/components/home/BrowseByProviderRow";
import { ContinueWatchingRow } from "@/components/home/ContinueWatchingRow";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { LazyContentRow } from "@/components/home/LazyContentRow";
import { OnlyOnRow } from "@/components/home/OnlyOnRow";
import { TopTenRow } from "@/components/home/TopTenRow";

const HERO_ITEMS = 12;
const ROW_ITEMS = 20;

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
      <Head>
        <title>Cineby - Watch Free Movies & TV Shows Online</title>
        <meta
          name="description"
          content="Watch free movies and TV shows online."
        />
      </Head>

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

  const [
    heroP1,
    heroP2,
    trendingMoviesP1,
    trendingMoviesP2,
    movieGenres,
    tvGenres,
  ] = await Promise.all([
    getTrending("all", "day", 1),
    getTrending("all", "day", 2),
    getTrending("movie", "day", 1),
    getTrending("movie", "day", 2),
    getGenres("movie"),
    getGenres("tv"),
  ]);

  const seenKeys = new Set<string>();

  const heroPool = [...heroP1.results, ...heroP2.results];
  const heroItems = deduplicateMediaPool(heroPool, seenKeys, HERO_ITEMS);

  const trendingMoviesPool = [...trendingMoviesP1.results, ...trendingMoviesP2.results];
  const trendingMovies = deduplicateMediaPool(trendingMoviesPool, seenKeys, ROW_ITEMS);

  const genreNames: Record<number, string> = {};
  for (const genre of movieGenres.genres) {
    genreNames[genre.id] = genre.name;
  }
  for (const genre of tvGenres.genres) {
    genreNames[genre.id] = genre.name;
  }

  return {
    props: {
      heroItems: await Promise.all(
        heroItems.map(async (item) => ({
          ...item,
          logoPath: await getMediaLogo(item.mediaType, item.id),
        }))
      ),
      trendingMovies,
      genreNames,
    },
  };
};