import { useMemo, useState } from "react";
import type { GetServerSideProps, NextPage } from "next";
import Head from "next/head";
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

import { BrowseByProviderRow } from "@/components/home/BrowseByProviderRow";
import { ContinueWatchingRow } from "@/components/home/ContinueWatchingRow";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { LazyContentRow } from "@/components/home/LazyContentRow";
import { OnlyOnRow } from "@/components/home/OnlyOnRow";
import { TopTenRow } from "@/components/home/TopTenRow";

const HERO_ITEMS = 12;
const TOP_TEN_ITEMS = 10;
const ROW_ITEMS = 20;

interface HomePageProps {
  heroItems: MediaSummary[];
  topTenItems: MediaSummary[];
  onlyOnNetflix: MediaSummary[];
  trendingMovies: MediaSummary[];
  trendingSeries: MediaSummary[];
  topRatedMovies: MediaSummary[];
  topRatedSeries: MediaSummary[];
  genreNames: Record<number, string>;
}

const Home: NextPage<HomePageProps> = ({
  heroItems,
  topTenItems,
  onlyOnNetflix,
  trendingMovies,
  trendingSeries,
  topRatedMovies,
  topRatedSeries,
  genreNames,
}) => {
  const [activeProviderId, setActiveProviderId] = useState<number>(8);

  const excludeKeys = useMemo(() => {
    const keys: string[] = [];
    const collect = (items: MediaSummary[]) => {
      for (const item of items) {
        keys.push(getMediaKey(item));
      }
    };
    collect(heroItems);
    collect(trendingMovies);
    collect(trendingSeries);
    collect(topTenItems);
    collect(topRatedMovies);
    collect(topRatedSeries);
    return keys;
  }, [heroItems, trendingMovies, trendingSeries, topTenItems, topRatedMovies, topRatedSeries]);

  const viewAllMovieLink = (
    <Link
      href="/category/movie/trending"
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
      href="/category/tv/trending"
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

        <BrowseByProviderRow onSelectProvider={(id) => setActiveProviderId(id)} />

        <LazyContentRow
          title="Trending Movies"
          initialItems={trendingMovies}
          action={viewAllMovieLink}
        />

        <LazyContentRow
          title="Trending Series"
          initialItems={trendingSeries}
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
        />

        <LazyContentRow
          title="Top Rated Series"
          initialItems={topRatedSeries}
        />
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<HomePageProps> = async () => {
  const [
    heroP1,
    heroP2,
    topTenP1,
    topTenP2,
    trendingMoviesP1,
    trendingMoviesP2,
    trendingSeriesP1,
    trendingSeriesP2,
    netflixMoviesP1,
    netflixMoviesP2,
    netflixTvP1,
    netflixTvP2,
    topRatedMoviesP1,
    topRatedMoviesP2,
    topRatedTvP1,
    topRatedTvP2,
    movieGenres,
    tvGenres,
  ] = await Promise.all([
    getTrending("all", "day", 1),
    getTrending("all", "day", 2),
    getTrending("all", "week", 1),
    getTrending("all", "week", 2),
    getTrending("movie", "day", 1),
    getTrending("movie", "day", 2),
    getTrending("tv", "day", 1),
    getTrending("tv", "day", 2),
    discoverMovies({ providerId: 8, watchRegion: "US", sortBy: "popularity.desc", page: 1 }),
    discoverMovies({ providerId: 8, watchRegion: "US", sortBy: "popularity.desc", page: 2 }),
    discoverTv({ providerId: 8, watchRegion: "US", sortBy: "popularity.desc", page: 1 }),
    discoverTv({ providerId: 8, watchRegion: "US", sortBy: "popularity.desc", page: 2 }),
    getTopRatedMovies(1),
    getTopRatedMovies(2),
    getTopRatedTv(1),
    getTopRatedTv(2),
    getGenres("movie"),
    getGenres("tv"),
  ]);

  const seenKeys = new Set<string>();

  const heroPool = [...heroP1.results, ...heroP2.results];
  const heroItems = deduplicateMediaPool(heroPool, seenKeys, HERO_ITEMS);

  const trendingMoviesPool = [...trendingMoviesP1.results, ...trendingMoviesP2.results];
  const trendingMovies = deduplicateMediaPool(trendingMoviesPool, seenKeys, ROW_ITEMS);

  const trendingSeriesPool = [...trendingSeriesP1.results, ...trendingSeriesP2.results];
  const trendingSeries = deduplicateMediaPool(trendingSeriesPool, seenKeys, ROW_ITEMS);

  const topTenPool = [...topTenP1.results, ...topTenP2.results];
  const topTenItems = deduplicateMediaPool(topTenPool, seenKeys, TOP_TEN_ITEMS);

  // Interleave Netflix movies & TV shows
  const netflixPool: MediaSummary[] = [];
  const allNetflixMovies = [...netflixMoviesP1.results, ...netflixMoviesP2.results];
  const allNetflixTv = [...netflixTvP1.results, ...netflixTvP2.results];
  const maxNetflixLen = Math.max(allNetflixMovies.length, allNetflixTv.length);
  for (let i = 0; i < maxNetflixLen; i += 1) {
    if (i < allNetflixMovies.length) netflixPool.push(allNetflixMovies[i]);
    if (i < allNetflixTv.length) netflixPool.push(allNetflixTv[i]);
  }
  const onlyOnNetflix = deduplicateMediaPool(netflixPool, seenKeys, ROW_ITEMS);

  const topRatedMoviesPool = [...topRatedMoviesP1.results, ...topRatedMoviesP2.results];
  const topRatedMovies = deduplicateMediaPool(topRatedMoviesPool, seenKeys, ROW_ITEMS);

  const topRatedSeriesPool = [...topRatedTvP1.results, ...topRatedTvP2.results];
  const topRatedSeries = deduplicateMediaPool(topRatedSeriesPool, seenKeys, ROW_ITEMS);

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
      topTenItems,
      onlyOnNetflix,
      trendingMovies,
      trendingSeries,
      topRatedMovies,
      topRatedSeries,
      genreNames,
    },
  };
};

export default Home;