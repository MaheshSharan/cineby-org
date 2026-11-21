import type { EmbedBuildUrlOptions, EmbedNormalizedEvent, EmbedProvider } from "../types";
import { cleanHexColor, parseEmbedMessage } from "../common";

function getVidboltHost(): string {
  const envHost = process.env.VIDBOLT_EMBED_HOST?.trim();
  if (envHost) {
    return envHost.replace(/\/+$/, "");
  }
  return "https://vidbolt.pro";
}

export const VIDBOLT_ORIGIN = "https://vidbolt.pro";

export const vidboltEmbed: EmbedProvider = {
  id: "vidbolt",
  name: "VidBolt",
  capabilities: {
    startAt: true,
    events: true,
    theme: true,
    autoplay: true,
    lang: true,
    idType: "tmdb",
    anime: true,
    tvControls: true,
  },
  get allowedOrigins(): string[] {
    const host = getVidboltHost();
    try {
      const url = new URL(host);
      return Array.from(
        new Set([url.origin, "https://vidbolt.pro", "https://www.vidbolt.pro"])
      );
    } catch {
      return ["https://vidbolt.pro", "https://www.vidbolt.pro"];
    }
  },
  buildUrl(opts: EmbedBuildUrlOptions): string {
    const host = getVidboltHost();

    const season = opts.season && opts.season > 0 ? Math.floor(opts.season) : 1;
    const episode = opts.episode && opts.episode > 0 ? Math.floor(opts.episode) : 1;

    let path = "";
    if (opts.type === "anime") {
      if (opts.anilistId) {
        path = `/anime/${opts.anilistId}/${episode}`;
      } else if (opts.tmdbId) {
        path = `/tv/${opts.tmdbId}/${season}/${episode}`;
      } else {
        throw new Error("[vidboltEmbed] anilistId or tmdbId is required for anime");
      }
    } else if (opts.type === "tv") {
      const id = opts.tmdbId;
      if (!id) {
        throw new Error("[vidboltEmbed] tmdbId is required for tv");
      }
      path = `/tv/${id}/${season}/${episode}`;
    } else {
      const id = opts.tmdbId;
      if (!id) {
        throw new Error("[vidboltEmbed] tmdbId is required for movie");
      }
      path = `/movie/${id}`;
    }

    const url = new URL(`${host}${path}`);

    // Query parameters
    const primaryColor = cleanHexColor(opts.theme?.primary);
    if (primaryColor) {
      url.searchParams.set("theme", primaryColor);
    }

    const startSec = opts.startAtSec ?? opts.progress;
    if (startSec && startSec > 0) {
      url.searchParams.set("startAt", Math.floor(startSec).toString());
    }

    if (opts.autoplay !== false) {
      url.searchParams.set("autoPlay", "true");
    }

    if (opts.lang) {
      url.searchParams.set("audio", opts.lang);
    }

    return url.toString();
  },
  parseEvent(origin: string, data: unknown): EmbedNormalizedEvent | null {
    return parseEmbedMessage(origin, vidboltEmbed.allowedOrigins, data);
  },
  iframe: {
    allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
    referrerPolicy: "origin",
  },
  resume: {
    targetOrigin: VIDBOLT_ORIGIN,
    buildMessage: (startAtSec) => ({ type: "seek", time: Math.floor(startAtSec) }),
  },
};
