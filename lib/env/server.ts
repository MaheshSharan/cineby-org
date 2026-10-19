// Server-only configuration. Never import this from components or hooks.
//
// Values come from process.env (local Node/Bun, `wrangler dev`, Next build) or from the Cloudflare
// context when running on Workers. There are no defaults: a missing value throws a descriptive
// EnvConfigError. Optional features are disabled only by an explicit "false".

import { SEGMENT_PROVIDER_NAMES, type SegmentProviderName } from "@/lib/segments/types";
import {
  parseEnum,
  parseFlag,
  parseList,
  parsePositiveInteger,
  parseUrl,
  parseUrlOrPath,
  requireValue,
} from "./read";

const CLOUDFLARE_CONTEXT = Symbol.for("__cloudflare-context__");

export const CACHE_BACKENDS = ["memory", "redis"] as const;
export type CacheBackend = (typeof CACHE_BACKENDS)[number];

export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

/** Raw lookup: process.env first, then the OpenNext Cloudflare context (vars and secrets). */
export function readServerEnv(name: string): string | undefined {
  const fromProcess = process.env[name];

  if (fromProcess !== undefined) {
    return fromProcess;
  }

  const context = (globalThis as unknown as Record<symbol, { env?: Record<string, unknown> }>)[
    CLOUDFLARE_CONTEXT
  ];
  const fromContext = context?.env?.[name];

  return typeof fromContext === "string" ? fromContext : undefined;
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

export function getUpstashRedisRestUrl(): string {
  return parseUrl("UPSTASH_REDIS_REST_URL", readServerEnv("UPSTASH_REDIS_REST_URL"));
}

export function getUpstashRedisRestToken(): string {
  return requireValue("UPSTASH_REDIS_REST_TOKEN", readServerEnv("UPSTASH_REDIS_REST_TOKEN"));
}

/** Local SQLite file. Production uses the D1 binding, so this is read only outside Cloudflare. */
export function getDatabasePath(): string {
  return requireValue("DATABASE_PATH", readServerEnv("DATABASE_PATH"));
}

// Integrations and diagnostics

export function getCorsAllowedOrigins(): string[] {
  return parseList("CORS_ALLOWED_ORIGINS", readServerEnv("CORS_ALLOWED_ORIGINS"));
}

export function getLogLevel(): LogLevel {
  return parseEnum("LOG_LEVEL", readServerEnv("LOG_LEVEL")?.toLowerCase(), LOG_LEVELS);
}
