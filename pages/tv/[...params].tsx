import type { GetServerSideProps } from "next";

import type { TvDetails } from "@/lib/tmdb";
import { getTvDetails, isTmdbNotFoundError } from "@/lib/tmdb/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { listHistory } from "@/lib/db/history";
import { logger } from "@/lib/logger";
import {
  buildMediaDescription,
  buildMediaTitle,
  getMediaOpenGraphImageUrl,
} from "@/lib/seo/media";
import { getMediaHref } from "@/lib/utils/media";
import { extractIdFromSlug } from "@/lib/utils/slug";

import { DetailPage } from "@/components/detail/DetailPage";
import { PageSeo } from "@/components/seo/PageSeo";

interface TvPageProps {
  details: TvDetails;
  isPlaying: boolean;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
}

import { buildBreadcrumbJsonLd, buildTvSeriesJsonLd, sanitizeJsonLd } from "@/lib/seo/jsonLd";

export default function TvPage({ details, isPlaying, seasonNumber, episodeNumber }: TvPageProps) {
  const schemas = [
    buildBreadcrumbJsonLd("tv", details.title, details.id),
    buildTvSeriesJsonLd(details),
  ];

  return (
    <>
      <PageSeo
        title={buildMediaTitle(details)}
        description={buildMediaDescription(details)}
        path={getMediaHref("tv", details.id, details.title)}
        imageUrl={getMediaOpenGraphImageUrl(details)}
        openGraphType="video.tv_show"
        jsonLd={sanitizeJsonLd(schemas)}
      />
      <DetailPage
        details={details}
        isPlaying={isPlaying}
        seasonNumber={seasonNumber}
        episodeNumber={episodeNumber}
      />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<TvPageProps> = async (context) => {
  const params = context.params?.params;
  const rawId = params?.[0];
  const id = extractIdFromSlug(rawId);
  const parsedSeason = params?.[1] ? Number.parseInt(params[1], 10) : null;
  const parsedEpisode = params?.[2] ? Number.parseInt(params[2], 10) : null;
  const isPlaying = context.query.play === "true";

  if (!id) {
    return { notFound: true };
  }

  try {
    const details = await getTvDetails(id);

    let seasonNumber = Number.isInteger(parsedSeason) && (parsedSeason as number) > 0 ? parsedSeason : null;
    let episodeNumber = Number.isInteger(parsedEpisode) && (parsedEpisode as number) > 0 ? parsedEpisode : null;

    // If playing but no explicit season/episode in the URL, check user's history
    if (isPlaying && (!seasonNumber || !episodeNumber)) {
      const user = await getCurrentUser(context.req);
      if (user) {
        const historyList = await listHistory(user.id, user.activeProfileId ?? undefined);
        const match = historyList.find(
          (item) => item.mediaType === "tv" && item.mediaId === details.id
        );
        if (match?.seasonNumber && match?.episodeNumber) {
          seasonNumber = match.seasonNumber;
          episodeNumber = match.episodeNumber;
        }
      }

      // Default fallback if no history exists for this TV show
      seasonNumber = seasonNumber ?? 1;
      episodeNumber = episodeNumber ?? 1;
    }

    return {
      props: {
        details,
        isPlaying,
        seasonNumber,
        episodeNumber,
      },
    };
  } catch (error) {
    if (isTmdbNotFoundError(error)) {
      return { notFound: true };
    }

    // An upstream outage must surface as a 5xx; a 404 would make search engines drop the page.
    logger.error("[tv] Failed to load TV details", error);
    throw error;
  }
};