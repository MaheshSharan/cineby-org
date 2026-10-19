import { afterEach, describe, expect, it } from "vitest";

import { getGaMeasurementId, getImageProxyUrl, isAnalyticsEnabled, isImageProxyEnabled } from "@/lib/env/public";
import {
  EnvConfigError,
  parseEnum,
  parseFlag,
  parseList,
  parsePositiveInteger,
  parseUrl,
  parseUrlOrPath,
} from "@/lib/env/read";
import {
  getCacheBackend,
  getDatabasePath,
  getStreamProxySecret,
  getStreamProxyUrl,
  isProviderEnabled,
} from "@/lib/env/server";
import { parseWranglerVars, stripJsonComments } from "../scripts/lib/wranglerVars";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("env parsers", () => {
  it("treat missing and blank values as errors with a descriptive message", () => {
    expect(() => parseUrl("X_URL", undefined)).toThrow(/Missing required environment variable: X_URL/);
    expect(() => parseUrl("X_URL", "   ")).toThrow(EnvConfigError);
  });

  it("accept only absolute http(s) URLs and strip trailing slashes", () => {
    expect(parseUrl("X", "https://a.test/path///")).toBe("https://a.test/path");
    expect(() => parseUrl("X", "a.test")).toThrow(/Invalid environment variable X/);
    expect(() => parseUrl("X", "ftp://a.test")).toThrow(EnvConfigError);
  });

  it("accept a root-relative path where a URL or path is allowed", () => {
    expect(parseUrlOrPath("X", "/api/stream/proxy")).toBe("/api/stream/proxy");
    expect(parseUrlOrPath("X", "https://p.test/")).toBe("https://p.test");
    expect(() => parseUrlOrPath("X", "api/stream/proxy")).toThrow(EnvConfigError);
  });

  it("require flags to be exactly true or false", () => {
    expect(parseFlag("X", "true")).toBe(true);
    expect(parseFlag("X", "false")).toBe(false);
    expect(() => parseFlag("X", "0")).toThrow(EnvConfigError);
    expect(() => parseFlag("X", "TRUE")).toThrow(EnvConfigError);
    expect(() => parseFlag("X", undefined)).toThrow(/Missing required/);
  });

  it("validate integers, enums and lists", () => {
    expect(parsePositiveInteger("X", "5000")).toBe(5000);
    expect(() => parsePositiveInteger("X", "0")).toThrow(EnvConfigError);
    expect(() => parsePositiveInteger("X", "12ab")).toThrow(EnvConfigError);
    expect(parseEnum("X", "redis", ["memory", "redis"] as const)).toBe("redis");
    expect(() => parseEnum("X", "disk", ["memory", "redis"] as const)).toThrow(/one of memory, redis/);
    expect(parseList("X", " a , b ,,c ")).toEqual(["a", "b", "c"]);
    expect(() => parseList("X", " , ")).toThrow(EnvConfigError);
  });
});

describe("env getters fail fast", () => {
  it("throw instead of falling back when a public value is missing", () => {
    delete process.env.NEXT_PUBLIC_IMAGE_PROXY_URL;
    expect(() => getImageProxyUrl()).toThrow(/NEXT_PUBLIC_IMAGE_PROXY_URL/);
  });

  it("require an explicit image proxy flag", () => {
    delete process.env.NEXT_PUBLIC_ENABLE_IMAGE_PROXY;
    expect(() => isImageProxyEnabled()).toThrow(/NEXT_PUBLIC_ENABLE_IMAGE_PROXY/);

    process.env.NEXT_PUBLIC_ENABLE_IMAGE_PROXY = "false";
    expect(isImageProxyEnabled()).toBe(false);
  });

  it("only asks for the GA id while analytics is enabled", () => {
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = "false";
    expect(isAnalyticsEnabled()).toBe(false);

    delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    expect(() => getGaMeasurementId()).toThrow(/NEXT_PUBLIC_GA_MEASUREMENT_ID/);
  });

  it("require secrets and stream proxy settings", () => {
    delete process.env.STREAM_PROXY_SECRET;
    expect(() => getStreamProxySecret()).toThrow(/STREAM_PROXY_SECRET/);

    delete process.env.STREAM_PROXY_URL;
    expect(() => getStreamProxyUrl()).toThrow(/STREAM_PROXY_URL/);
  });

  it("require an explicit provider switch and cache backend", () => {
    delete process.env.ENABLE_VIDY;
    expect(() => isProviderEnabled("vidy")).toThrow(/ENABLE_VIDY/);

    process.env.ENABLE_VIDY = "0";
    expect(() => isProviderEnabled("vidy")).toThrow(EnvConfigError);

    process.env.CACHE_BACKEND = "inferred";
    expect(() => getCacheBackend()).toThrow(/CACHE_BACKEND/);
  });

  it("require a database path outside Cloudflare", () => {
    delete process.env.DATABASE_PATH;
    expect(() => getDatabasePath()).toThrow(/DATABASE_PATH/);
  });
});

describe("wrangler.jsonc parsing", () => {
  it("keeps // inside strings and removes comments and trailing commas", () => {
    const jsonc = `{
      // line comment
      "$schema": "https://example.test/schema.json", /* block */
      "vars": { "A": "1", "B": 2, },
    }`;

    expect(stripJsonComments(jsonc)).toContain("https://example.test/schema.json");
    expect(parseWranglerVars(jsonc)).toEqual({ A: "1", B: "2" });
  });
});
