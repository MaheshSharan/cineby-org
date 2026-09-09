/**
 * Client-Side Vixsrc Stream Fetcher
 *
 * Runs directly inside the user's browser using the client's residential IP.
 * Bypasses Cloudflare Bot Fight Mode 403s that block datacenter IPs.
 *
 * Why this works / why the server-side path fails:
 *
 *   Cloudflare on vixsrc.to blocks requests based on two signals:
 *   1. sec-fetch-site: The API calls must appear same-origin (no `Origin` header
 *      from a foreign domain). A server-side fetch or a browser fetch from
 *      localhost sends Origin: http://localhost:3000 → sec-fetch-site: cross-site
 *      → Cloudflare issues a JS challenge (cf-mitigated: challenge → 403).
 *   2. cf_clearance cookie: Cloudflare sets this cookie in the browser after the
 *      user's browser passes the initial JS challenge when visiting vixsrc.to.
 *      Subsequent same-origin requests include this cookie automatically → pass.
 *
 *   When this fetcher runs in the user's browser:
 *   - The browser already has the cf_clearance cookie from visiting vixsrc.to
 *     (or will obtain it the first time). It's sent automatically with every
 *     request to vixsrc.to.
 *   - We do NOT set an `Origin` header on the API call, so the browser sends
 *     it as a same-origin-like request (sec-fetch-site: same-origin).
 *
 * Flow:
 *  1. GET vixsrc.to/api/movie|tv/{id}  → { src: "/embed/..." }
 *  2. GET vixsrc.to/embed/...          → raw embed HTML containing window.masterPlaylist
 *  3. POST embed HTML to /api/stream/resolve for server-side playlist extraction
 */

export interface VixsrcClientPayload {
  embedHtml: string;
  embedUrl: string;
}

const BASE_URL = "https://vixsrc.to";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36";

export async function fetchVixsrcPayloadFromBrowser(params: {
  tmdbId: number;
  type: "movie" | "tv";
  season?: number;
  episode?: number;
  signal?: AbortSignal;
}): Promise<VixsrcClientPayload | null> {
  const { tmdbId, type, season, episode, signal } = params;

  try {
    // Step 1: hit the vixsrc API to get the embed path.
    // IMPORTANT: Do NOT set Origin or a cross-origin Referer here.
    // The request must look same-origin to pass Cloudflare's sec-fetch-site check.
    // The browser will automatically attach the cf_clearance cookie.
    const apiPath =
      type === "tv"
        ? `/api/tv/${tmdbId}/${season ?? 1}/${episode ?? 1}`
        : `/api/movie/${tmdbId}`;

    const pageUrl =
      type === "tv"
        ? `${BASE_URL}/tv/${tmdbId}/${season ?? 1}/${episode ?? 1}`
        : `${BASE_URL}/movie/${tmdbId}`;

    const apiRes = await fetch(`${BASE_URL}${apiPath}`, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "application/json, text/plain, */*",
        // Referer must be the vixsrc.to page itself (same-origin) — not localhost
        Referer: pageUrl,
        "Accept-Language": "en-US,en;q=0.9",
        // sec-fetch-* are set automatically by the browser; do not override them
      },
      // credentials: "include" ensures the browser sends cf_clearance and any
      // other vixsrc.to cookies that were set during the user's previous visit
      credentials: "include",
      signal,
    });

    if (!apiRes.ok) return null;

    const apiData: unknown = await apiRes.json().catch(() => null);
    if (!apiData || typeof apiData !== "object" || !("src" in apiData)) return null;

    const src = (apiData as { src?: string }).src;
    if (!src || typeof src !== "string") return null;

    const embedUrl = `${BASE_URL}${src}`;

    // Step 2: fetch the embed page HTML (contains window.masterPlaylist).
    // Referer is the vixsrc.to page — same-origin again.
    const embedRes = await fetch(embedUrl, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: BASE_URL,
        "Accept-Language": "en-US,en;q=0.9",
      },
      credentials: "include",
      signal,
    });

    if (!embedRes.ok) return null;

    const embedHtml = await embedRes.text();

    // Quick sanity check — if masterPlaylist isn't in the page, don't bother posting it
    if (!embedHtml.includes("masterPlaylist")) return null;

    return { embedHtml, embedUrl };
  } catch {
    return null;
  }
}
