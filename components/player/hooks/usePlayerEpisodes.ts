import { useCallback, useEffect, useMemo, useState } from "react";
import type { Episode, PlayerSeason } from "../types";
import { getSeasonEpisodes } from "@/lib/api/episodes";

interface UsePlayerEpisodesParams {
  mediaId: number;
  isTv: boolean;
  seasons: PlayerSeason[];
  initialSeason?: number;
  initialEpisode?: number;
  onNavigateEpisode?: (seasonNumber: number, episodeNumber: number) => void;
}

export function usePlayerEpisodes({
  mediaId,
  isTv,
  seasons,
  initialSeason = 1,
  initialEpisode = 1,
  onNavigateEpisode,
}: UsePlayerEpisodesParams) {
  const [currentSeason, setCurrentSeason] = useState<number>(initialSeason);
  const [currentEpisode, setCurrentEpisode] = useState<number>(initialEpisode);
  const [drawerSeason, setDrawerSeason] = useState<number>(initialSeason);
  const [episodesBySeason, setEpisodesBySeason] = useState<Record<number, Episode[]>>({});
  const [isEpisodesLoading, setIsEpisodesLoading] = useState(false);

  const activeSeasonInfo = useMemo(
    () => seasons.find((s) => s.seasonNumber === currentSeason) ?? null,
    [seasons, currentSeason]
  );

  const currentSeasonEpisodes = episodesBySeason[currentSeason] ?? [];
  const drawerEpisodes = episodesBySeason[drawerSeason] ?? [];

  const isLastEpisode = useMemo(() => {
    if (!activeSeasonInfo) {
      return false;
    }

    const isLastOfSeason = currentEpisode >= activeSeasonInfo.episodeCount;
    if (!isLastOfSeason) {
      return false;
    }

    const hasNextSeason = seasons.some(
      (s) => s.seasonNumber > currentSeason && s.episodeCount > 0
    );
    return !hasNextSeason;
  }, [activeSeasonInfo, currentEpisode, currentSeason, seasons]);

  const hasNext = isTv && currentSeasonEpisodes.length > 0 && !isLastEpisode;

  // Fetch episodes for current and drawer seasons
  useEffect(() => {
    if (!isTv) {
      return;
    }

    const seasonsToLoad = [currentSeason, drawerSeason].filter(
      (s, idx, arr) => arr.indexOf(s) === idx && !episodesBySeason[s]
    );

    if (seasonsToLoad.length === 0) {
      return;
    }

    let isCurrent = true;
    setIsEpisodesLoading(true);

    Promise.all(
      seasonsToLoad.map(async (s) => {
        try {
          const data = await getSeasonEpisodes(mediaId, s);
          return {
            season: s,
            episodes: data.episodes.map((episode) => ({
              id: episode.id,
              seasonNumber: episode.seasonNumber,
              episodeNumber: episode.episodeNumber,
              name: episode.name,
              overview: episode.overview,
              stillPath: episode.stillPath,
              runtime: episode.runtime,
              airDate: episode.airDate,
              voteAverage: episode.voteAverage,
            })),
          };
        } catch {
          return null;
        }
      })
    )
      .then((results) => {
        if (!isCurrent) return;
        const updates: Record<number, Episode[]> = {};
        for (const res of results) {
          if (res) {
            updates[res.season] = res.episodes;
          }
        }
        if (Object.keys(updates).length > 0) {
          setEpisodesBySeason((prev) => ({ ...prev, ...updates }));
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsEpisodesLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [currentSeason, drawerSeason, episodesBySeason, isTv, mediaId]);

  const currentEpisodeData = useMemo(() => {
    if (!isTv) return null;
    const episodes = episodesBySeason[currentSeason] ?? [];
    return episodes.find((episode) => episode.episodeNumber === currentEpisode) ?? null;
  }, [isTv, episodesBySeason, currentSeason, currentEpisode]);

  const handleNavigate = useCallback(
    (seasonNumber: number, episodeNumber: number) => {
      setCurrentSeason(seasonNumber);
      setCurrentEpisode(episodeNumber);
      setDrawerSeason(seasonNumber);
      onNavigateEpisode?.(seasonNumber, episodeNumber);
    },
    [onNavigateEpisode]
  );

  const handleNextEpisode = useCallback(() => {
    if (!activeSeasonInfo) {
      return;
    }

    if (currentEpisode < activeSeasonInfo.episodeCount) {
      handleNavigate(currentSeason, currentEpisode + 1);
      return;
    }

    const nextSeason = seasons.find(
      (s) => s.seasonNumber > currentSeason && s.episodeCount > 0
    );
    if (nextSeason) {
      handleNavigate(nextSeason.seasonNumber, 1);
    }
  }, [activeSeasonInfo, currentEpisode, currentSeason, handleNavigate, seasons]);

  return {
    currentSeason,
    currentEpisode,
    drawerSeason,
    setDrawerSeason,
    drawerEpisodes,
    currentEpisodeData,
    isEpisodesLoading,
    activeSeasonInfo,
    isLastEpisode,
    hasNext,
    handleNavigate,
    handleNextEpisode,
  };
}
