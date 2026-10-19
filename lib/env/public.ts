// Browser-visible configuration (NEXT_PUBLIC_*). Safe to import from client code.
//
// Every variable must be read as a literal member access on the process environment: Next.js inlines the value
// at build time and cannot do that for dynamic lookups. Getters are called lazily (never at module
// scope) so a missing value fails where it is used, not while the bundle is being imported.

import { parseFlag, parseUrl, requireValue } from "./read";

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

export function isImageProxyEnabled(): boolean {
  return parseFlag("NEXT_PUBLIC_ENABLE_IMAGE_PROXY", process.env.NEXT_PUBLIC_ENABLE_IMAGE_PROXY);
}

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

export function getTrailerApiUrl(): string {
  return parseUrl("NEXT_PUBLIC_TRAILER_API_URL", process.env.NEXT_PUBLIC_TRAILER_API_URL);
}
