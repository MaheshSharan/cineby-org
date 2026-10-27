import { getSidHeaders, getTabSid } from "@/lib/security/sid";
import { decryptStreamResponse, getTabEcdhPublicKeyJwk, getTabPublicKeyJwk, type EncryptedStreamEnvelope } from "@/lib/security/tabCrypto";
import type { Quality, StreamResponse } from "@/lib/providers/types";
import { fetchVixsrcPayloadFromBrowser } from "@/lib/providers/sources/vixsrc/client";
import { fetchVidyPayloadFromBrowser } from "@/lib/providers/sources/vidy/client";
import type { MediaSource, QualityLabel, SubtitleTrack } from "../types";
import type { StreamRequest, StreamResolutionResult } from "./types";
import { createPlaylistBlob, revokeAllBlobs } from "../utils/blobPool";
import { fetchActiveProviders } from "./activeProviders";
import { registerPlaylistOrigins } from "@/lib/player/media/clientProxyPool";

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

function isCinejoyServer(serverId: string): boolean {
  return serverId === "cinejoy" || serverId.startsWith("cinejoy-");
}

function isCinezoServer(serverId: string): boolean {
  return serverId === "cinezo" || serverId.startsWith("cinezo-");
}

function isVixsrcServer(serverId: string): boolean {
  return serverId === "vixsrc" || serverId.startsWith("vixsrc-");
}

const VIDY_CHILD_SERVER_IDS = [
  "miami",
  "boise",
  "atlanta",
  "seattle",
  "denver",
  "phoenix",
  "portland",
  "austin",
  "dallas",
  "tampa",
  "orlando",
  "munich",
  "berlin",
  "paris",
  "delhi",
  "cancun",
];

function isVidyServer(serverId: string): boolean {
  return (
    serverId === "vidy" ||
    serverId.startsWith("vidy-") ||
    VIDY_CHILD_SERVER_IDS.includes(serverId)
  );
}

async function buildFetchResponse(
  serverId: string,
  request: StreamRequest
): Promise<Response> {
  // "default" — ask the server which providers are active, then call only
  // the matching client fetcher. This avoids wasting browser fetches on
  // disabled providers and ensures the right seed/payload reaches the server.
  if (serverId === "default" || serverId === "") {
    let activeProviderIds: string[] = [];

    try {
      activeProviderIds = (await fetchActiveProviders()).map((p) => p.id);
    } catch {
      // If the providers endpoint fails, fall through to server-side GET
    }

    // Try each active provider's client fetcher in the order the server returned
    // Note: Vidy uses server-side resolution by default to avoid client-side CORS/WAF blocks.
    for (const providerId of activeProviderIds) {
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
            headers: { "Content-Type": "application/json", ...getSidHeaders() },
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
    }

    // All client fetchers failed or no active providers — let server handle it
    const [autoPk, autoEcdh] = await Promise.all([
      getTabPublicKeyJwk(),
      getTabEcdhPublicKeyJwk(),
    ]);
    return fetch("/api/stream/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getSidHeaders() },
      body: JSON.stringify({
        tmdbId: request.mediaId,
        type: request.mediaType,
        season: request.seasonNumber,
        episode: request.episodeNumber,
        server: serverId,
        clientPublicKey: autoPk,
        clientEcdhKey: autoEcdh,
      }),
      signal: request.signal,
    });
  }

  const [clientPublicKey, clientEcdhKey] = await Promise.all([
    getTabPublicKeyJwk(),
    getTabEcdhPublicKeyJwk(),
  ]);

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
        headers: { "Content-Type": "application/json", ...getSidHeaders() },
        body: JSON.stringify({
          tmdbId: request.mediaId,
          type: request.mediaType,
          season: request.seasonNumber,
          episode: request.episodeNumber,
          server: serverId,
          embedHtml: payload.embedHtml,
          clientPublicKey,
        clientEcdhKey,
      }),
        signal: request.signal,
      });
    }
  }

  if (isCinejoyServer(serverId)) {
    return fetch("/api/stream/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getSidHeaders() },
      body: JSON.stringify({
        tmdbId: request.mediaId,
        type: request.mediaType,
        season: request.seasonNumber,
        episode: request.episodeNumber,
        server: serverId,
      }),
      signal: request.signal,
    });
  }

  if (isCinezoServer(serverId)) {
    // Cinezo stream resolution is handled cleanly server-side
    return fetch("/api/stream/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getSidHeaders() },
      body: JSON.stringify({
        tmdbId: request.mediaId,
        type: request.mediaType,
        season: request.seasonNumber,
        episode: request.episodeNumber,
        server: serverId,
        clientPublicKey,
        clientEcdhKey,
      }),
      signal: request.signal,
    });
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
        headers: { "Content-Type": "application/json", ...getSidHeaders() },
        body: JSON.stringify({
          tmdbId: request.mediaId,
          type: request.mediaType,
          season: request.seasonNumber,
          episode: request.episodeNumber,
          server: serverId,
          vidyCiphertext: payload.ciphertext,
          vidySeed: payload.seed,
          vidyServerId: payload.serverId,
          clientPublicKey,
        clientEcdhKey,
      }),
        signal: request.signal,
      });
    }

    // Targeted Vidy child server had no playable stream — do not fall back to other servers
    return new Response(JSON.stringify({ sources: [], subtitles: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...getSidHeaders() },
    });
  }

  // If specific Vixsrc was targeted and failed, return empty directly
  if (isVixsrcServer(serverId)) {
    return new Response(JSON.stringify({ sources: [], subtitles: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...getSidHeaders() },
    });
  }

  // Unrecognised provider or initial auto search — fall through to server-side
  return fetch("/api/stream/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getSidHeaders() },
    body: JSON.stringify({
      tmdbId: request.mediaId,
      type: request.mediaType,
      season: request.seasonNumber,
      episode: request.episodeNumber,
      server: serverId,
      clientPublicKey,
        clientEcdhKey,
      }),
    signal: request.signal,
  });
}

