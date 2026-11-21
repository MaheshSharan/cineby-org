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
  { id: "player", title: "Player Mode & Embeds" },
  { id: "cache", title: "Cache & Database" },
  { id: "integrations", title: "Authentication & Integrations" },
] as const;

export type EnvCategoryId = (typeof ENV_CATEGORIES)[number]["id"];


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
  { name: "NEXT_PUBLIC_TRAILER_API_URL", category: "tmdb", scope: "public", kind: "url" },

  // 3. Player Mode & Embeds
  { name: "PLAYER_MODE", category: "player", scope: "server", kind: ["embed"] },
  { name: "ENABLE_EMBED_PLAYERS", category: "player", scope: "server", kind: "flag" },
  {
    name: "EMBED_SERVER_PRIORITY",
    category: "player",
    scope: "server",
    kind: "list",
  },
  {
    name: "EMBED_DEFAULT_SERVER",
    category: "player",
    scope: "server",
    kind: "string",
  },
  {
    name: "EMBED_LOAD_TIMEOUT_MS",
    category: "player",
    scope: "server",
    kind: "int",
  },
  {
    name: "VIDBOLT_EMBED_HOST",
    category: "player",
    scope: "server",
    kind: "url",
    requiredWhen: () => false,
  },
  {
    name: "VIXSRC_EMBED_HOST",
    category: "player",
    scope: "server",
    kind: "url",
    requiredWhen: () => false,
  },
  {
    name: "VIDY_EMBED_HOST",
    category: "player",
    scope: "server",
    kind: "url",
    requiredWhen: () => false,
  },
  {
    name: "VIDNEST_EMBED_HOST",
    category: "player",
    scope: "server",
    kind: "url",
    requiredWhen: () => false,
  },

  // 4. Cache & Database
  { name: "CACHE_BACKEND", category: "cache", scope: "server", kind: ["memory", "kv"] },
  { name: "CACHE_MAX_ENTRIES", category: "cache", scope: "server", kind: "int" },
  {
    name: "DATABASE_PATH",
    category: "cache",
    scope: "server",
    kind: "string",
  },

  // 5. Authentication & Integrations
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
  { name: "NEXT_PUBLIC_ENABLE_CLARITY", category: "integrations", scope: "public", kind: "flag" },
  {
    name: "NEXT_PUBLIC_CLARITY_PROJECT_ID",
    category: "integrations",
    scope: "public",
    kind: "string",
    requiredWhen: (env) => env.NEXT_PUBLIC_ENABLE_CLARITY === "true",
  },
  {
    name: "NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION",
    category: "integrations",
    scope: "public",
    kind: "string",
    requiredWhen: () => false,
  },
  {
    name: "NEXT_PUBLIC_NATIVE_BANNER_URL",
    category: "integrations",
    scope: "public",
    kind: "url",
    requiredWhen: (env) => Boolean(env.NEXT_PUBLIC_NATIVE_BANNER_URL?.trim()),
  },
  {
    name: "NEXT_PUBLIC_SOCIAL_BAR_URL",
    category: "integrations",
    scope: "public",
    kind: "url",
    requiredWhen: (env) => Boolean(env.NEXT_PUBLIC_SOCIAL_BAR_URL?.trim()),
  },
  {
    name: "NEXT_PUBLIC_DEVTOOLS_GUARD_ENABLED",
    category: "integrations",
    scope: "public",
    kind: "flag",
    requiredWhen: () => false,
  },
  {
    name: "NEXT_PUBLIC_CHRISTMAS_EVENT",
    category: "integrations",
    scope: "public",
    kind: "flag",
    requiredWhen: () => false,
  },
  { name: "CORS_ALLOWED_ORIGINS", category: "integrations", scope: "server", kind: "list" },
  { name: "LOG_LEVEL", category: "integrations", scope: "server", kind: ["debug", "info", "warn", "error"] },
];

/** Non-secret variables used in production. */
export function getProductionVariables(): readonly EnvVariable[] {
  return ENV_MANIFEST.filter(
    (variable) =>
      variable.scope !== "secret" &&
      (variable.environments ?? ["production", "development"]).includes("production")
  );
}
