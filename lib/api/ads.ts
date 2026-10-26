import { AD_CONFIG_TIMEOUT_MS } from "@/lib/ads/constants";
import type { AdConfig } from "@/lib/ads/types";

const DISABLED_CONFIG: AdConfig = { enabled: false };

let cachedConfig: Promise<AdConfig> | null = null;

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function parseAdConfig(data: unknown): AdConfig {
  if (typeof data !== "object" || data === null || !("enabled" in data) || data.enabled !== true) {
    return DISABLED_CONFIG;
  }

  const { tagUrl, zoneId, cooldownMin, episodesBetween, requestTimeoutMs, ecpmUsd } =
    data as Record<string, unknown>;

  if (
    !isNonEmptyString(tagUrl) ||
    !isNonEmptyString(zoneId) ||
    !isPositiveNumber(cooldownMin) ||
    !isPositiveNumber(episodesBetween) ||
    !isPositiveNumber(requestTimeoutMs) ||
    typeof ecpmUsd !== "number" ||
    !Number.isFinite(ecpmUsd)
  ) {
    return DISABLED_CONFIG;
  }

  return {
    enabled: true,
    tagUrl,
    zoneId,
    cooldownMin,
    episodesBetween,
    requestTimeoutMs,
    ecpmUsd,
  };
}

async function requestAdConfig(): Promise<AdConfig> {
  const response = await fetch("/api/ads/config", {
    signal: AbortSignal.timeout(AD_CONFIG_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Ad config request failed with ${response.status}`);
  }

  return parseAdConfig(await response.json());
}

/**
 * Resolved once per page session and shared by every title the user watches.
 * Any failure means "no ad": a broken config endpoint must never delay playback.
 */
export function fetchAdConfig(): Promise<AdConfig> {
  if (!cachedConfig) {
    cachedConfig = requestAdConfig().catch(() => {
      // Intentional fallback: ads are optional. Clearing the cache lets the next title retry.
      cachedConfig = null;
      return DISABLED_CONFIG;
    });
  }

  return cachedConfig;
}
