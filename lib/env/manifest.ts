// Single description of every environment variable the app reads. It drives:
//   - scripts/check-env.ts (validate before dev/build),
//   - tests/env-config.test.ts (keeps .env.example identical to this list).
//
// Adding a variable means adding it here, to .env.example and .env.production.example.

export type EnvScope =
  /** Browser-visible, inlined into the client bundle at build time. */
  | "public"
  /** Server-only, non-sensitive. */
  | "server"
  /** Server-only credential. Provided via secure environment variables. */
  | "secret";

export type EnvKind =
  | "url"
  | "urlOrPath"
  | "flag"
  | "int"
  | "string"
  | "list"
  | readonly string[];

export type EnvSource = Readonly<Record<string, string | undefined>>;

export interface EnvVariable {
  name: string;
  category: EnvCategoryId;
  scope: EnvScope;
  kind: EnvKind;
  /** Defaults to both. */
  environments?: readonly ("production" | "development")[];
  /** Variable is only required when this returns true. Absent means always required. */
  requiredWhen?: (env: EnvSource) => boolean;
}

export const ENV_CATEGORIES = [
  { id: "identity", title: "App & Canonical Identity" },
  { id: "tmdb", title: "TMDB API & Image Assets" },
  { id: "streaming", title: "Streaming Infrastructure & Proxy" },
  { id: "providers", title: "Provider Switches" },
  { id: "segments", title: "Media Segment Services" },
  { id: "cache", title: "Cache & Database" },
  { id: "integrations", title: "Authentication & Integrations" },
  { id: "ads", title: "Video Ads (VAST via Google IMA)" },
] as const;

export type EnvCategoryId = (typeof ENV_CATEGORIES)[number]["id"];

function segmentProviderListed(env: EnvSource, provider: string): boolean {
  return (env.SEGMENT_PROVIDER_PRIORITY ?? "")
    .split(",")
    .some((entry) => entry.trim().toLowerCase() === provider);
}

function videoAdsEnabled(env: EnvSource): boolean {
  return env.ENABLE_VIDEO_ADS?.trim().toLowerCase() === "true";
}

