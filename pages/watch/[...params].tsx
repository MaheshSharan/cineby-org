import type { GetServerSideProps } from "next";
import Head from "next/head";
import { useRouter } from "next/router";

import { cacheControl, PRIVATE_CACHE_CONTROL } from "@/lib/cache/profiles";
import { getMovieDetails, getTvDetails, isTmdbNotFoundError } from "@/lib/tmdb/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { listHistory } from "@/lib/db/history";
import { logger } from "@/lib/logger";
import { formatRuntime, getEpisodeHref, getYear, toPlayerSeasons } from "@/lib/utils/media";

import { PlayerShell } from "@/components/player/PlayerShell";
import type { PlayerMedia } from "@/components/player/types";
import { FRAMEXTV_ORIGIN } from "@/lib/embeds/sites/framextv";
import { VIDRIFT_ORIGIN } from "@/lib/embeds/sites/vidrift";
import { PageSeo } from "@/components/seo/PageSeo";
import { getPlayerModeConfig, type PlayerModeConfig } from "@/lib/player/modeConfig";

interface WatchPageProps {
  title: string;
  subtitle?: string;
  media: PlayerMedia;
  modeConfig: PlayerModeConfig;
}

export default function WatchPage({ title, subtitle, media, modeConfig }: WatchPageProps) {
  const router = useRouter();

  return (
    <>
      <PageSeo title={`Watch ${title} | Cineby`} noindex />
      <Head>
        {/* Open the connections to the first two servers while the page hydrates. */}
        <link rel="preconnect" href={VIDRIFT_ORIGIN} crossOrigin="anonymous" />
        <link rel="preconnect" href={FRAMEXTV_ORIGIN} crossOrigin="anonymous" />
      </Head>
      <PlayerShell
        title={title}
        subtitle={subtitle}
        media={media}
        modeConfig={modeConfig}
        onNavigateEpisode={(season, episode) =>
          router.push(getEpisodeHref(media.mediaId, season, episode, null, title))
        }
      />
    </>
  );
}


export const getServerSideProps: GetServerSideProps<WatchPageProps> = async (context) => {
  const params = context.params?.params ?? [];
  const mediaType = params[0];
  const id = params[1];

  if (!id || (mediaType !== "movie" && mediaType !== "tv")) {
    return { notFound: true };
  }

  // Everything the page renders comes from TMDB and server config; the exception is overridden below.
  context.res.setHeader("Cache-Control", cacheControl("page"));

  try {
    if (mediaType === "tv") {
      const details = await getTvDetails(id);
      let season = parseOptionalNumber(params[2]);
      let episode = parseOptionalNumber(params[3]);

      if (!season || !episode) {
        // The resume position below depends on the signed-in user, so a shared cache must not keep this page.
        context.res.setHeader("Cache-Control", PRIVATE_CACHE_CONTROL);
        const user = await getCurrentUser(context.req);
        if (user) {
          const historyList = await listHistory(user.id, user.activeProfileId ?? undefined);
          const match = historyList.find(
            (item) => item.mediaType === "tv" && item.mediaId === details.id
          );
          if (match?.seasonNumber && match?.episodeNumber) {
            season = match.seasonNumber;
            episode = match.episodeNumber;
          }
        }

        season = season ?? 1;
        episode = episode ?? 1;
      }

      const duration = details.episodeRunTime?.[0]
        ? formatRuntime(details.episodeRunTime[0])
        : undefined;

      return {
        props: {
          title: details.title,
          subtitle: `S${season} E${episode}`,
          media: {
            mediaType,
            mediaId: details.id,
            imdbId: details.imdbId,
            title: details.title,
            posterPath: details.posterPath,
            backdropPath: details.backdropPath,
            seasonNumber: season,
            episodeNumber: episode,
            duration: duration ?? null,
            runtime: details.episodeRunTime?.[0] ?? null,
            releaseYear: getYear(details.releaseDate),
            seasons: toPlayerSeasons(details.seasons),
          },
          modeConfig: getPlayerModeConfig(),
        },
      };
    }

    const details = await getMovieDetails(id);
    const duration = details.runtime ? formatRuntime(details.runtime) : undefined;
    const releaseYear = getYear(details.releaseDate);

    return {
      props: {
        title: details.title,
        subtitle: releaseYear || undefined,
        media: {
          mediaType,
          mediaId: details.id,
          imdbId: details.imdbId,
          title: details.title,
          posterPath: details.posterPath,
          backdropPath: details.backdropPath,
          duration,
          runtime: details.runtime ?? null,
          releaseYear,
        },
        modeConfig: getPlayerModeConfig(),
      },
    };

  } catch (error) {
    if (isTmdbNotFoundError(error)) {
      return { notFound: true };
    }

    logger.error("[watch] Failed to load media details", error);
    throw error;
  }
};

function parseOptionalNumber(value: string | undefined): number | null {
  const parsed = Number.parseInt(value ?? "", 10);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
