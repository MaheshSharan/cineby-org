import type { NextApiRequest, NextApiResponse } from "next";

import type { MediaType, SubtitleTrack } from "@/lib/providers/types";
import { fetchProviderSubtitles } from "@/lib/providers/registry";
import { withApiContext } from "@/lib/validation";
import { applyCorsHeaders } from "@/lib/cors";
import { getPlayerModeConfig } from "@/lib/player/modeConfig";

export default withApiContext(
  "api/stream/subtitles",
  async (
    req: NextApiRequest,
    res: NextApiResponse<{ subtitles: SubtitleTrack[] } | { error: string }>
  ) => {
    if (applyCorsHeaders(req, res)) {
      return;
    }

    const modeConfig = getPlayerModeConfig();
    if (!modeConfig.nativeEnabled) {
      res.status(404).json({ error: "native_player_disabled" });
      return;
    }

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

    if (req.method !== "GET") {
      res.setHeader("Allow", ["GET"]);
      res.status(405).json({ error: `Method ${req.method} Not Allowed` });
      return;
    }


    const { tmdbId, type, season, episode, server } = req.query;

    const parsedTmdbId = Number.parseInt(String(tmdbId || ""), 10);
    if (!parsedTmdbId || Number.isNaN(parsedTmdbId)) {
      res.status(400).json({ error: "Missing or invalid tmdbId parameter." });
      return;
    }

    const mediaType: MediaType = type === "tv" ? "tv" : "movie";
    const seasonNum = season ? Number.parseInt(String(season), 10) : undefined;
    const episodeNum = episode ? Number.parseInt(String(episode), 10) : undefined;
    const activeServerId = typeof server === "string" && server.trim() ? server.trim() : undefined;

    try {
      const subtitles = await fetchProviderSubtitles(
        {
          tmdbId: parsedTmdbId,
          type: mediaType,
          season: seasonNum,
          episode: episodeNum,
        },
        activeServerId
      );

      res.status(200).json({ subtitles });
    } catch {
      res.status(200).json({ subtitles: [] });
    }
  }
);
