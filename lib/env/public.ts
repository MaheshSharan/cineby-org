// Browser-visible configuration (NEXT_PUBLIC_*). Safe to import from client code.
//
// Every variable must be read as a literal member access on the process environment: Next.js inlines the value
// at build time and cannot do that for dynamic lookups. Getters are called lazily (never at module
// scope) so a missing value fails where it is used, not while the bundle is being imported.

import { parseEnum, parseFlag, parseUrl, requireValue } from "./read";

export function getSiteUrl(): string {
  return parseUrl("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL);
}

/** Public support address shown in the footer. */
export function getContactEmail(): string {
  return requireValue("NEXT_PUBLIC_CONTACT_EMAIL", process.env.NEXT_PUBLIC_CONTACT_EMAIL);
}

/** Address named in the Terms of Service and Privacy Policy for legal and data requests. */
export function getLegalContactEmail(): string {
  return requireValue(
    "NEXT_PUBLIC_LEGAL_CONTACT_EMAIL",
    process.env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL
  );
}

export function getTmdbDefaultLanguage(): string {
  return requireValue(
    "NEXT_PUBLIC_TMDB_DEFAULT_LANGUAGE",
    process.env.NEXT_PUBLIC_TMDB_DEFAULT_LANGUAGE
  );
}

export function getTmdbImageBaseUrl(): string {
  return parseUrl("NEXT_PUBLIC_TMDB_IMAGE_BASE_URL", process.env.NEXT_PUBLIC_TMDB_IMAGE_BASE_URL);
}

/**
 * How images reach the browser:
 * - `tmdb`: straight from the TMDB CDN (JPEG, no proxy variable needed).
 * - `wsrv`: the browser asks the wsrv resizing service directly for resized WebP. No Cloudflare Worker request.
 * - `worker`: through the assets Worker, which fronts the same service. Every image costs a Worker request.
 */
export const IMAGE_MODES = ["tmdb", "wsrv", "worker"] as const;
export type ImageMode = (typeof IMAGE_MODES)[number];

export function getImageMode(): ImageMode {
  return parseEnum("NEXT_PUBLIC_IMAGE_MODE", process.env.NEXT_PUBLIC_IMAGE_MODE, IMAGE_MODES);
}

/** Base URL of the resizing service for the `wsrv` and `worker` modes. */
export function getImageProxyUrl(): string {
  return parseUrl("NEXT_PUBLIC_IMAGE_PROXY_URL", process.env.NEXT_PUBLIC_IMAGE_PROXY_URL);
}

export function getFlagsApiBaseUrl(): string {
  return parseUrl("NEXT_PUBLIC_FLAGS_API_BASE_URL", process.env.NEXT_PUBLIC_FLAGS_API_BASE_URL);
}

export function getGoogleClientId(): string {
  return requireValue("NEXT_PUBLIC_GOOGLE_CLIENT_ID", process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
}

export function isAnalyticsEnabled(): boolean {
  return parseFlag("NEXT_PUBLIC_ENABLE_ANALYTICS", process.env.NEXT_PUBLIC_ENABLE_ANALYTICS);
}


/** GA4 measurement ID. Only required, and only read, while analytics is enabled. */
export function getGaMeasurementId(): string {
  return requireValue(
    "NEXT_PUBLIC_GA_MEASUREMENT_ID",
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  );
}

export function isClarityEnabled(): boolean {
  return parseFlag("NEXT_PUBLIC_ENABLE_CLARITY", process.env.NEXT_PUBLIC_ENABLE_CLARITY);
}

/** Microsoft Clarity project ID. Only required, and only read, while Clarity is enabled. */
export function getClarityProjectId(): string {
  return requireValue("NEXT_PUBLIC_CLARITY_PROJECT_ID", process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID);
}

export function getTrailerApiUrl(): string {
  return parseUrl("NEXT_PUBLIC_TRAILER_API_URL", process.env.NEXT_PUBLIC_TRAILER_API_URL);
}

/**
 * Script URL of the native banner ad, as given by the ad network. Optional: without it no banner is rendered.
 * The last path segment is the placement key.
 */
export function getNativeBannerUrl(): string | undefined {
  const value = process.env.NEXT_PUBLIC_NATIVE_BANNER_URL?.trim();
  return value ? parseUrl("NEXT_PUBLIC_NATIVE_BANNER_URL", value) : undefined;
}

/** Script URL of the social bar ad. Optional: without it no social bar is loaded. */
export function getSocialBarUrl(): string | undefined {
  const value = process.env.NEXT_PUBLIC_SOCIAL_BAR_URL?.trim();
  return value ? parseUrl("NEXT_PUBLIC_SOCIAL_BAR_URL", value) : undefined;
}

/** Google Search Console verification token. Optional. */
export function getGoogleSiteVerification(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() || undefined;
}

/**
 * Whether DevTools guard is enabled.
 * Defaults to true in production unless explicitly set to "false".
 */
export function isDevtoolsGuardEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_DEVTOOLS_GUARD_ENABLED !== undefined) {
    return process.env.NEXT_PUBLIC_DEVTOOLS_GUARD_ENABLED === "true";
  }
  return process.env.NODE_ENV === "production";
}


