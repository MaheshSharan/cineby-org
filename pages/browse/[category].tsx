import type { GetServerSideProps } from "next";

import { cacheControl } from "@/lib/cache/profiles";
import { logger } from "@/lib/logger";
import type { Genre, MediaSummary, MediaType } from "@/lib/tmdb";
import { getBrowsePage, getGenres } from "@/lib/tmdb/server";

import { BrowseGrid } from "@/components/browse/BrowseGrid";
import { PageSeo } from "@/components/seo/PageSeo";
import { buildCategoryBreadcrumbJsonLd, sanitizeJsonLd } from "@/lib/seo/jsonLd";

interface BrowsePageProps {
  mediaType: MediaType;
  genres: Genre[];
  initialItems: MediaSummary[];
  initialTotalPages: number;
  initialKeywords?: string | null;
}

const CATEGORY_SEO: Record<MediaType, { title: string; heading: string; description: string }> = {
  movie: {
    title: "Browse Movies | Cineby",
    heading: "Browse Movies",
    description: "Explore popular movies by genre, ratings, and release year on Cineby.",
  },
  tv: {
    title: "Browse TV Shows | Cineby",
    heading: "Browse TV Shows",
    description: "Explore popular TV shows and series by genre, ratings, and seasons on Cineby.",
  },
};

export default function BrowsePage({
  mediaType,
  genres,
  initialItems,
  initialTotalPages,
  initialKeywords,
}: BrowsePageProps) {
  const isChristmas = initialKeywords === "207317";
  const defaultSeo = CATEGORY_SEO[mediaType];
  const title = isChristmas
    ? mediaType === "tv"
      ? "Christmas TV Shows & Holiday Specials | Cineby"
      : "Christmas Movies & Holiday Films | Cineby"
    : defaultSeo.title;
  const heading = isChristmas
    ? mediaType === "tv"
      ? "Christmas TV Shows"
      : "Christmas Movies"
    : defaultSeo.heading;
  const description = isChristmas
    ? `Explore holiday ${mediaType === "tv" ? "TV shows" : "movies"}, family classics, and Christmas specials on Cineby.`
    : defaultSeo.description;

  return (
    <>
      <PageSeo
        title={title}
        description={description}
        path={`/browse/${mediaType}${initialKeywords ? `?keywords=${initialKeywords}` : ""}`}
        jsonLd={sanitizeJsonLd(buildCategoryBreadcrumbJsonLd(mediaType))}
      />
      <h1 className="sr-only">{heading}</h1>

      <BrowseGrid
        mediaType={mediaType}
        genres={genres}
        initialItems={initialItems}
        initialTotalPages={initialTotalPages}
        initialKeywords={initialKeywords}
      />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<BrowsePageProps> = async (context) => {
  const category = context.params?.category;

  if (category !== "movie" && category !== "tv") {
    return { notFound: true };
  }

  const mediaType: MediaType = category;
  const keywords = typeof context.query.keywords === "string" ? context.query.keywords : undefined;

  try {
    context.res.setHeader("Cache-Control", cacheControl("page"));

    const [genreList, initial] = await Promise.all([
      getGenres(mediaType),
      getBrowsePage({ mediaType, sortBy: "popularity.desc", page: 1, withKeywords: keywords }),
    ]);

    return {
      props: {
        mediaType,
        genres: genreList.genres,
        initialItems: initial.results,
        initialTotalPages: initial.totalPages,
        initialKeywords: keywords ?? null,
      },
    };
  } catch (error) {
    // An upstream outage must surface as a 5xx; a 404 would make search engines drop the page.
    logger.error("[browse] Failed to load browse page data", error);
    throw error;
  }
};
