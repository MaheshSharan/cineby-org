import type { EmbedBuildUrlOptions, EmbedNormalizedEvent, EmbedProvider } from "../types";
import { cleanHexColor, parseEmbedMessage } from "../common";

function getVixsrcHost(): string {
  const envHost = process.env.VIXSRC_EMBED_HOST?.trim();
  if (envHost) {
    return envHost.replace(/\/+$/, "");
  }
  return "https://vixsrc.to";
}

export const vixsrcEmbed: EmbedProvider = {
  id: "vixsrc",
  name: "Vixsrc",
  capabilities: {
    startAt: true,
    events: true,
    theme: true,
    autoplay: true,
    lang: true,
    idType: "both",
    anime: false,
    tvControls: false,
  },
  get allowedOrigins(): string[] {
    const host = getVixsrcHost();
    try {
      const url = new URL(host);
      return Array.from(
        new Set([
          url.origin,
          "https://vixsrc.to",
          "https://www.vixsrc.to",
          "https://vixcloud.co",
          "https://www.vixcloud.co",
        ])
      );
    } catch {
      return [
        "https://vixsrc.to",
        "https://www.vixsrc.to",
        "https://vixcloud.co",
        "https://www.vixcloud.co",
      ];
    }
  },
  buildUrl(opts: EmbedBuildUrlOptions): string {
    const host = getVixsrcHost();
    const id = opts.tmdbId ?? opts.imdbId;
    if (!id) {
      throw new Error("[vixsrcEmbed] Either tmdbId or imdbId is required");
    }

    const season = opts.season && opts.season > 0 ? Math.floor(opts.season) : 1;
    const episode = opts.episode && opts.episode > 0 ? Math.floor(opts.episode) : 1;
    const isShow = opts.type === "tv" || (opts.type === "anime" && (opts.season !== undefined || opts.episode !== undefined));

    const path = isShow ? `/tv/${id}/${season}/${episode}` : `/movie/${id}`;

    const url = new URL(`${host}${path}`);

    const startSec = opts.startAtSec ?? opts.progress;
    if (startSec && startSec > 0) {
      url.searchParams.set("startAt", Math.floor(startSec).toString());
    }

    if (opts.autoplay !== undefined) {
      url.searchParams.set("autoplay", opts.autoplay ? "true" : "false");
    }

    if (opts.lang) {
      url.searchParams.set("lang", opts.lang);
    }

    const primaryColor = cleanHexColor(opts.theme?.primary);
    if (primaryColor) {
      url.searchParams.set("primaryColor", primaryColor);
    }
    const secondaryColor = cleanHexColor(opts.theme?.secondary);
    if (secondaryColor) {
      url.searchParams.set("secondaryColor", secondaryColor);
    }

    return url.toString();
  },
  parseEvent(origin: string, data: unknown): EmbedNormalizedEvent | null {
    return parseEmbedMessage(origin, vixsrcEmbed.allowedOrigins, data);
  },
  iframe: {
    allow: "encrypted-media; autoplay *; fullscreen *",
    referrerPolicy: "origin",
    // Vixsrc actively detects iframe sandbox restrictions and rejects playback with "Please Disable Sandbox"
    sandbox: undefined,
  },
};
