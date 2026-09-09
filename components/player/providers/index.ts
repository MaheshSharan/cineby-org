import type { Quality, StreamResponse } from "@/lib/providers/types";
import { fetchVidkingPayloadFromBrowser } from "@/lib/providers/sources/vidking/client";
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

export async function resolveStream(
  serverId: string,
  request: StreamRequest
): Promise<StreamResolutionResult> {
  const params = new URLSearchParams({
    tmdbId: request.mediaId.toString(),
    type: request.mediaType,
  });

  if (request.seasonNumber) {
    params.set("season", request.seasonNumber.toString());
  }
  if (request.episodeNumber) {
    params.set("episode", request.episodeNumber.toString());
  }
  if (serverId && serverId !== "default") {
    params.set("server", serverId);
  }

  try {
    // 1. Try client-side Vidking resolution to bypass Cloudflare 429 datacenter rate limits
    const clientPayload = await fetchVidkingPayloadFromBrowser({
      tmdbId: request.mediaId,
      type: request.mediaType,
      season: request.seasonNumber ?? undefined,
      episode: request.episodeNumber ?? undefined,
      targetServer: serverId,
      signal: request.signal,
    });

    const res = clientPayload
      ? await fetch("/api/stream/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tmdbId: request.mediaId,
            type: request.mediaType,
            season: request.seasonNumber,
            episode: request.episodeNumber,
            server: serverId,
            ciphertext: clientPayload.ciphertext,
            seed: clientPayload.seed,
            serverId: clientPayload.serverId,
          }),
          signal: request.signal,
        })
      : await fetch(`/api/stream/resolve?${params.toString()}`, {
          signal: request.signal,
        });

    if (res.ok) {
      const data: unknown = await res.json().catch(() => null);
      if (data && typeof data === "object" && "sources" in data) {
        const payload = data as StreamResponse;

        const mappedSources: MediaSource[] = (payload.sources ?? []).map((src) => ({
          id: src.provider.id,
          kind: "default",
          name: src.provider.name,
          url: src.url,
          format: src.type === "unknown" ? "hls" : src.type,
          quality: toQualityLabel(src.quality),
          headers: src.headers,
        }));

        const mappedSubtitles: SubtitleTrack[] = (payload.subtitles ?? []).map((sub, idx) => ({
          id: sub.id || `sub-${idx}-${sub.lang || sub.label}`,
          lang: sub.lang || sub.label.toLowerCase().slice(0, 2),
          label: sub.label,
          url: sub.url,
          flagUrl: sub.flagUrl,
        }));

        const selectedSource = mappedSources[0] ?? null;

        return {
          source: selectedSource,
          sources: mappedSources,
          subtitles: mappedSubtitles,
        };
      }
    }
  } catch {
    // Network or client abort
  }

  return {
    source: null,
    sources: [],
    subtitles: [],
  };
}
