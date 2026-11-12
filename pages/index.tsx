import { useMemo, useState } from "react";
import type { GetServerSideProps } from "next";
import Link from "next/link";

import type { MediaSummary } from "@/lib/tmdb";
import { deduplicateMediaPool, getMediaKey } from "@/lib/tmdb/deduplicate";
import { toRowSummary } from "@/lib/tmdb/rowSummary";
import {
  discoverMovies,
  discoverTv,
  getGenres,
  getMediaImages,
  getMediaLogo,
  getTopRatedMovies,
  getTopRatedTv,
  getTrending,
} from "@/lib/tmdb/server";
import { getUpcomingMedia } from "@/lib/tmdb/server/discover";

import { BrowseByProviderRow } from "@/components/home/BrowseByProviderRow";
import { LiveSportsRow } from "@/components/sports/LiveSportsRow";
import { ContinueWatchingRow } from "@/components/home/ContinueWatchingRow";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { HeroPreload } from "@/components/home/HeroPreload";
import { LazyContentRow } from "@/components/home/LazyContentRow";
import { RenderWhenVisible } from "@/components/home/RenderWhenVisible";
import { OnlyOnRow } from "@/components/home/OnlyOnRow";
import { TopTenRow } from "@/components/home/TopTenRow";
import { UpcomingRow } from "@/components/home/UpcomingRow";
import { NativeBannerAd } from "@/components/ads/NativeBannerAd";
import { FaqSection } from "@/components/home/FaqSection";
import { SeoContentSection } from "@/components/home/SeoContentSection";
import { PageSeo } from "@/components/seo/PageSeo";
import {
  buildOrganizationJsonLd,
  buildSiteNavigationJsonLd,
  buildWebSiteJsonLd,
  sanitizeJsonLd,
} from "@/lib/seo/jsonLd";
import { buildFaqJsonLd } from "@/lib/seo/faqSchema";
import { getSiteHost } from "@/lib/seo/site";
import { cacheControl } from "@/lib/cache/profiles";

const HERO_ITEMS = 7;
const ROW_ITEMS = 20;
const ANIMATION_GENRE_ID = 16;
// About the height of a card row with its heading, used to hold space for rows that mount on scroll.
const ROW_PLACEHOLDER_HEIGHT = 340;

interface HomePageProps {
  heroItems: MediaSummary[];
  trendingMovies: MediaSummary[];
  genreNames: Record<number, string>;
  topTenItems?: MediaSummary[];
  onlyOnNetflix?: MediaSummary[];
  trendingSeries?: MediaSummary[];
  topRatedMovies?: MediaSummary[];
  topRatedSeries?: MediaSummary[];
  upcomingMovies?: MediaSummary[];
  upcomingTv?: MediaSummary[];
}

