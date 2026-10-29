import type { EmbedBuildUrlOptions, EmbedNormalizedEvent, EmbedProvider } from "../types";

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
    lang: true,
    idType: "tmdb",
  },
  get allowedOrigins(): string[] {
    const host = getVidyHost();
    try {
      const url = new URL(host);
      return [url.origin, "https://vidy.st", "https://player.vidy.st"];
    } catch {
      return ["https://vidy.st", "https://player.vidy.st"];
    }
  },
  buildUrl(opts: EmbedBuildUrlOptions): string {
    const host = getVidyHost();
    const id = opts.tmdbId;
    if (!id) {
      throw new Error("[vidyEmbed] tmdbId is required");
    }

    const path =
      opts.type === "tv"
        ? `/embed/tv/${id}/${opts.season ?? 1}/${opts.episode ?? 1}`
        : `/embed/movie/${id}`;

    const url = new URL(`${host}${path}`);

    if (opts.startAtSec && opts.startAtSec > 0) {
      url.searchParams.set("t", Math.floor(opts.startAtSec).toString());
    }

    if (opts.autoplay !== undefined) {
      url.searchParams.set("autoplay", opts.autoplay ? "1" : "0");
    }

    if (opts.lang) {
      url.searchParams.set("lang", opts.lang);
    }

    if (opts.theme?.primary) {
      url.searchParams.set("color", opts.theme.primary.replace(/^#/, ""));
    }

    return url.toString();
  },
  parseEvent(origin: string, data: unknown): EmbedNormalizedEvent | null {
    if (!vidyEmbed.allowedOrigins.includes(origin)) {
      return null;
    }

    if (!data || typeof data !== "object") return null;
    const payload = data as Record<string, unknown>;

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
