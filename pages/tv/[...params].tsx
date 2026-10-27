import type { GetServerSideProps } from "next";

import type { SeasonEpisodes, TvDetails } from "@/lib/tmdb";
import { getSeasonEpisodes, getTvDetails, isTmdbNotFoundError } from "@/lib/tmdb/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { listHistory } from "@/lib/db/history";
import { logger } from "@/lib/logger";
import {
  buildMediaDescription,
  buildMediaTitle,
  getMediaOpenGraphImage,
} from "@/lib/seo/media";
import { getMediaHref } from "@/lib/utils/media";
import { extractIdFromSlug } from "@/lib/utils/slug";
import { fetchTrailerUrlServer } from "@/lib/services/trailer.server";

import { DetailPage } from "@/components/detail/DetailPage";
import { PageSeo } from "@/components/seo/PageSeo";

interface TvPageProps {
  details: TvDetails;
  isPlaying: boolean;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  initialEpisodes?: SeasonEpisodes | null;
  initialTrailerUrl?: string | null;
}

import { buildBreadcrumbJsonLd, buildTvSeriesJsonLd, sanitizeJsonLd } from "@/lib/seo/jsonLd";

export default function TvPage({
  details,
  isPlaying,
  seasonNumber,
  episodeNumber,
  initialEpisodes,
  initialTrailerUrl,
}: TvPageProps) {
  const schemas = [
    buildBreadcrumbJsonLd("tv", details.title, details.id),
    buildTvSeriesJsonLd(details),
  ];
  const ogImage = getMediaOpenGraphImage(details);

  return (
    <>
      <PageSeo
        title={buildMediaTitle(details)}
        description={buildMediaDescription(details)}
        path={getMediaHref("tv", details.id, details.title)}
        imageUrl={ogImage?.url}
        imageWidth={ogImage?.width}
        imageHeight={ogImage?.height}
        openGraphType="video.tv_show"
        jsonLd={sanitizeJsonLd(schemas)}
      />
      <DetailPage
        details={details}
        isPlaying={isPlaying}
        seasonNumber={seasonNumber}
        episodeNumber={episodeNumber}
        initialEpisodes={initialEpisodes}
        initialTrailerUrl={initialTrailerUrl}
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

    const seasonNumber = typeof parsedSeason === "number" && Number.isInteger(parsedSeason) && parsedSeason > 0 ? parsedSeason : null;
    const episodeNumber = typeof parsedEpisode === "number" && Number.isInteger(parsedEpisode) && parsedEpisode > 0 ? parsedEpisode : null;
    let effectiveSeason = seasonNumber;
    let effectiveEpisode = episodeNumber;

    // If playing but no explicit season/episode in the URL, check user's history
    if (isPlaying && (!effectiveSeason || !effectiveEpisode)) {
      const user = await getCurrentUser(context.req);
      if (user) {
        const historyList = await listHistory(user.id, user.activeProfileId ?? undefined);
        const match = historyList.find(
          (item) => item.mediaType === "tv" && item.mediaId === details.id
        );
        if (match?.seasonNumber && match?.episodeNumber) {
          effectiveSeason = match.seasonNumber;
          effectiveEpisode = match.episodeNumber;
        }
      }

      // Default fallback if no history exists for this TV show
      effectiveSeason = effectiveSeason ?? 1;
      effectiveEpisode = effectiveEpisode ?? 1;
    }

    const targetSeason =
      effectiveSeason ?? details.seasons.find((s) => s.seasonNumber > 0)?.seasonNumber ?? 1;

    const [initialEpisodes, initialTrailerUrl] = await Promise.all([
      getSeasonEpisodes(details.id, targetSeason).catch(() => null),
      details.imdbId ? fetchTrailerUrlServer(details.imdbId).catch(() => null) : Promise.resolve(null),
    ]);

    return {
      props: {
        details,
        isPlaying,
        seasonNumber: effectiveSeason,
        episodeNumber: effectiveEpisode,
        initialEpisodes,
        initialTrailerUrl,
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
