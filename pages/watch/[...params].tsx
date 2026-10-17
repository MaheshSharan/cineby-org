import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";

import { getMovieDetails, getTvDetails, isTmdbNotFoundError } from "@/lib/tmdb/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { listHistory } from "@/lib/db/history";
import { logger } from "@/lib/logger";
import { formatRuntime, getEpisodeHref, getYear, toPlayerSeasons } from "@/lib/utils/media";

import { PlayerShell } from "@/components/player/PlayerShell";
import type { PlayerMedia } from "@/components/player/types";
import { PageSeo } from "@/components/seo/PageSeo";

interface WatchPageProps {
  title: string;
  subtitle?: string;
  media: PlayerMedia;
}

export default function WatchPage({ title, subtitle, media }: WatchPageProps) {
  const router = useRouter();

  return (
    <>
      <PageSeo title={`Watch ${title} | Cineby`} noindex />
      <PlayerShell
        title={title}
        subtitle={subtitle}
        media={media}
        onNavigateEpisode={(season, episode) =>
          router.push(getEpisodeHref(media.mediaId, season, episode))
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

  try {
    if (mediaType === "tv") {
      const details = await getTvDetails(id);
      let season = parseOptionalNumber(params[2]);
      let episode = parseOptionalNumber(params[3]);

      if (!season || !episode) {
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
            duration,
            runtime: details.episodeRunTime?.[0] ?? null,
            releaseYear: getYear(details.releaseDate),
            seasons: toPlayerSeasons(details.seasons),
          },
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
