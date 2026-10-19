// Single description of every environment variable the app reads. It drives:
//   - scripts/check-env.ts and the build wrapper (validate before dev/build),
//   - tests/env-config.test.ts (keeps .env.example and wrangler.jsonc identical to this list).
//
// Adding a variable means adding it here, to .env.example and (unless it is a secret or
// development-only) to wrangler.jsonc vars. The drift test fails otherwise.

export type EnvScope =
  /** Browser-visible, inlined into the client bundle at build time. */
  | "public"
  /** Server-only, non-sensitive. Lives in wrangler.jsonc vars. */
  | "server"
  /** Server-only credential. Never committed; set with `wrangler secret put`. */
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
  /** Defaults to both. Development-only variables are not part of wrangler.jsonc. */
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
] as const;

export type EnvCategoryId = (typeof ENV_CATEGORIES)[number]["id"];

function segmentProviderListed(env: EnvSource, provider: string): boolean {
  return (env.SEGMENT_PROVIDER_PRIORITY ?? "")
    .split(",")
    .some((entry) => entry.trim().toLowerCase() === provider);
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
  { name: "NEXT_PUBLIC_ENABLE_IMAGE_PROXY", category: "tmdb", scope: "public", kind: "flag" },
  { name: "NEXT_PUBLIC_IMAGE_PROXY_URL", category: "tmdb", scope: "public", kind: "url" },
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
    name: "UPSTASH_REDIS_REST_URL",
    category: "cache",
    scope: "server",
    kind: "url",
    requiredWhen: (env) => env.CACHE_BACKEND === "redis",
  },
  {
    name: "UPSTASH_REDIS_REST_TOKEN",
    category: "cache",
    scope: "secret",
    kind: "string",
    requiredWhen: (env) => env.CACHE_BACKEND === "redis",
  },
  { name: "CACHE_MAX_ENTRIES", category: "cache", scope: "server", kind: "int" },
  // Production uses the D1 binding; a local SQLite file only exists in development.
  {
    name: "DATABASE_PATH",
    category: "cache",
    scope: "server",
    kind: "string",
    environments: ["development"],
  },

  // 7. Authentication & Integrations
  { name: "NEXT_PUBLIC_GOOGLE_CLIENT_ID", category: "integrations", scope: "public", kind: "string" },
  { name: "NEXT_PUBLIC_FLAGS_API_BASE_URL", category: "integrations", scope: "public", kind: "url" },
  { name: "NEXT_PUBLIC_ENABLE_ANALYTICS", category: "integrations", scope: "public", kind: "flag" },
  {
    name: "NEXT_PUBLIC_GA_MEASUREMENT_ID",
    category: "integrations",
    scope: "public",
    kind: "string",
    requiredWhen: (env) => env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true",
  },
  { name: "CORS_ALLOWED_ORIGINS", category: "integrations", scope: "server", kind: "list" },
  { name: "LOG_LEVEL", category: "integrations", scope: "server", kind: ["debug", "info", "warn", "error"] },
];

/** Variables that belong in wrangler.jsonc `vars`: non-secret and used in production. */
export function getWranglerVariables(): readonly EnvVariable[] {
  return ENV_MANIFEST.filter(
    (variable) =>
      variable.scope !== "secret" &&
      (variable.environments ?? ["production", "development"]).includes("production")
  );
}
