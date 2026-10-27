import type { GetServerSideProps } from "next";

import { logger } from "@/lib/logger";
import {
  buildMediaDescription,
  buildMediaTitle,
  getMediaOpenGraphImage,
} from "@/lib/seo/media";
import type { MovieDetails } from "@/lib/tmdb";
import { getMovieDetails, isTmdbNotFoundError } from "@/lib/tmdb/server";
import { getMediaHref } from "@/lib/utils/media";
import { extractIdFromSlug } from "@/lib/utils/slug";
import { fetchTrailerUrlServer } from "@/lib/services/trailer.server";
import { listAvailableProvidersWithChildren } from "@/lib/providers/registry";
import type { ActiveProvider } from "@/components/player/providers/activeProviders";

import { DetailPage } from "@/components/detail/DetailPage";
import { PageSeo } from "@/components/seo/PageSeo";

interface MoviePageProps {
  details: MovieDetails;
  isPlaying: boolean;
  initialTrailerUrl?: string | null;
  activeProviders?: ActiveProvider[];
}

import { buildBreadcrumbJsonLd, buildMovieJsonLd, sanitizeJsonLd } from "@/lib/seo/jsonLd";

export default function MoviePage({ details, isPlaying, initialTrailerUrl, activeProviders }: MoviePageProps) {
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
        activeProviders={activeProviders}
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
    const details = await getMovieDetails(id);
    const initialTrailerUrl = details.imdbId
      ? await fetchTrailerUrlServer(details.imdbId).catch(() => null)
      : null;
    const activeProviders = await listAvailableProvidersWithChildren();

    return {
      props: {
        details,
        isPlaying: context.query.play === "true",
        initialTrailerUrl,
        activeProviders,
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
