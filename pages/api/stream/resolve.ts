import type { NextApiRequest, NextApiResponse } from "next";

import { resolveAllStreams, fetchProviderSubtitles } from "@/lib/providers/registry";
import { parseVixsrcEmbedHtml } from "@/lib/providers/sources/vixsrc";
import { decryptVidyClientPayload } from "@/lib/providers/sources/vidy";
import { buildStreamProxyUrl } from "@/lib/providers/proxy";
import type { MediaType, StreamResponse } from "@/lib/providers/types";
import { logger } from "@/lib/logger";
import { withApiContext } from "@/lib/validation";
import { applyCorsHeaders } from "@/lib/cors";
import { isProviderEnabled } from "@/lib/env/server";
import { isSidFlagged } from "@/lib/security/canaryStore";
import { isValidSid } from "@/lib/security/sid";

function extractClientIp(req: NextApiRequest): string {
  const cfIp = req.headers["cf-connecting-ip"];
  if (typeof cfIp === "string" && cfIp.trim()) return cfIp.trim();

  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }

  const sockIp = req.socket?.remoteAddress;
  if (typeof sockIp === "string" && sockIp.trim()) return sockIp.trim();

  return "";
}

export default withApiContext(
  "api/stream/resolve",
  async (
    req: NextApiRequest,
    res: NextApiResponse<StreamResponse | { error: string }>
  ) => {
    if (applyCorsHeaders(req, res)) {
      return;
    }

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

    if (req.method !== "GET" && req.method !== "POST") {
      res.setHeader("Allow", ["GET", "POST"]);
      res.status(405).json({ error: `Method ${req.method} Not Allowed` });
      return;
    }

    const sid = req.headers["x-cb-sid"];

    // A tab whose DevTools canary fired gets no new stream sources.
    if (isValidSid(sid) && (await isSidFlagged(sid))) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const clientIp = extractClientIp(req);

    // Support both GET query and POST JSON body
    const body = (req.method === "POST" && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
    const query = req.query;

    const tmdbId = body.tmdbId ?? query.tmdbId;
    const type = body.type ?? query.type;
    const season = body.season ?? query.season;
    const episode = body.episode ?? query.episode;
    const server = body.server ?? query.server;

    // Vixsrc client-assisted payload
    const vixsrcEmbedHtml = typeof body.embedHtml === "string" ? body.embedHtml : undefined;

    // Vidy client-assisted payload
    const vidyCiphertext = typeof body.vidyCiphertext === "string" ? body.vidyCiphertext : undefined;
    const vidySeed = typeof body.vidySeed === "string" ? body.vidySeed : undefined;
    const vidyServerId = typeof body.vidyServerId === "string" ? body.vidyServerId : "miami";

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

      // 1. If client provided a browser-fetched vixsrc embed HTML, parse and sign immediately.
      // Guard with ENABLE_VIXSRC so toggling the env flag also disables the client-assisted path.
      if (vixsrcEmbedHtml && isProviderEnabled("vixsrc")) {
        logger.debug(`[resolve] Processing client-provided Vixsrc embed HTML for tmdbId=${parsedTmdbId}`);
        const source = parseVixsrcEmbedHtml(vixsrcEmbedHtml);

        if (source) {
          const finalSource = {
            ...source,
            url: source.direct ? source.url : buildStreamProxyUrl(source.url, source.headers, clientIp),
          };

          logger.debug(`[resolve] Vixsrc client-assisted resolution succeeded for tmdbId=${parsedTmdbId}`);
          res.status(200).json({ sources: [finalSource], subtitles: [] });
          return;
        }
        logger.warn(`[resolve] Vixsrc client-provided embed HTML failed to parse, falling back to server`);
      }

      // 2. If client provided a browser-fetched Vidy payload, decrypt and sign immediately.
      // Guard with ENABLE_VIDY so toggling the env flag also disables the client-assisted path.
      if (vidyCiphertext && vidySeed && isProviderEnabled("vidy")) {
        logger.debug(`[resolve] Processing client-provided Vidy payload for tmdbId=${parsedTmdbId}`);
        const decrypted = decryptVidyClientPayload(vidyCiphertext, vidySeed, parsedTmdbId, vidyServerId);
        const rawSources = decrypted.sources;

        if (rawSources.length > 0) {
          const finalSources = rawSources.map((src) => ({
            ...src,
            url: src.direct ? src.url : buildStreamProxyUrl(src.url, src.headers, clientIp),
          }));

          const finalThumbnails = decrypted.thumbnails.map((thumb) => ({
            ...thumb,
            url: buildStreamProxyUrl(thumb.url, thumb.headers, clientIp),
          }));

          const fallbackSubtitles = await fetchProviderSubtitles(
            {
              tmdbId: parsedTmdbId,
              type: mediaType,
              season: seasonNum,
              episode: episodeNum,
            },
            targetServer || `vidy-${vidyServerId}`,
            clientIp
          );

          const payloadSubs = decrypted.subtitles ?? [];
          const seenLangs = new Set<string>(payloadSubs.map((s) => (s.lang || "unknown").toLowerCase()));
          const extraSubs = fallbackSubtitles.filter((s) => !seenLangs.has((s.lang || "unknown").toLowerCase()));
          const combinedSubtitles = [...payloadSubs, ...extraSubs];

          logger.debug(`[resolve] Vidy client-assisted resolution succeeded: ${finalSources.length} sources, ${combinedSubtitles.length} subtitles, ${finalThumbnails.length} thumbnails`);
          res.status(200).json({ sources: finalSources, subtitles: combinedSubtitles, thumbnails: finalThumbnails });
          return;
        }
        logger.warn(`[resolve] Vidy client-provided payload failed to decrypt any sources, falling back to server`);
      }

      logger.debug(`[resolve] Starting server-side stream resolution for tmdbId=${parsedTmdbId}, type=${mediaType}, server=${targetServer || "default"}`);

      const result = await resolveAllStreams(
        {
          tmdbId: parsedTmdbId,
          type: mediaType,
          season: seasonNum,
          episode: episodeNum,
        },
        { targetProviderId: targetServer, clientIp }
      );

      logger.debug(`[resolve] First pass found ${result.sources?.length ?? 0} sources`);

      res.status(200).json(result);
      return;
    } catch (error) {
      logger.error("[resolve] Fatal error in resolveAllStreams", error);
      res.status(500).json({
        sources: [],
        subtitles: [],
      });
      return;
    }
  }
);
