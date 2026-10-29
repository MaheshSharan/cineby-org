import type { EmbedBuildUrlOptions, EmbedNormalizedEvent, EmbedProvider } from "../types";
import { DEFAULT_EMBED_SANDBOX } from "../types";
import { parseEmbedMessage } from "../common";

function getVidnestHost(): string {
  const envHost = process.env.VIDNEST_EMBED_HOST?.trim();
  if (envHost) {
    return envHost.replace(/\/+$/, "");
  }
  return "https://vidnest.fun";
}

export const vidnestEmbed: EmbedProvider = {
  id: "vidnest",
  name: "VidNest",
  capabilities: {
    startAt: true,
    events: true,
    theme: false,
    autoplay: true,
    lang: false,
    idType: "tmdb",
    anime: true,
    tvControls: true,
  },
  get allowedOrigins(): string[] {
    const host = getVidnestHost();
    try {
      const url = new URL(host);
      return Array.from(
        new Set([
          url.origin,
          "https://vidnest.fun",
          "https://www.vidnest.fun",
          "https://player.vidnest.fun",
        ])
      );
    } catch {
      return ["https://vidnest.fun", "https://www.vidnest.fun", "https://player.vidnest.fun"];
    }
  },
  buildUrl(opts: EmbedBuildUrlOptions): string {
    const host = getVidnestHost();

    const season = opts.season && opts.season > 0 ? Math.floor(opts.season) : 1;
    const episode = opts.episode && opts.episode > 0 ? Math.floor(opts.episode) : 1;

    let path = "";
    if (opts.type === "anime") {
      const animeId = opts.anilistId ?? opts.tmdbId;
      if (!animeId) {
        throw new Error("[vidnestEmbed] anilistId or tmdbId is required for anime");
      }
      path = `/anime/${animeId}/${episode}/sub`;
    } else if (opts.type === "tv") {
      const id = opts.tmdbId;
      if (!id) {
        throw new Error("[vidnestEmbed] tmdbId is required for tv shows");
      }
      path = `/tv/${id}/${season}/${episode}`;
    } else {
      const id = opts.tmdbId;
      if (!id) {
        throw new Error("[vidnestEmbed] tmdbId is required for movies");
      }
      path = `/movie/${id}`;
    }

    const params = new URLSearchParams();

    // Resume position
    const startSec = opts.startAtSec ?? opts.progress;
    if (typeof startSec === "number" && startSec > 0) {
      params.set("startAt", String(Math.floor(startSec)));
    }

    // Server parameter if specified
    const serverParam = process.env.NEXT_PUBLIC_VIDNEST_SERVER?.trim();
    if (serverParam) {
      params.set("server", serverParam);
    }

    const qs = params.toString();
    return qs ? `${host}${path}?${qs}` : `${host}${path}`;
  },
  parseEvent(origin: string, data: unknown): EmbedNormalizedEvent | null {
    return parseEmbedMessage(origin, vidnestEmbed.allowedOrigins, data);
  },
  iframe: {
    allow: "encrypted-media; autoplay *; fullscreen *",
    referrerPolicy: "origin-when-cross-origin",
    // Test with DEFAULT_EMBED_SANDBOX: if anti-sandbox is triggered, can be relaxed to undefined
    sandbox: DEFAULT_EMBED_SANDBOX,
  },
};
