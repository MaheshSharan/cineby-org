const rawImageBaseUrl = process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL || "https://image.tmdb.org/t/p";
const imageProxyUrl = process.env.NEXT_PUBLIC_IMAGE_PROXY_URL || "https://assets.cineby.group";
const isProxyEnabled = process.env.NEXT_PUBLIC_ENABLE_IMAGE_PROXY !== "false";

export function getTmdbImageBaseUrl(): string {
  // If the base URL in env accidentally has a proxy prefix like wsrv.nl/?url=, extract the actual target URL
  if (rawImageBaseUrl.includes("url=")) {
    const parts = rawImageBaseUrl.split("url=");
    const target = parts[parts.length - 1];
    return decodeURIComponent(target).replace(/\/+$/, "");
  }

  return rawImageBaseUrl.replace(/\/+$/, "");
}

export function getImageProxyUrl(): string {
  return imageProxyUrl.replace(/\/+$/, "");
}

export function getFlagsApiBaseUrl(): string {
  const flagsUrl = process.env.NEXT_PUBLIC_FLAGS_API_BASE_URL || "https://flagsapi.com";
  return flagsUrl.replace(/\/+$/, "");
}

export function getEnvVar(name: string): string | undefined {
  if (process.env[name] !== undefined) {
    return process.env[name];
  }
  try {
    const cfContext = (globalThis as unknown as Record<symbol, { env?: Record<string, unknown> }>)[
      Symbol.for("__cloudflare-context__")
    ];
    const val = cfContext?.env?.[name];
    if (typeof val === "string") return val;
  } catch {
    // Non-Cloudflare environments may throw when accessing global context symbol; safely ignored per §16
  }
  return undefined;
}

export function isImageProxyEnabled(): boolean {
  return isProxyEnabled;
}

export function getCacheBackend(): "memory" | "redis" {
  const backend = getEnvVar("CACHE_BACKEND")?.toLowerCase();
  if (backend === "redis") return "redis";
  if (backend === "memory") return "memory";
  if (getEnvVar("UPSTASH_REDIS_REST_URL") || getEnvVar("REDIS_URL")) {
    return "redis";
  }
  return "memory";
}

export function getCacheMaxEntries(): number {
  const parsed = Number.parseInt(getEnvVar("CACHE_MAX_ENTRIES") ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 5000;
}

export function getRedisUrl(): string | undefined {
  return getEnvVar("REDIS_URL")?.trim() || undefined;
}

export function getUpstashRedisRestUrl(): string | undefined {
  return (
    getEnvVar("UPSTASH_REDIS_REST_URL")?.trim() ||
    getEnvVar("REDIS_URL")?.trim() ||
    undefined
  );
}

export function getUpstashRedisRestToken(): string | undefined {
  return getEnvVar("UPSTASH_REDIS_REST_TOKEN")?.trim() || undefined;
}

export function getCorsAllowedOrigins(): string[] {
  const envVal = getEnvVar("CORS_ALLOWED_ORIGINS")?.trim();
  if (!envVal) {
    return [];
  }
  return envVal
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

