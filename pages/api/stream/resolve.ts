import type { NextApiRequest, NextApiResponse } from "next";

import { resolveAllStreams, fetchProviderSubtitles } from "@/lib/providers/registry";
import { decryptVidkingClientSources } from "@/lib/providers/sources/vidking";
import { buildStreamProxyUrl } from "@/lib/providers/proxy";
import type { MediaType, StreamResponse } from "@/lib/providers/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StreamResponse | { error: string }>
) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    return;
  }

  // Support both GET query and POST JSON body
  const body = (req.method === "POST" && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
  const query = req.query;

  const tmdbId = body.tmdbId ?? query.tmdbId;
  const type = body.type ?? query.type;
  const season = body.season ?? query.season;
  const episode = body.episode ?? query.episode;
  const server = body.server ?? query.server;

  const clientCiphertext = typeof body.ciphertext === "string" ? body.ciphertext : typeof query.ciphertext === "string" ? query.ciphertext : undefined;
  const clientSeed = typeof body.seed === "string" ? body.seed : typeof query.seed === "string" ? query.seed : undefined;
  const clientServerId = typeof body.serverId === "string" ? body.serverId : typeof query.serverId === "string" ? query.serverId : "yoru";

  const parsedTmdbId = Number.parseInt(String(tmdbId || ""), 10);
  if (!parsedTmdbId || Number.isNaN(parsedTmdbId)) {
    res.status(400).json({ error: "Missing or invalid tmdbId parameter." });
    return;
  }

  const mediaType: MediaType = type === "tv" ? "tv" : "movie";
  const seasonNum = season ? Number.parseInt(String(season), 10) : undefined;
  const episodeNum = episode ? Number.parseInt(String(episode), 10) : undefined;
  const targetServer = typeof server === "string" && server.trim() ? server.trim() : undefined;

  try {
    // 1. If client provided a browser-fetched encrypted payload, decrypt and sign immediately
    if (clientCiphertext && clientSeed) {
      console.log(`[resolve] Processing client-provided Vidking payload for tmdbId=${parsedTmdbId}`);
      const rawSources = decryptVidkingClientSources(clientCiphertext, clientSeed, parsedTmdbId, clientServerId);

      if (rawSources.length > 0) {
        const proxiedSources = rawSources.map((src) => ({
          ...src,
          url: buildStreamProxyUrl(src.url, src.headers),
        }));

        // Fetch subtitles
        const subtitles = await fetchProviderSubtitles({
          tmdbId: parsedTmdbId,
          type: mediaType,
          season: seasonNum,
          episode: episodeNum,
        }, targetServer || "vidking-yoru");

        console.log(`[resolve] Client-assisted resolution succeeded: ${proxiedSources.length} sources, ${subtitles.length} subtitles`);
        res.status(200).json({
          sources: proxiedSources,
          subtitles,
        });
        return;
      }
      console.warn(`[resolve] Client-provided payload failed to decrypt any sources, falling back to server`);
    }

    console.log(`[resolve] Starting server-side stream resolution for tmdbId=${parsedTmdbId}, type=${mediaType}, server=${targetServer || "default"}`);

    let result = await resolveAllStreams(
      {
        tmdbId: parsedTmdbId,
        type: mediaType,
        season: seasonNum,
        episode: episodeNum,
      },
      { targetProviderId: targetServer }
    );

    console.log(`[resolve] First pass found ${result.sources?.length ?? 0} sources`);

    // If the requested server returned no streams, fall back cleanly to default provider
    if ((!result.sources || result.sources.length === 0) && targetServer) {
      console.log(`[resolve] Falling back to default provider for tmdbId=${parsedTmdbId}`);
      result = await resolveAllStreams(
        {
          tmdbId: parsedTmdbId,
          type: mediaType,
          season: seasonNum,
          episode: episodeNum,
        },
        { targetProviderId: "default" }
      );
      console.log(`[resolve] Fallback pass found ${result.sources?.length ?? 0} sources`);
    }

    res.status(200).json(result);
    return;
  } catch (error) {
    console.error("[resolve] Fatal error in resolveAllStreams:", error);
    res.status(500).json({
      sources: [],
      subtitles: [],
    });
    return;
  }
}
