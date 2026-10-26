import { afterEach, describe, expect, it, vi } from "vitest";

import { isAdRestrictedCountry } from "@/lib/ads/geo";
import { resolveAdConfig } from "@/lib/ads/serverConfig";

describe("isAdRestrictedCountry", () => {
  it("restricts consent-required regions and unverifiable locations", () => {
    for (const code of ["DE", "fr", "GB", "CH", "NO", "XX", "T1"]) {
      expect(isAdRestrictedCountry(code)).toBe(true);
    }
  });

  it("allows other countries and local development (no header)", () => {
    expect(isAdRestrictedCountry("US")).toBe(false);
    expect(isAdRestrictedCountry("IN")).toBe(false);
    expect(isAdRestrictedCountry(undefined)).toBe(false);
  });
});

describe("resolveAdConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the full config when enabled", () => {
    expect(resolveAdConfig("US")).toEqual({
      enabled: true,
      tagUrl: "https://ads.test/vast",
      zoneId: "test-zone",
      cooldownMin: 15,
      episodesBetween: 3,
      requestTimeoutMs: 5000,
      ecpmUsd: 1.5,
    });
  });

  it("is disabled by the kill switch without needing the other variables", () => {
    vi.stubEnv("ENABLE_VIDEO_ADS", "false");
    vi.stubEnv("VIDEO_AD_TAG_URL", "");

    expect(resolveAdConfig("US")).toEqual({ enabled: false });
  });

  it("is disabled in restricted regions", () => {
    expect(resolveAdConfig("DE")).toEqual({ enabled: false });
  });

  it("fails loudly on an invalid value instead of guessing", () => {
    vi.stubEnv("VIDEO_AD_REQUEST_TIMEOUT_MS", "soon");

    expect(() => resolveAdConfig("US")).toThrow(/VIDEO_AD_REQUEST_TIMEOUT_MS/);
  });
});
