// Server-only configuration. Never import this from components or hooks.
//
// Values come from process.env. There are no defaults: a missing value throws a descriptive
// EnvConfigError. Optional features are disabled only by an explicit "false".

import { SEGMENT_PROVIDER_NAMES, type SegmentProviderName } from "@/lib/segments/types";
import {
  parseEnum,
  parseFlag,
  parseList,
  parseNonNegativeNumber,
  parsePositiveInteger,
  parseUrl,
  parseUrlOrPath,
  requireValue,
} from "./read";

export const CACHE_BACKENDS = ["memory", "redis"] as const;
export type CacheBackend = (typeof CACHE_BACKENDS)[number];

export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

/** Server environment lookup. Reads process.env. */
export function readServerEnv(name: string): string | undefined {
  return process.env[name];
}

// TMDB

export function getTmdbApiUrl(): string {
  return parseUrl("TMDB_API_URL", readServerEnv("TMDB_API_URL"));
}

export function getTmdbApiKey(): string {
  return requireValue("TMDB_API_KEY", readServerEnv("TMDB_API_KEY"));
}

// Streaming infrastructure

export function getStreamProxyUrl(): string {
  return parseUrlOrPath("STREAM_PROXY_URL", readServerEnv("STREAM_PROXY_URL"));
}

export function getStreamProxyUrlPool(): string[] {
  const rawPool = readServerEnv("STREAM_PROXY_URL_POOL");
  if (rawPool && rawPool.trim()) {
    const urls = parseList("STREAM_PROXY_URL_POOL", rawPool)
      .map((u) => u.trim())
      .filter(Boolean);
    if (urls.length > 0) return urls;
  }
  return [getStreamProxyUrl()];
}

export function getStreamProxySecret(): string {
  return requireValue("STREAM_PROXY_SECRET", readServerEnv("STREAM_PROXY_SECRET"));
}

export function getM3u8FetcherUrl(): string {
  return parseUrl("M3U8_FETCHER_URL", readServerEnv("M3U8_FETCHER_URL"));
}

// Provider switches

/** Reads ENABLE_{PROVIDER_ID}, e.g. ENABLE_CINEZO. Every registered provider needs its own flag. */
export function isProviderEnabled(providerId: string): boolean {
  const name = `ENABLE_${providerId.toUpperCase()}`;

  return parseFlag(name, readServerEnv(name));
}

// Media segment services

export function getSegmentProviderPriority(): SegmentProviderName[] {
  return parseList("SEGMENT_PROVIDER_PRIORITY", readServerEnv("SEGMENT_PROVIDER_PRIORITY")).map(
    (name) => parseEnum("SEGMENT_PROVIDER_PRIORITY", name.toLowerCase(), SEGMENT_PROVIDER_NAMES)
  );
}

export function getIntroDbApiUrl(): string {
  return parseUrl("INTRODB_API_URL", readServerEnv("INTRODB_API_URL"));
}

export function getIntroDbApiKey(): string {
  return requireValue("INTRODB_API_KEY", readServerEnv("INTRODB_API_KEY"));
}

export function getSkipDbApiUrl(): string {
  return parseUrl("SKIPDB_API_URL", readServerEnv("SKIPDB_API_URL"));
}

export function getSkipDbApiKey(): string {
  return requireValue("SKIPDB_API_KEY", readServerEnv("SKIPDB_API_KEY"));
}

// Cache and database

export function getCacheBackend(): CacheBackend {
  return parseEnum("CACHE_BACKEND", readServerEnv("CACHE_BACKEND"), CACHE_BACKENDS);
}

export function getCacheMaxEntries(): number {
  return parsePositiveInteger("CACHE_MAX_ENTRIES", readServerEnv("CACHE_MAX_ENTRIES"));
}

export function getRedisUrl(): string | undefined {
  return readServerEnv("REDIS_URL")?.trim() || undefined;
}

/** Local SQLite file on VPS or local development. */
export function getDatabasePath(): string {
  return requireValue("DATABASE_PATH", readServerEnv("DATABASE_PATH"));
}

// Video ads

export function isVideoAdsEnabled(): boolean {
  return parseFlag("ENABLE_VIDEO_ADS", readServerEnv("ENABLE_VIDEO_ADS"));
}

export function getVideoAdTagUrl(): string {
  return parseUrl("VIDEO_AD_TAG_URL", readServerEnv("VIDEO_AD_TAG_URL"));
}

export function getVideoAdZoneId(): string {
  return requireValue("VIDEO_AD_ZONE_ID", readServerEnv("VIDEO_AD_ZONE_ID"));
}

export function getVideoAdCooldownMin(): number {
  return parsePositiveInteger(
    "VIDEO_AD_COOLDOWN_MIN",
    readServerEnv("VIDEO_AD_COOLDOWN_MIN")
  );
}

export function getVideoAdEpisodesBetween(): number {
  return parsePositiveInteger("VIDEO_AD_EPISODES_BETWEEN", readServerEnv("VIDEO_AD_EPISODES_BETWEEN"));
}

export function getVideoAdRequestTimeoutMs(): number {
  return parsePositiveInteger(
    "VIDEO_AD_REQUEST_TIMEOUT_MS",
    readServerEnv("VIDEO_AD_REQUEST_TIMEOUT_MS")
  );
}

export function getVideoAdEcpmUsd(): number {
  return parseNonNegativeNumber("VIDEO_AD_ECPM_USD", readServerEnv("VIDEO_AD_ECPM_USD"));
}

// Integrations and diagnostics

export function getCorsAllowedOrigins(): string[] {
  return parseList("CORS_ALLOWED_ORIGINS", readServerEnv("CORS_ALLOWED_ORIGINS"));
}

export function getLogLevel(): LogLevel {
  return parseEnum("LOG_LEVEL", readServerEnv("LOG_LEVEL")?.toLowerCase(), LOG_LEVELS);
}
