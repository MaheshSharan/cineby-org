import type { GetServerSideProps } from "next";

import { cacheControl } from "@/lib/cache/profiles";
import { logger } from "@/lib/logger";
import { isTakenDown, TAKEDOWN_REDIRECT } from "@/lib/takedowns";
import { decryptMediaToken } from "@/lib/seo/obfuscate";
import {
  buildMediaDescription,
  buildMediaTitle,
  getMediaOpenGraphImage,
} from "@/lib/seo/media";
import type { MovieDetails } from "@/lib/tmdb";
import { getMovieDetails, isTmdbNotFoundError } from "@/lib/tmdb/server";
import { getMediaHref } from "@/lib/utils/media";
import { getCanonicalSlugRedirect } from "@/lib/utils/slug";
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

  if (!param || typeof param !== "string") {
    return { notFound: true };
  }

  // Enforce strict 32-char token: reject numeric IDs immediately with 404 to prevent automated DMCA probes
  const tokenMatch = param.match(/^([0-9a-fA-F]{32})(?:-(.*))?$/);
  if (!tokenMatch) {
    return { notFound: true };
  }

  const token = tokenMatch[1].toLowerCase();
  const decrypted = decryptMediaToken(token);
  if (!decrypted || decrypted.mediaType !== "movie") {
    return { notFound: true };
  }

  const id = decrypted.id;

  if (isTakenDown("movie", id)) {
    return { redirect: TAKEDOWN_REDIRECT };
  }

  try {
    context.res.setHeader("Cache-Control", cacheControl("page"));

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
        isPlaying: false,
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
