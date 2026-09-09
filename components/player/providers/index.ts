import type { Quality, StreamResponse } from "@/lib/providers/types";
import { fetchVidkingPayloadFromBrowser } from "@/lib/providers/sources/vidking/client";
import { fetchVixsrcPayloadFromBrowser } from "@/lib/providers/sources/vixsrc/client";
import { fetchVidyPayloadFromBrowser } from "@/lib/providers/sources/vidy/client";
import type { MediaSource, QualityLabel, SubtitleTrack } from "../types";
import type { StreamRequest, StreamResolutionResult } from "./types";

function toQualityLabel(quality?: Quality | string): QualityLabel | null {
  switch (quality) {
    case "2160p":
    case "1080p":
    case "720p":
    case "480p":
      return quality;
    default:
      return null;
  }
}

function isVidkingServer(serverId: string): boolean {
  return (
    serverId === "vidking" ||
    serverId.startsWith("vidking-") ||
    serverId === "breach" ||
    serverId === "yoru" ||
    serverId === "cypher" ||
    serverId === "neon"
  );
}

function isVixsrcServer(serverId: string): boolean {
  return serverId === "vixsrc" || serverId.startsWith("vixsrc-");
}

function isVidyServer(serverId: string): boolean {
  return serverId === "vidy" || serverId.startsWith("vidy-");
}

async function buildFetchResponse(
  serverId: string,
  request: StreamRequest,
  params: URLSearchParams
): Promise<Response> {
  // "default" — ask the server which providers are active, then call only
  // the matching client fetcher. This avoids wasting browser fetches on
  // disabled providers and ensures the right seed/payload reaches the server.
  if (serverId === "default" || serverId === "") {
    let activeProviderIds: string[] = [];

    try {
      const provRes = await fetch("/api/stream/providers", { signal: request.signal });
      if (provRes.ok) {
        const data = (await provRes.json()) as { providers: { id: string }[] };
        activeProviderIds = (data.providers ?? []).map((p) => p.id);
      }
    } catch {
      // If the providers endpoint fails, fall through to server-side GET
    }

    // Try each active provider's client fetcher in the order the server returned
    for (const providerId of activeProviderIds) {
      if (providerId === "vidy") {
        const payload = await fetchVidyPayloadFromBrowser({
          tmdbId: request.mediaId,
          type: request.mediaType,
          season: request.seasonNumber ?? undefined,
          episode: request.episodeNumber ?? undefined,
          signal: request.signal,
        });
        if (payload) {
          return fetch("/api/stream/resolve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tmdbId: request.mediaId,
              type: request.mediaType,
              season: request.seasonNumber,
              episode: request.episodeNumber,
              server: serverId,
              vidyCiphertext: payload.ciphertext,
              vidySeed: payload.seed,
              vidyServerId: payload.serverId,
            }),
            signal: request.signal,
          });
        }
      }

      if (providerId === "vixsrc") {
        const payload = await fetchVixsrcPayloadFromBrowser({
          tmdbId: request.mediaId,
          type: request.mediaType,
          season: request.seasonNumber ?? undefined,
          episode: request.episodeNumber ?? undefined,
          signal: request.signal,
        });
        if (payload) {
          return fetch("/api/stream/resolve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tmdbId: request.mediaId,
              type: request.mediaType,
              season: request.seasonNumber,
              episode: request.episodeNumber,
              server: serverId,
              embedHtml: payload.embedHtml,
            }),
            signal: request.signal,
          });
        }
      }

      if (providerId === "vidking") {
        const payload = await fetchVidkingPayloadFromBrowser({
          tmdbId: request.mediaId,
          type: request.mediaType,
          season: request.seasonNumber ?? undefined,
          episode: request.episodeNumber ?? undefined,
          signal: request.signal,
        });
        if (payload) {
          return fetch("/api/stream/resolve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tmdbId: request.mediaId,
              type: request.mediaType,
              season: request.seasonNumber,
              episode: request.episodeNumber,
              server: serverId,
              ciphertext: payload.ciphertext,
              seed: payload.seed,
              serverId: payload.serverId,
            }),
            signal: request.signal,
          });
        }
      }
    }

    // All client fetchers failed or no active providers — let server handle it
    return fetch(`/api/stream/resolve?${params.toString()}`, {
      signal: request.signal,
    });
  }

  if (isVidkingServer(serverId)) {
    const payload = await fetchVidkingPayloadFromBrowser({
      tmdbId: request.mediaId,
      type: request.mediaType,
      season: request.seasonNumber ?? undefined,
      episode: request.episodeNumber ?? undefined,
      targetServer: serverId,
      signal: request.signal,
    });

    if (payload) {
      return fetch("/api/stream/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: request.mediaId,
          type: request.mediaType,
          season: request.seasonNumber,
          episode: request.episodeNumber,
          server: serverId,
          ciphertext: payload.ciphertext,
          seed: payload.seed,
          serverId: payload.serverId,
        }),
        signal: request.signal,
      });
    }
  }

  if (isVixsrcServer(serverId)) {
    const payload = await fetchVixsrcPayloadFromBrowser({
      tmdbId: request.mediaId,
      type: request.mediaType,
      season: request.seasonNumber ?? undefined,
      episode: request.episodeNumber ?? undefined,
      signal: request.signal,
    });

    if (payload) {
      return fetch("/api/stream/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: request.mediaId,
          type: request.mediaType,
          season: request.seasonNumber,
          episode: request.episodeNumber,
          server: serverId,
          embedHtml: payload.embedHtml,
        }),
        signal: request.signal,
      });
    }
  }

  if (isVidyServer(serverId)) {
    const payload = await fetchVidyPayloadFromBrowser({
      tmdbId: request.mediaId,
      type: request.mediaType,
      season: request.seasonNumber ?? undefined,
      episode: request.episodeNumber ?? undefined,
      targetServer: serverId,
      signal: request.signal,
    });

    if (payload) {
      return fetch("/api/stream/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: request.mediaId,
          type: request.mediaType,
          season: request.seasonNumber,
          episode: request.episodeNumber,
          server: serverId,
          vidyCiphertext: payload.ciphertext,
          vidySeed: payload.seed,
          vidyServerId: payload.serverId,
        }),
        signal: request.signal,
      });
    }
  }

  // Client fetch failed or unrecognised provider — fall through to server-side
  return fetch(`/api/stream/resolve?${params.toString()}`, {
    signal: request.signal,
  });
}

