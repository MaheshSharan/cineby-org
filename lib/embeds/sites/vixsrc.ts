import type { EmbedBuildUrlOptions, EmbedNormalizedEvent, EmbedProvider } from "../types";

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
  },
  get allowedOrigins(): string[] {
    const host = getVixsrcHost();
    try {
      const url = new URL(host);
      return [url.origin, "https://vixsrc.to", "https://vixcloud.co"];
    } catch {
      return ["https://vixsrc.to", "https://vixcloud.co"];
    }
  },
  buildUrl(opts: EmbedBuildUrlOptions): string {
    const host = getVixsrcHost();
    const id = opts.tmdbId ?? opts.imdbId;
    if (!id) {
      throw new Error("[vixsrcEmbed] Either tmdbId or imdbId is required");
    }

    const path =
      opts.type === "tv"
        ? `/tv/${id}/${opts.season ?? 1}/${opts.episode ?? 1}`
        : `/movie/${id}`;

    const url = new URL(`${host}${path}`);

    if (opts.startAtSec && opts.startAtSec > 0) {
      url.searchParams.set("startAt", Math.floor(opts.startAtSec).toString());
    }

    if (opts.autoplay !== undefined) {
      url.searchParams.set("autoplay", opts.autoplay ? "true" : "false");
    }

    if (opts.lang) {
      url.searchParams.set("lang", opts.lang);
    }

    if (opts.theme?.primary) {
      url.searchParams.set("primaryColor", opts.theme.primary.replace(/^#/, ""));
    }
    if (opts.theme?.secondary) {
      url.searchParams.set("secondaryColor", opts.theme.secondary.replace(/^#/, ""));
    }

    return url.toString();
  },
  parseEvent(origin: string, data: unknown): EmbedNormalizedEvent | null {
    if (!vixsrcEmbed.allowedOrigins.includes(origin)) {
      return null;
    }

    if (!data || typeof data !== "object") return null;
    const payload = data as Record<string, unknown>;

    // vixsrc progress events: { type: "PLAYER_EVENT", data: { event: "timeupdate"|"play"|"pause"|"ended"|"seeked", currentTime, duration, video_id } }
    // or direct { event: "timeupdate", currentTime, duration, video_id }
    let eventName = "";
    let currentTime: number | undefined;
    let duration: number | undefined;
    let videoId: string | undefined;

    if (payload.type === "PLAYER_EVENT" && typeof payload.data === "object" && payload.data !== null) {
      const inner = payload.data as Record<string, unknown>;
      eventName = String(inner.event || "");
      currentTime = typeof inner.currentTime === "number" ? inner.currentTime : undefined;
      duration = typeof inner.duration === "number" ? inner.duration : undefined;
      videoId = inner.video_id ? String(inner.video_id) : undefined;
    } else if (typeof payload.event === "string") {
      eventName = payload.event;
      currentTime = typeof payload.currentTime === "number" ? payload.currentTime : undefined;
      duration = typeof payload.duration === "number" ? payload.duration : undefined;
      videoId = payload.video_id ? String(payload.video_id) : undefined;
    }

    if (!["play", "pause", "seeked", "timeupdate", "ended"].includes(eventName)) {
      return null;
    }

    return {
      event: eventName as EmbedNormalizedEvent["event"],
      currentTime,
      duration,
      videoId,
    };
  },
  iframe: {
    allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen",
    referrerPolicy: "origin",
  },
};