function needsM3u8Rewrite(url: string): boolean {
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) return false;
  // Vidy-style CDNs that block datacenter IPs or require residential fetch
  return (
    /\.(top|workers\.dev|st|cc)\//i.test(url) ||
    url.includes("echogate") ||
    url.includes("/api/stream/proxy") ||
    url.includes("token=")
  );
}

/**
 * Fetch and rewrite an M3U8 playlist through /api/stream/m3u8 (mode 1: server-side fetch).
 * Used for CDNs (Vidy) that block browser-direct access. The Vercel M3U8 fetcher
 * (M3U8_FETCHER_URL) is used server-side to bypass datacenter IP blocks.
 */
async function rewriteM3u8ToBlobUrl(
  m3u8Url: string,
  headers: Record<string, string>,
  signal?: AbortSignal
): Promise<string | null> {
  try {
    const clientPublicKey = await getTabPublicKeyJwk();
    const rewriteRes = await fetch("/api/stream/m3u8", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getSidHeaders() },
      body: JSON.stringify({ url: m3u8Url, headers, sid: getTabSid(), clientPublicKey }),
      signal,
    });
    if (!rewriteRes.ok) return null;
    const rewrittenText = await rewriteRes.text();
    if (!rewrittenText.trimStart().startsWith("#EXTM3U")) return null;
    registerPlaylistOrigins(rewrittenText);
    return createPlaylistBlob(rewrittenText);
  } catch {
    return null;
  }
}

export async function resolveStream(
  serverId: string,
  request: StreamRequest
): Promise<StreamResolutionResult> {
  try {
    const fetchRes = await buildFetchResponse(serverId, request);

    if (fetchRes.ok) {
      const data: unknown = await fetchRes.json().catch(() => null);
      let payload: StreamResponse | null = null;
      if (data && typeof data === "object") {
        if ("encrypted" in data && (data as { encrypted: unknown }).encrypted === true) {
          try {
            payload = await decryptStreamResponse<StreamResponse>(data as EncryptedStreamEnvelope);
          } catch {
            // Decryption failure falls through to payload = null (signals empty stream result)
            payload = null;
          }
        } else if ("sources" in data) {
          payload = data as StreamResponse;
        }
      }

      if (payload && "sources" in payload) {

        // Clean up previous stream's blobs before registering new stream
        revokeAllBlobs();

        const sources = payload.sources ?? [];
        const mappedSources: MediaSource[] = [];

        const mappedThumbnails = (payload.thumbnails ?? []).filter((t) => Boolean(t.url));

        for (let i = 0; i < sources.length; i++) {
          const src = sources[i];
          let finalUrl = src.url;

          // Only rewrite the primary active source (index 0) to avoid wasting network
          // requests and leaking orphaned Blobs for secondary sources.
          // Applies only to CDNs (e.g. moon.goldenkite.top) that require residential/proxy fetch.
          if (i === 0 && src.type === "hls" && needsM3u8Rewrite(src.url)) {
            const blobUrl = await rewriteM3u8ToBlobUrl(
              src.url,
              src.headers ?? {},
              request.signal
            );
            if (blobUrl) finalUrl = blobUrl;
          }

          mappedSources.push({
            id: src.provider.id,
            kind: "default" as const,
            name: src.provider.name,
            url: finalUrl,
            format: src.type === "unknown" ? "hls" : src.type,
            quality: toQualityLabel(src.quality),
            headers: src.headers,
            thumbnail: mappedThumbnails[0]?.url ?? null,
            thumbnails: mappedThumbnails,
          });
        }

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
          thumbnails: mappedThumbnails,
        };
      }
    }
  } catch {
    // Network error or client abort — return empty
  }

  return { source: null, sources: [], subtitles: [], thumbnails: [] };
}
