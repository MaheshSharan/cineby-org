import { useEffect, useRef, useState } from "react";

import { createAdAnalytics, type AdAnalytics } from "@/lib/ads/analytics";
import { decideMidroll, countsAsSkippedEpisode } from "@/lib/ads/policy";
import { pickMidrollCue } from "@/lib/ads/schedule";
import { getBrowserAdStorage, readAdFrequencyState, recordEpisodeSkipped } from "@/lib/ads/storage";
import type { AdConfig } from "@/lib/ads/types";
import { fetchAdConfig } from "@/lib/api/ads";

type EnabledAdConfig = Extract<AdConfig, { enabled: true }>;

export type AdSchedule =
  | { status: "pending" }
  | { status: "none" }
  | { status: "scheduled"; cueSec: number; config: EnabledAdConfig; analytics: AdAnalytics };

interface UseAdScheduleParams {
  mediaKey: string;
  mediaId: number | string;
  mediaType: "movie" | "tv";
  /** Length of the title in seconds. Zero until the stream reports it. */
  durationSec: number;
  /** Second playback starts from (0, or the resume position). */
  startTimeSec: number;
}

interface ScheduleState {
  mediaKey: string;
  config: AdConfig | null;
  schedule: AdSchedule | null;
}

function createScheduleState(mediaKey: string): ScheduleState {
  return { mediaKey, config: null, schedule: null };
}

/**
 * Decides, once per title, whether an ad plays and at which second. The answer needs the ad
 * config (kill switch, region), the pacing rules, and the title's length.
 */
export function useAdSchedule({
  mediaKey,
  mediaId,
  mediaType,
  durationSec,
  startTimeSec,
}: UseAdScheduleParams): AdSchedule {
  const [state, setState] = useState<ScheduleState>(() => createScheduleState(mediaKey));
  const decidedKeyRef = useRef<string | null>(null);
  const view = state.mediaKey === mediaKey ? state : createScheduleState(mediaKey);
  const { config, schedule } = view;

  useEffect(() => {
    let isCancelled = false;

    void fetchAdConfig().then((loaded) => {
      if (!isCancelled) {
        setState((previous) => ({
          ...(previous.mediaKey === mediaKey ? previous : createScheduleState(mediaKey)),
          config: loaded,
        }));
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [mediaKey]);

  useEffect(() => {
    if (!config || schedule || decidedKeyRef.current === mediaKey) {
      return;
    }

    function settle(next: AdSchedule): void {
      decidedKeyRef.current = mediaKey;
      setState((previous) => ({
        ...(previous.mediaKey === mediaKey ? previous : createScheduleState(mediaKey)),
        schedule: next,
      }));
    }

    if (!config.enabled) {
      settle({ status: "none" });
      return;
    }

    if (durationSec <= 0) {
      return;
    }

    const storage = getBrowserAdStorage();
    const isTv = mediaType === "tv";
    const analytics = createAdAnalytics(
      {
        contentId: String(mediaId),
        mediaType,
        breakId: `${mediaKey}:${Date.now()}`,
        zoneId: config.zoneId,
      },
      config.ecpmUsd
    );
    const decision = decideMidroll({
      mediaKey,
      isTv,
      nowMs: Date.now(),
      state: readAdFrequencyState(storage),
      cooldownMin: config.cooldownMin,
      episodesBetween: config.episodesBetween,
    });

    if (!decision.shouldPlay) {
      analytics.recordDecision(decision);

      if (countsAsSkippedEpisode(isTv, decision.reason)) {
        recordEpisodeSkipped(storage);
      }

      settle({ status: "none" });
      return;
    }

    const cueSec = pickMidrollCue({ durationSec, startTimeSec });

    if (cueSec === null) {
      analytics.recordDecision({ shouldPlay: false, reason: "outside_window" });
      settle({ status: "none" });
      return;
    }

    analytics.recordDecision(decision);
    settle({ status: "scheduled", cueSec, config, analytics });
  }, [config, schedule, mediaKey, mediaId, mediaType, durationSec, startTimeSec]);

  return schedule ?? { status: "pending" };
}
