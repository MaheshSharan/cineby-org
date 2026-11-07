import type { GetServerSideProps } from "next";

import { PUBLIC_PAGE_CACHE_CONTROL } from "@/lib/http/cacheControl";
import { logger } from "@/lib/logger";
import {
  buildMediaDescription,
  buildMediaTitle,
  getMediaOpenGraphImage,
} from "@/lib/seo/media";
import type { MovieDetails } from "@/lib/tmdb";
import { getMovieDetails, isTmdbNotFoundError } from "@/lib/tmdb/server";
import { getMediaHref } from "@/lib/utils/media";
import { extractIdFromSlug, getCanonicalSlugRedirect } from "@/lib/utils/slug";
import { fetchTrailerUrlServer } from "@/lib/services/trailer.server";

import { DetailPage } from "@/components/detail/DetailPage";
import { PageSeo } from "@/components/seo/PageSeo";

interface MoviePageProps {
  details: MovieDetails;
  isPlaying: boolean;
  initialTrailerUrl?: string | null;
}

import { buildBreadcrumbJsonLd, buildMovieJsonLd, sanitizeJsonLd } from "@/lib/seo/jsonLd";

export default function MoviePage({ details, isPlaying, initialTrailerUrl }: MoviePageProps) {
  const schemas = [
    buildBreadcrumbJsonLd("movie", details.title, details.id),
    buildMovieJsonLd(details),
  ];
  const ogImage = getMediaOpenGraphImage(details);

  return (
    <>
      <PageSeo
        title={buildMediaTitle(details)}
        description={buildMediaDescription(details)}
        path={getMediaHref("movie", details.id, details.title)}
        imageUrl={ogImage?.url}
        imageWidth={ogImage?.width}
        imageHeight={ogImage?.height}
        openGraphType="video.movie"
        jsonLd={sanitizeJsonLd(schemas)}
      />
      <DetailPage
        details={details}
        isPlaying={isPlaying}
        initialTrailerUrl={initialTrailerUrl}
      />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<MoviePageProps> = async (context) => {
  const param = context.params?.params?.[0];
  const id = extractIdFromSlug(param);

  if (!id) {
    return { notFound: true };
  }

  try {
    if (context.query.play !== "true") {
      context.res.setHeader("Cache-Control", PUBLIC_PAGE_CACHE_CONTROL);
    }

    const details = await getMovieDetails(id);

    const redirect = getCanonicalSlugRedirect(
      `/movie/${param}`,
      getMediaHref("movie", details.id, details.title),
      context.resolvedUrl
    );
    if (redirect) {
      return { redirect };
    }

    const initialTrailerUrl = details.imdbId
      ? await fetchTrailerUrlServer(details.imdbId).catch(() => null)
      : null;

    return {
      props: {
        details,
        isPlaying: context.query.play === "true",
        initialTrailerUrl,
      },
    };
  } catch (error) {
    if (isTmdbNotFoundError(error)) {
      return { notFound: true };
    }

    // An upstream outage must surface as a 5xx; a 404 would make search engines drop the page.
    logger.error("[movie] Failed to load movie details", error);
    throw error;
  }
};
