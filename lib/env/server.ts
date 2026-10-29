// Server-only configuration. Never import this from components or hooks.
//
// Values come from process.env. There are no defaults: a missing value throws a descriptive
// EnvConfigError. Optional features are disabled only by an explicit "false".

import {
  parseEnum,
  parseList,
  parsePositiveInteger,
  parseUrl,
  requireValue,
} from "./read";

export const CACHE_BACKENDS = ["memory", "kv"] as const;
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

// Cache and database

export function getCacheBackend(): CacheBackend {
  return parseEnum("CACHE_BACKEND", readServerEnv("CACHE_BACKEND"), CACHE_BACKENDS);
}

export function getCacheMaxEntries(): number {
  return parsePositiveInteger("CACHE_MAX_ENTRIES", readServerEnv("CACHE_MAX_ENTRIES"));
}

/** Local SQLite file for test/local fallback if needed. */
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