export const ENV_MANIFEST: readonly EnvVariable[] = [
  // 1. App & Canonical Identity
  { name: "NEXT_PUBLIC_SITE_URL", category: "identity", scope: "public", kind: "url" },
  { name: "NEXT_PUBLIC_CONTACT_EMAIL", category: "identity", scope: "public", kind: "string" },
  { name: "NEXT_PUBLIC_LEGAL_CONTACT_EMAIL", category: "identity", scope: "public", kind: "string" },

  // 2. TMDB API & Image Assets
  { name: "TMDB_API_URL", category: "tmdb", scope: "server", kind: "url" },
  { name: "TMDB_API_KEY", category: "tmdb", scope: "secret", kind: "string" },
  { name: "NEXT_PUBLIC_TMDB_DEFAULT_LANGUAGE", category: "tmdb", scope: "public", kind: "string" },
  { name: "NEXT_PUBLIC_IMAGE_MODE", category: "tmdb", scope: "public", kind: ["tmdb", "wsrv", "worker"] },
  {
    name: "NEXT_PUBLIC_IMAGE_PROXY_URL",
    category: "tmdb",
    scope: "public",
    kind: "url",
    requiredWhen: (env) => env.NEXT_PUBLIC_IMAGE_MODE !== "tmdb",
  },
  { name: "NEXT_PUBLIC_TMDB_IMAGE_BASE_URL", category: "tmdb", scope: "public", kind: "url" },

  // 3. Streaming Infrastructure & Proxy
  { name: "STREAM_PROXY_URL", category: "streaming", scope: "server", kind: "urlOrPath" },
  { name: "STREAM_PROXY_SECRET", category: "streaming", scope: "secret", kind: "string" },
  { name: "M3U8_FETCHER_URL", category: "streaming", scope: "server", kind: "url" },
  { name: "NEXT_PUBLIC_TRAILER_API_URL", category: "streaming", scope: "public", kind: "url" },

  // 4. Provider Switches
  { name: "ENABLE_CINEZO", category: "providers", scope: "server", kind: "flag" },
  { name: "ENABLE_VIDY", category: "providers", scope: "server", kind: "flag" },
  { name: "ENABLE_VIXSRC", category: "providers", scope: "server", kind: "flag" },

  // 5. Media Segment Services
  { name: "INTRODB_API_URL", category: "segments", scope: "server", kind: "url" },
  {
    name: "INTRODB_API_KEY",
    category: "segments",
    scope: "secret",
    kind: "string",
    requiredWhen: (env) => segmentProviderListed(env, "introdb"),
  },
  { name: "SKIPDB_API_URL", category: "segments", scope: "server", kind: "url" },
  {
    name: "SKIPDB_API_KEY",
    category: "segments",
    scope: "secret",
    kind: "string",
    requiredWhen: (env) => segmentProviderListed(env, "skipdb"),
  },
  { name: "SEGMENT_PROVIDER_PRIORITY", category: "segments", scope: "server", kind: "list" },

  // 6. Cache & Database
  { name: "CACHE_BACKEND", category: "cache", scope: "server", kind: ["memory", "redis"] },
  {
    name: "REDIS_URL",
    category: "cache",
    scope: "server",
    kind: "string",
    requiredWhen: (env) => env.CACHE_BACKEND === "redis",
  },
  { name: "CACHE_MAX_ENTRIES", category: "cache", scope: "server", kind: "int" },
  {
    name: "DATABASE_PATH",
    category: "cache",
    scope: "server",
    kind: "string",
  },

  // 7. Authentication & Integrations
  { name: "NEXT_PUBLIC_GOOGLE_CLIENT_ID", category: "integrations", scope: "public", kind: "string" },
  { name: "NEXT_PUBLIC_FLAGS_API_BASE_URL", category: "integrations", scope: "public", kind: "url" },
  { name: "NEXT_PUBLIC_ENABLE_ANALYTICS", category: "integrations", scope: "public", kind: "flag" },
  { name: "NEXT_PUBLIC_DEVTOOLS_GUARD_ENABLED", category: "integrations", scope: "public", kind: "flag" },
  {
    name: "NEXT_PUBLIC_GA_MEASUREMENT_ID",
    category: "integrations",
    scope: "public",
    kind: "string",
    requiredWhen: (env) => env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true",
  },
  { name: "CORS_ALLOWED_ORIGINS", category: "integrations", scope: "server", kind: "list" },
  { name: "LOG_LEVEL", category: "integrations", scope: "server", kind: ["debug", "info", "warn", "error"] },

  // 8. Video Ads
  { name: "ENABLE_VIDEO_ADS", category: "ads", scope: "server", kind: "flag" },
  { name: "VIDEO_AD_TAG_URL", category: "ads", scope: "server", kind: "url", requiredWhen: videoAdsEnabled },
  { name: "VIDEO_AD_ZONE_ID", category: "ads", scope: "server", kind: "string", requiredWhen: videoAdsEnabled },
  { name: "VIDEO_AD_COOLDOWN_MIN", category: "ads", scope: "server", kind: "int", requiredWhen: videoAdsEnabled },
  { name: "VIDEO_AD_EPISODES_BETWEEN", category: "ads", scope: "server", kind: "int", requiredWhen: videoAdsEnabled },
  { name: "VIDEO_AD_REQUEST_TIMEOUT_MS", category: "ads", scope: "server", kind: "int", requiredWhen: videoAdsEnabled },
  { name: "VIDEO_AD_ECPM_USD", category: "ads", scope: "server", kind: "string", requiredWhen: videoAdsEnabled },
];

/** Non-secret variables used in production. */
export function getProductionVariables(): readonly EnvVariable[] {
  return ENV_MANIFEST.filter(
    (variable) =>
      variable.scope !== "secret" &&
      (variable.environments ?? ["production", "development"]).includes("production")
  );
}
