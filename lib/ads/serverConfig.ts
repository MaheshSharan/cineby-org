// Server-only: reads env through lib/env/server.

import {
  getVideoAdEcpmUsd,
  getVideoAdEpisodesBetween,
  getVideoAdCooldownMin,
  getVideoAdRequestTimeoutMs,
  getVideoAdTagUrl,
  getVideoAdZoneId,
  isVideoAdsEnabled,
} from "@/lib/env/server";
import { isAdRestrictedCountry } from "./geo";
import type { AdConfig } from "./types";

export function resolveAdConfig(countryCode: string | undefined): AdConfig {
  if (!isVideoAdsEnabled() || isAdRestrictedCountry(countryCode)) {
    return { enabled: false };
  }

  return {
    enabled: true,
    tagUrl: getVideoAdTagUrl(),
    zoneId: getVideoAdZoneId(),
    cooldownMin: getVideoAdCooldownMin(),
    episodesBetween: getVideoAdEpisodesBetween(),
    requestTimeoutMs: getVideoAdRequestTimeoutMs(),
    ecpmUsd: getVideoAdEcpmUsd(),
  };
}
