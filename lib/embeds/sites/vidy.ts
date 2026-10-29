import type { EmbedBuildUrlOptions, EmbedNormalizedEvent, EmbedProvider } from "../types";
import { cleanHexColor, parseEmbedMessage } from "../common";

function getVidyHost(): string {
  const envHost = process.env.VIDY_EMBED_HOST?.trim();
  if (envHost) {
    return envHost.replace(/\/+$/, "");
  }
  return "https://vidy.st";
}

export const vidyEmbed: EmbedProvider = {
  id: "vidy",
  name: "Vidy",
  capabilities: {
    startAt: true,
    events: true,
    theme: true,
    autoplay: true,
    lang: false,
    idType: "tmdb",
    anime: true,
    tvControls: true,
  },
  get allowedOrigins(): string[] {
    const host = getVidyHost();
    try {
      const url = new URL(host);
      return Array.from(
        new Set([url.origin, "https://vidy.st", "https://www.vidy.st", "https://player.vidy.st"])
      );
    } catch {
      return ["https://vidy.st", "https://www.vidy.st", "https://player.vidy.st"];
    }
  },
  buildUrl(opts: EmbedBuildUrlOptions): string {
    const host = getVidyHost();

    let path = "";
    if (opts.type === "anime") {
      const animeId = opts.anilistId ?? opts.tmdbId;
      if (!animeId) {
        throw new Error("[vidyEmbed] anilistId or tmdbId is required for anime");
      }
      path = `/anime/${animeId}/${opts.episode ?? 1}`;
    } else if (opts.type === "tv") {
      const id = opts.tmdbId;
      if (!id) {
        throw new Error("[vidyEmbed] tmdbId is required for tv");
      }
      path = `/tv/${id}/${opts.season ?? 1}/${opts.episode ?? 1}`;
    } else {
      const id = opts.tmdbId;
      if (!id) {
        throw new Error("[vidyEmbed] tmdbId is required for movie");
      }
      path = `/movie/${id}`;
    }

    const url = new URL(`${host}${path}`);

    // Query parameters
    const primaryColor = cleanHexColor(opts.theme?.primary);
    if (primaryColor) {
      url.searchParams.set("color", primaryColor);
    }

    const startSec = opts.startAtSec ?? opts.progress;
    if (startSec && startSec > 0) {
      url.searchParams.set("progress", Math.floor(startSec).toString());
    }

    if (opts.autoplay === true) {
      url.searchParams.set("autoplay", "true");
    }

    // TV & Anime query options
    if (opts.type === "tv" || opts.type === "anime") {
      if (opts.nextEpisode === true) {
        url.searchParams.set("nextEpisode", "true");
      }
      if (opts.episodeSelector === true) {
        url.searchParams.set("episodeSelector", "true");
      }
      if (opts.autoplayNextEpisode === true) {
        url.searchParams.set("autoplayNextEpisode", "true");
      }
    }

    return url.toString();
  },
  parseEvent(origin: string, data: unknown): EmbedNormalizedEvent | null {
    return parseEmbedMessage(origin, vidyEmbed.allowedOrigins, data);
  },
  iframe: {
    allow: "encrypted-media; autoplay *; fullscreen *",
    referrerPolicy: "origin",
  },
};
