import type { GetServerSideProps } from "next";

import { logger } from "@/lib/logger";
import {
  buildMediaDescription,
  buildMediaTitle,
  getMediaOpenGraphImageUrl,
} from "@/lib/seo/media";
import type { MovieDetails } from "@/lib/tmdb";
import { getMovieDetails, isTmdbNotFoundError } from "@/lib/tmdb/server";
import { getMediaHref } from "@/lib/utils/media";
import { extractIdFromSlug } from "@/lib/utils/slug";

import { DetailPage } from "@/components/detail/DetailPage";
import { PageSeo } from "@/components/seo/PageSeo";

interface MoviePageProps {
  details: MovieDetails;
  isPlaying: boolean;
}

export default function MoviePage({ details, isPlaying }: MoviePageProps) {
  return (
    <>
      <PageSeo
        title={buildMediaTitle(details)}
        description={buildMediaDescription(details)}
        path={getMediaHref("movie", details.id, details.title)}
        imageUrl={getMediaOpenGraphImageUrl(details)}
        openGraphType="video.movie"
      />
      <DetailPage details={details} isPlaying={isPlaying} />
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

    return {
      props: {
        details,
        isPlaying: context.query.play === "true",
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
