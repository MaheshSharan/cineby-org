import type { GetServerSideProps } from "next";

import { logger } from "@/lib/logger";
import type { Genre, MediaSummary, MediaType } from "@/lib/tmdb";
import { discoverMovies, discoverTv, getGenres } from "@/lib/tmdb/server";

import { BrowseGrid } from "@/components/browse/BrowseGrid";
import { PageSeo } from "@/components/seo/PageSeo";

interface BrowsePageProps {
  mediaType: MediaType;
  genres: Genre[];
  initialItems: MediaSummary[];
}

const CATEGORY_SEO: Record<MediaType, { title: string; heading: string; description: string }> = {
  movie: {
    title: "Browse Movies & Popular Streaming Titles | Cineby",
    heading: "Browse Movies",
    description: "Browse popular movies by genre and find your next movie to watch on Cineby.",
  },
  tv: {
    title: "Browse TV Shows & Streaming Series | Cineby",
    heading: "Browse TV Shows",
    description: "Browse popular TV shows by genre and find your next series to watch on Cineby.",
  },
};

export default function BrowsePage({ mediaType, genres, initialItems }: BrowsePageProps) {
  const { title, heading, description } = CATEGORY_SEO[mediaType];

  return (
    <>
      <PageSeo
        title={title}
        description={description}
        path={`/browse/${mediaType}`}
      />
      <h1 className="sr-only">{heading}</h1>

      <BrowseGrid mediaType={mediaType} genres={genres} initialItems={initialItems} />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<BrowsePageProps> = async (context) => {
  const category = context.params?.category;

  if (category !== "movie" && category !== "tv") {
    return { notFound: true };
  }

  const mediaType: MediaType = category;

  try {
    context.res.setHeader(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400"
    );

    const [genreList, initial] = await Promise.all([
      getGenres(mediaType),
      mediaType === "tv"
        ? discoverTv({ sortBy: "popularity.desc", page: 1 })
        : discoverMovies({ sortBy: "popularity.desc", page: 1 }),
    ]);

    return {
      props: {
        mediaType,
        genres: genreList.genres,
        initialItems: initial.results,
      },
    };
  } catch (error) {
    // An upstream outage must surface as a 5xx; a 404 would make search engines drop the page.
    logger.error("[browse] Failed to load browse page data", error);
    throw error;
  }
};
