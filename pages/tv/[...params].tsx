import type { GetServerSideProps } from "next";

import { cacheControl } from "@/lib/cache/profiles";
import type { SeasonEpisodes, TvDetails } from "@/lib/tmdb";
import { getSeasonEpisodes, getTvDetails, isTmdbNotFoundError } from "@/lib/tmdb/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { listHistory } from "@/lib/db/history";
import { logger } from "@/lib/logger";
import { isTakenDown, TAKEDOWN_REDIRECT } from "@/lib/takedowns";
import { decryptMediaToken } from "@/lib/seo/obfuscate";
import {
  buildMediaDescription,
  buildMediaTitle,
  getMediaOpenGraphImage,
} from "@/lib/seo/media";
import { getMediaHref } from "@/lib/utils/media";
import { getCanonicalSlugRedirect } from "@/lib/utils/slug";
import { fetchTrailerUrlServer } from "@/lib/services/trailer.server";

import { DetailPage } from "@/components/detail/DetailPage";
import { PageSeo } from "@/components/seo/PageSeo";

interface TvPageProps {
  details: TvDetails;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  initialEpisodes?: SeasonEpisodes | null;
  initialTrailerUrl?: string | null;
}

import { buildBreadcrumbJsonLd, buildTvSeriesJsonLd, sanitizeJsonLd } from "@/lib/seo/jsonLd";

export default function TvPage({
  details,
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
        hideFromSearch={true}
      />
      <DetailPage
        details={details}
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
  const parsedSeason = params?.[1] ? Number.parseInt(params[1], 10) : null;
  const parsedEpisode = params?.[2] ? Number.parseInt(params[2], 10) : null;

  if (!rawId || typeof rawId !== "string") {
    return { notFound: true };
  }

  // Enforce strict 32-char token: reject numeric IDs immediately with 404 to prevent automated DMCA probes
  const tokenMatch = rawId.match(/^([0-9a-fA-F]{32})(?:-(.*))?$/);
  if (!tokenMatch) {
    return { notFound: true };
  }

  const token = tokenMatch[1].toLowerCase();
  const decrypted = decryptMediaToken(token);
  if (!decrypted || decrypted.mediaType !== "tv") {
    return { notFound: true };
  }

  const id = decrypted.id;

  if (isTakenDown("tv", id)) {
    return { redirect: TAKEDOWN_REDIRECT };
  }

  try {
    context.res.setHeader("Cache-Control", cacheControl("page"));

    const details = await getTvDetails(id);

    const segments = Array.isArray(params) ? params : [];
    const redirect = getCanonicalSlugRedirect(
      `/tv/${segments.join("/")}`,
      `${getMediaHref("tv", details.id, details.title)}${segments.slice(1).map((segment) => `/${segment}`).join("")}`,
      context.resolvedUrl
    );
    if (redirect) {
      return { redirect };
    }

    const seasonNumber = typeof parsedSeason === "number" && Number.isInteger(parsedSeason) && parsedSeason > 0 ? parsedSeason : null;
    const episodeNumber = typeof parsedEpisode === "number" && Number.isInteger(parsedEpisode) && parsedEpisode > 0 ? parsedEpisode : null;
    let effectiveSeason = seasonNumber;
    let effectiveEpisode = episodeNumber;

    // If no explicit season/episode in the URL, check user's history
    if (!effectiveSeason || !effectiveEpisode) {
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
