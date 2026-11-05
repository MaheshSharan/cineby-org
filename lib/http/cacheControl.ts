/**
 * Cache-Control values for server-rendered pages, defined once so every route agrees.
 *
 * max-age lets the browser reuse a page (and the _next/data request behind client-side navigation)
 * without contacting the Worker at all. s-maxage and stale-while-revalidate serve shared caches.
 */
export const PUBLIC_PAGE_CACHE_CONTROL =
  "public, max-age=10800, s-maxage=10800, stale-while-revalidate=86400";

/** For responses that depend on the signed-in user and must never be stored by a shared cache. */
export const PRIVATE_PAGE_CACHE_CONTROL = "private, max-age=0, must-revalidate";