export default function Home({
  heroItems,
  topTenItems,
  onlyOnNetflix,
  trendingMovies,
  trendingSeries,
  topRatedMovies,
  topRatedSeries,
  upcomingMovies = [],
  upcomingTv = [],
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
        title="Cineby - Official Site | Watch Free Movies & TV Shows Online"
        description={`Cineby is back at ${getSiteHost()}, its official home. Stream movies and TV shows online free with no sign up, on phones, tablets, TVs and computers.`}
        path="/"
        jsonLd={sanitizeJsonLd([
          buildOrganizationJsonLd(),
          buildWebSiteJsonLd(),
          buildSiteNavigationJsonLd(),
          buildFaqJsonLd(),
        ])}
      />

      <h1 className="sr-only">Cineby - Watch Free Movies & TV Shows Online with No Sign Up</h1>

      <HeroPreload item={heroItems[0]} />
      <HeroCarousel items={heroItems} genreNames={genreNames} />

      <div className="page-shell relative z-10 flex max-w-[1360px] flex-col gap-10 px-4 mt-1 sm:mt-2 md:mt-3 md:gap-14 pb-16">
        <ContinueWatchingRow />

        <BrowseByProviderRow onSelectProvider={(id) => setActiveProviderId(id)} />
        <LiveSportsRow />

        <NativeBannerAd className="my-2" />

        <TopTenRow items={topTenItems} />

        {/* The first row below the fold stays in the server HTML; the browser skips its paint until it scrolls near. */}
        <div className="defer-render-row">
          <LazyContentRow
            title="Trending Movies"
            initialItems={trendingMovies}
            action={viewAllMovieLink}
          />
        </div>

        {/* The rows after it mount only when they are about to scroll into view, which keeps them out of the first hydration. */}
        <RenderWhenVisible placeholderHeight={ROW_PLACEHOLDER_HEIGHT}>
          <LazyContentRow
            title="Trending Series"
            initialItems={trendingSeries}
            fetchUrl="/api/tmdb/trending?mediaType=tv&timeWindow=day"
            action={viewAllTvLink}
          />
        </RenderWhenVisible>

        <RenderWhenVisible placeholderHeight={ROW_PLACEHOLDER_HEIGHT}>
          <OnlyOnRow
            initialItems={onlyOnNetflix}
            activeProviderId={activeProviderId}
            excludeMediaKeys={excludeKeys}
            onProviderChange={(id) => setActiveProviderId(id)}
          />
        </RenderWhenVisible>

        <RenderWhenVisible placeholderHeight={ROW_PLACEHOLDER_HEIGHT}>
          <UpcomingRow movies={upcomingMovies} tv={upcomingTv} />
        </RenderWhenVisible>

        <RenderWhenVisible placeholderHeight={ROW_PLACEHOLDER_HEIGHT}>
          <LazyContentRow
            title="Top Rated Movies"
            initialItems={topRatedMovies}
            fetchUrl="/api/tmdb/browse?mediaType=movie&sortBy=vote_average.desc"
          />
        </RenderWhenVisible>

        <RenderWhenVisible placeholderHeight={ROW_PLACEHOLDER_HEIGHT}>
          <LazyContentRow
            title="Top Rated Series"
            initialItems={topRatedSeries}
            fetchUrl="/api/tmdb/browse?mediaType=tv&sortBy=vote_average.desc"
          />
        </RenderWhenVisible>

        <div className="defer-render-section">
          <FaqSection />
        </div>

        <div className="defer-render-section">
          <SeoContentSection />
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<HomePageProps> = async ({ res }) => {
  res.setHeader("Cache-Control", cacheControl("home"));

  const emptyPaginated = { results: [], page: 1, totalPages: 1, totalResults: 0 };
  const safePaginated = <T extends { results: MediaSummary[] }>(p: Promise<T>): Promise<T> =>
    p.catch(() => emptyPaginated as unknown as T);
  const safeGenres = (p: Promise<{ genres: Array<{ id: number; name: string }> }>) =>
    p.catch(() => ({ genres: [] }));

  const [
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
    upcomingMoviesData,
    upcomingTvData,
  ] = await Promise.all([
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
    safePaginated(getUpcomingMedia({ mediaType: "movie", daysAhead: 35, page: 1 })),
    safePaginated(getUpcomingMedia({ mediaType: "tv", daysAhead: 35, page: 1 })),
  ]);

  const seenKeys = new Set<string>();

  // Filter out any Animation titles (TMDB genre ID 16) and unreleased titles from the hero carousel pool
  const todayIso = new Date().toISOString().slice(0, 10);
  const eligibleHeroPool = [...heroP1.results, ...heroP2.results].filter((item) => {
    // 1. Exclude animation
    if (item.genreIds && item.genreIds.includes(ANIMATION_GENRE_ID)) return false;
    // 2. Exclude unreleased titles (must have a valid release date <= today)
    if (!item.releaseDate || item.releaseDate > todayIso) return false;
    return true;
  });
  const heroItems = deduplicateMediaPool(eligibleHeroPool, seenKeys, HERO_ITEMS);

  const trendingMoviesPool = [...trendingMoviesP1.results, ...trendingMoviesP2.results];
  const trendingMovies = deduplicateMediaPool(trendingMoviesPool, seenKeys, ROW_ITEMS).map(toRowSummary);

  const genreNames: Record<number, string> = {};
  for (const genre of movieGenres.genres) {
    genreNames[genre.id] = genre.name;
  }
  for (const genre of tvGenres.genres) {
    genreNames[genre.id] = genre.name;
  }

  const trendingSeriesPool = [...trendingSeriesP1.results, ...trendingSeriesP2.results];
  const trendingSeries = deduplicateMediaPool(trendingSeriesPool, seenKeys, ROW_ITEMS).map(toRowSummary);

  // Only the number one card shows an overview and a logo; the other nine are plain poster cards.
  const topTenRaw = topTenWeek.results.slice(0, 10);
  const topTenPromise = Promise.all(
    topTenRaw.map(async (item, idx) => {
      if (idx === 0) {
        return {
          ...item,
          logoPath: await getMediaLogo(item.mediaType, item.id).catch(() => null),
        };
      }
      return toRowSummary(item);
    })
  );

  const netflixPool: MediaSummary[] = [];
  const maxNetLen = Math.max(netflixMovies.results.length, netflixTv.results.length);
  for (let i = 0; i < maxNetLen; i += 1) {
    if (i < netflixMovies.results.length) netflixPool.push(netflixMovies.results[i]);
    if (i < netflixTv.results.length) netflixPool.push(netflixTv.results[i]);
  }
  const onlyOnNetflix = deduplicateMediaPool(netflixPool, seenKeys, ROW_ITEMS).map(toRowSummary);

  const topRatedMovies = deduplicateMediaPool(topRatedMoviesData.results, seenKeys, ROW_ITEMS).map(toRowSummary);
  const topRatedSeries = deduplicateMediaPool(topRatedSeriesData.results, seenKeys, ROW_ITEMS).map(toRowSummary);
  const upcomingMovies = deduplicateMediaPool(upcomingMoviesData.results, seenKeys, ROW_ITEMS).map(toRowSummary);
  const upcomingTv = deduplicateMediaPool(upcomingTvData.results, seenKeys, ROW_ITEMS).map(toRowSummary);

  // The hero artwork and the top-ten logo are independent, so they are fetched together.
  const [heroItemsWithImages, topTenItems] = await Promise.all([
    Promise.all(
      heroItems.map(async (item) => {
        const images = await getMediaImages(item.mediaType, item.id);
        return { ...item, logoPath: images.logoPath, heroPosterPath: images.textlessPosterPath };
      })
    ),
    topTenPromise,
  ]);

  return {
    props: {
      heroItems: heroItemsWithImages,
      trendingMovies,
      trendingSeries,
      topTenItems,
      onlyOnNetflix,
      topRatedMovies,
      topRatedSeries,
      upcomingMovies,
      upcomingTv,
      genreNames,
    },
  };
};