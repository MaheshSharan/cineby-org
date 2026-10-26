import { INITIAL_AD_FREQUENCY_STATE, type AdFrequencyState } from "./policy";

const STORAGE_KEY = "cineby_ads_v1";

export type AdStorage = Pick<Storage, "getItem" | "setItem">;

export function getBrowserAdStorage(): AdStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    // Intentional: storage access throws when cookies are blocked. Ads then use default pacing.
    return null;
  }
}

function readNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function parseState(raw: string | null): AdFrequencyState {
  if (!raw) {
    return INITIAL_AD_FREQUENCY_STATE;
  }

  let data: unknown;

  try {
    data = JSON.parse(raw);
  } catch {
    // Intentional: a corrupted value is treated as no history.
    return INITIAL_AD_FREQUENCY_STATE;
  }

  if (typeof data !== "object" || data === null) {
    return INITIAL_AD_FREQUENCY_STATE;
  }

  const record = data as Record<string, unknown>;
  const episodes = readNullableNumber(record.episodesSinceAd);

  return {
    lastAdAt: readNullableNumber(record.lastAdAt),
    lastAdMediaKey: readNullableString(record.lastAdMediaKey),
    episodesSinceAd: episodes !== null && episodes >= 0 ? Math.floor(episodes) : 0,
    lastFailureAt: readNullableNumber(record.lastFailureAt),
  };
}

export function readAdFrequencyState(storage: AdStorage | null): AdFrequencyState {
  if (!storage) {
    return INITIAL_AD_FREQUENCY_STATE;
  }

  try {
    return parseState(storage.getItem(STORAGE_KEY));
  } catch {
    // Intentional: unreadable storage means no history.
    return INITIAL_AD_FREQUENCY_STATE;
  }
}

function writeAdFrequencyState(storage: AdStorage | null, state: AdFrequencyState): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Intentional: quota or privacy-mode failures only cost us pacing accuracy.
  }
}

export function recordAdShown(storage: AdStorage | null, mediaKey: string, nowMs: number): void {
  writeAdFrequencyState(storage, {
    ...readAdFrequencyState(storage),
    lastAdAt: nowMs,
    lastAdMediaKey: mediaKey,
    episodesSinceAd: 0,
  });
}

export function recordAdFailure(storage: AdStorage | null, nowMs: number): void {
  writeAdFrequencyState(storage, { ...readAdFrequencyState(storage), lastFailureAt: nowMs });
}

export function recordEpisodeSkipped(storage: AdStorage | null): void {
  const state = readAdFrequencyState(storage);

  writeAdFrequencyState(storage, { ...state, episodesSinceAd: state.episodesSinceAd + 1 });
}
