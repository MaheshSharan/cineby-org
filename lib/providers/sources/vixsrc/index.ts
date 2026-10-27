import type { Provider, StreamRequest, StreamResponse, StreamSource } from "../../types";
import { logError } from "@/lib/logger";

const PROVIDER_ID = "vixsrc";
const PROVIDER_NAME = "Server 4";
const BASE_URL = "https://vixsrc.to";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

// Extracts window.masterPlaylist from embed page HTML and returns a StreamSource
// Actual masterPlaylist shape observed from vixsrc.to embed pages:
//   window.masterPlaylist = {
//     params: { 'token': '...', 'expires': '...', 'asn': '' },
//     url: 'https://vixsrc.to/playlist/305248',
//   }

export function parseVixsrcEmbedHtml(embedHtml: string): StreamSource | null {
  const playlistMatch =
    embedHtml.match(/window\.masterPlaylist\s*=\s*(\{[\s\S]*?\})\s*;/) ||
    embedHtml.match(/window\["masterPlaylist"\]\s*=\s*(\{[\s\S]*?\})\s*;/) ||
    embedHtml.match(/masterPlaylist\s*=\s*(\{[\s\S]*?\})\s*;/);

  if (!playlistMatch) return null;

  const block = playlistMatch[1];

  // Extract the base URL
  const urlM = block.match(/url:\s*['"]([^'"]+)['"]/);
  if (!urlM) return null;

  const rawUrl = urlM[1];

  // Try nested params object first: params: { 'token': '...', 'expires': '...' }
  const paramsBlockM = block.match(/params\s*:\s*\{([^}]+)\}/);

  let token: string | null = null;
  let expires: string | null = null;

  if (paramsBlockM) {
    const paramsBlock = paramsBlockM[1];
    const tokenM = paramsBlock.match(/['"]?token['"]?\s*:\s*['"]([^'"]+)['"]/);
    const expiresM = paramsBlock.match(/['"]?expires['"]?\s*:\s*['"]([^'"]+)['"]/);
    token = tokenM?.[1] ?? null;
    expires = expiresM?.[1] ?? null;
  }

  // Fall back to flat keys at the top level of the masterPlaylist object
  if (!token) {
    const tokenM = block.match(/['"]?token['"]?\s*:\s*['"]([^'"]+)['"]/);
    token = tokenM?.[1] ?? null;
  }
  if (!expires) {
    const expiresM = block.match(/['"]?expires['"]?\s*:\s*['"]([^'"]+)['"]/);
    expires = expiresM?.[1] ?? null;
  }

  if (!token || !expires) return null;

  const separator = rawUrl.includes("?") ? "&" : "?";
  const playlistUrl = `${rawUrl}${separator}token=${token}&expires=${expires}&h=1&lang=en`;

  return {
    url: playlistUrl,
    headers: {
      Referer: BASE_URL,
      Origin: BASE_URL,
      "User-Agent": BROWSER_UA,
    },
    type: "hls",
    quality: "unknown",
    audioTracks: [{ language: "en", label: "English" }],
    provider: { id: PROVIDER_ID, name: PROVIDER_NAME },
  };
}

// Server-side scrape runs in non-Cloudflare environments. In production on Cloudflare Workers,
// vixsrc.to blocks datacenter IPs, so the client-assisted browser path is used instead.

async function fetchApiEmbed(req: StreamRequest): Promise<string | null> {
  const { tmdbId, type, season, episode, signal } = req;

  const apiPath =
    type === "tv"
      ? `/api/tv/${tmdbId}/${season ?? 1}/${episode ?? 1}`
      : `/api/movie/${tmdbId}`;

  const refererUrl =
    type === "tv"
      ? `${BASE_URL}/tv/${tmdbId}/${season ?? 1}/${episode ?? 1}`
      : `${BASE_URL}/movie/${tmdbId}`;

  const res = await fetch(`${BASE_URL}${apiPath}`, {
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "application/json, text/plain, */*",
      Referer: refererUrl,
      Origin: BASE_URL,
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Dest": "empty",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal,
  });

  if (!res.ok) {
    logError("Provider:vixsrc", `Vixsrc API returned HTTP ${res.status} (${res.statusText}) for ${apiPath}`);
    return null;
  }

  const data: unknown = await res.json().catch(() => null);
  if (!data || typeof data !== "object" || !("src" in data)) {
    logError("Provider:vixsrc", `Invalid JSON or missing 'src' in Vixsrc API response for ${apiPath}`);
    return null;
  }

  const src = (data as { src?: string }).src;
  return src ? `${BASE_URL}${src}` : null;
}

async function fetchEmbedHtml(embedUrl: string, signal?: AbortSignal): Promise<string | null> {
  const res = await fetch(embedUrl, {
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Referer: BASE_URL,
      "Sec-Fetch-Dest": "iframe",
      "Sec-Fetch-Mode": "navigate",
    },
    signal,
  });

  if (!res.ok) {
    logError("Provider:vixsrc", `Embed page returned HTTP ${res.status} (${res.statusText})`);
    return null;
  }

  return res.text();
}

async function scrape(req: StreamRequest): Promise<StreamResponse> {
  if (req.signal?.aborted) {
    return { sources: [], subtitles: [] };
  }

  try {
    const embedUrl = await fetchApiEmbed(req);
    if (!embedUrl) return { sources: [], subtitles: [] };

    const embedHtml = await fetchEmbedHtml(embedUrl, req.signal);
    if (!embedHtml) return { sources: [], subtitles: [] };

    const source = parseVixsrcEmbedHtml(embedHtml);
    if (!source) {
      logError("Provider:vixsrc", "masterPlaylist not found in embed HTML");
      return { sources: [], subtitles: [] };
    }

    return { sources: [source], subtitles: [] };
  } catch (error) {
    if (req.signal?.aborted || (error instanceof Error && error.name === "AbortError")) {
      return { sources: [], subtitles: [] };
    }
    logError(`Provider:${PROVIDER_ID}`, error);
    return { sources: [], subtitles: [] };
  }
}

export const vixsrcProvider: Provider = {
  id: PROVIDER_ID,
  name: PROVIDER_NAME,
  priority: 20,
  fetch: scrape,
};