/**
 * Hosts that block Cloudflare Worker datacenter IPs but allow browser requests.
 * M3U8 playlists from these hosts must be fetched browser-side and rewritten
 * through /api/stream/m3u8 before being passed to HLS.js as a Blob URL.
 */
const BROWSER_FETCH_M3U8_HOSTS = ["peakstorm.top", "moon.peakstorm", "sun.peakstorm"];

function needsBrowserM3u8Fetch(url: string): boolean {
  return BROWSER_FETCH_M3U8_HOSTS.some((host) => url.includes(host));
}

/**
 * Fetch an M3U8 that is blocked from server/datacenter IPs browser-side,
 * POST it to /api/stream/m3u8 for chunk URL rewriting, and return a Blob URL
 * that HLS.js can load directly. Returns null if any step fails.
 */
async function rewriteM3u8ToBlobUrl(
  m3u8Url: string,
  headers: Record<string, string>,
  signal?: AbortSignal
): Promise<string | null> {
  try {
    // Step 1: fetch the raw M3U8 from the blocked CDN using the browser's residential IP
    const m3u8Res = await fetch(m3u8Url, {
      headers: {
        "User-Agent": headers["User-Agent"] ?? navigator.userAgent,
        Referer: headers["Referer"] ?? "https://www.vidy.st/",
        Origin: headers["Origin"] ?? "https://www.vidy.st",
        Accept: "*/*",
      },
      signal,
    });
    if (!m3u8Res.ok) return null;

    const m3u8Text = await m3u8Res.text();
    if (!m3u8Text.trimStart().startsWith("#EXTM3U")) return null;

    // Step 2: POST raw M3U8 to server for chunk URL signing + proxy rewriting
    const rewriteRes = await fetch("/api/stream/m3u8", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ m3u8Text, headers, baseUrl: m3u8Url }),
      signal,
    });
    if (!rewriteRes.ok) return null;

    const rewrittenText = await rewriteRes.text();

    // Step 3: create a Blob URL for HLS.js — works identically to a remote URL
    const blob = new Blob([rewrittenText], { type: "application/vnd.apple.mpegurl" });
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export async function resolveStream(
  serverId: string,
  request: StreamRequest
): Promise<StreamResolutionResult> {
  const params = new URLSearchParams({
    tmdbId: request.mediaId.toString(),
    type: request.mediaType,
  });

  if (request.seasonNumber) params.set("season", request.seasonNumber.toString());
  if (request.episodeNumber) params.set("episode", request.episodeNumber.toString());
  if (serverId && serverId !== "default") params.set("server", serverId);

  try {
    const fetchRes = await buildFetchResponse(serverId, request, params);

    if (fetchRes.ok) {
      const data: unknown = await fetchRes.json().catch(() => null);
      if (data && typeof data === "object" && "sources" in data) {
        const payload = data as StreamResponse;

        // Rewrite any M3U8 URLs from CDNs that block server IPs to Blob URLs.
        // Run all rewrites in parallel — independent per source.
        const mappedSources: MediaSource[] = await Promise.all(
          (payload.sources ?? []).map(async (src) => {
            let finalUrl = src.url;

            if (
              src.type === "hls" &&
              needsBrowserM3u8Fetch(src.url)
            ) {
              const blobUrl = await rewriteM3u8ToBlobUrl(
                src.url,
                src.headers ?? {},
                request.signal
              );
              if (blobUrl) finalUrl = blobUrl;
            }

            return {
              id: src.provider.id,
              kind: "default" as const,
              name: src.provider.name,
              url: finalUrl,
              format: src.type === "unknown" ? "hls" : src.type,
              quality: toQualityLabel(src.quality),
              headers: src.headers,
            };
          })
        );

        const mappedSubtitles: SubtitleTrack[] = (payload.subtitles ?? []).map((sub, idx) => ({
          id: sub.id || `sub-${idx}-${sub.lang || sub.label}`,
          lang: sub.lang || sub.label.toLowerCase().slice(0, 2),
          label: sub.label,
          url: sub.url,
          flagUrl: sub.flagUrl,
        }));

        return {
          source: mappedSources[0] ?? null,
          sources: mappedSources,
          subtitles: mappedSubtitles,
        };
      }
    }
  } catch {
    // Network error or client abort — return empty
  }

  return { source: null, sources: [], subtitles: [] };
}
