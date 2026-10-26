import { describe, expect, it } from "vitest";

import { INITIAL_AD_FREQUENCY_STATE } from "@/lib/ads/policy";
import {
  readAdFrequencyState,
  recordAdFailure,
  recordAdShown,
  recordEpisodeSkipped,
  type AdStorage,
} from "@/lib/ads/storage";

function createMemoryStorage(initial?: string): AdStorage & { value: string | null } {
  const storage = {
    value: initial ?? null,
    getItem: () => storage.value,
    setItem: (_key: string, value: string) => {
      storage.value = value;
    },
  };

  return storage;
}

describe("ad frequency storage", () => {
  it("starts from the initial state when nothing is stored or storage is unavailable", () => {
    expect(readAdFrequencyState(createMemoryStorage())).toEqual(INITIAL_AD_FREQUENCY_STATE);
    expect(readAdFrequencyState(null)).toEqual(INITIAL_AD_FREQUENCY_STATE);
  });

  it("ignores corrupted or malformed values", () => {
    expect(readAdFrequencyState(createMemoryStorage("{not json"))).toEqual(INITIAL_AD_FREQUENCY_STATE);
    expect(readAdFrequencyState(createMemoryStorage("42"))).toEqual(INITIAL_AD_FREQUENCY_STATE);
    expect(
      readAdFrequencyState(createMemoryStorage(JSON.stringify({ lastAdAt: "yesterday", episodesSinceAd: -3 })))
    ).toEqual(INITIAL_AD_FREQUENCY_STATE);
  });

  it("records a shown ad and resets the episode counter", () => {
    const storage = createMemoryStorage();

    recordEpisodeSkipped(storage);
    recordEpisodeSkipped(storage);
    expect(readAdFrequencyState(storage).episodesSinceAd).toBe(2);

    recordAdShown(storage, "tv:1:1:3", 123);

    expect(readAdFrequencyState(storage)).toMatchObject({
      lastAdAt: 123,
      lastAdMediaKey: "tv:1:1:3",
      episodesSinceAd: 0,
    });
  });

  it("records failures without touching the last shown ad", () => {
    const storage = createMemoryStorage();

    recordAdShown(storage, "movie:1", 100);
    recordAdFailure(storage, 200);

    expect(readAdFrequencyState(storage)).toMatchObject({ lastAdAt: 100, lastFailureAt: 200 });
  });

  it("never throws when storage rejects writes", () => {
    const storage: AdStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };

    expect(() => recordAdShown(storage, "movie:1", 1)).not.toThrow();
  });
});
