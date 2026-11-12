import type { EmbedBuildUrlOptions, EmbedEventType, EmbedNormalizedEvent, EmbedProvider } from "../types";
import { cleanHexColor, isOriginAllowed, toNonNegativeNumber, toRecord } from "../common";

export const VIDRIFT_ORIGIN = "https://embed.vidrift.net";
const VIDRIFT_BRAND = "Cineby";
const MESSAGE_PREFIX = "vidrift:";

const VIDRIFT_EVENTS: Record<string, EmbedEventType> = {
  progress: "timeupdate",
  paused: "pause",
  unpaused: "play",
  ended: "ended",
  episode: "episode",
  "nextup-play": "episode",
};

export const vidriftEmbed: EmbedProvider = {
  id: "vidrift",
  name: "VidRift",
  capabilities: {
    startAt: true,
    events: true,
    theme: true,
    autoplay: true,
    lang: false,
    idType: "tmdb",
    anime: true,
    tvControls: true,
    handlesNextEpisode: true,
  },
  // embed.vidrift.in is the legacy host and still sends events.
  allowedOrigins: [VIDRIFT_ORIGIN, "https://embed.vidrift.in"],
  buildUrl(opts: EmbedBuildUrlOptions): string {
    const season = opts.season && opts.season > 0 ? Math.floor(opts.season) : 1;
    const episode = opts.episode && opts.episode > 0 ? Math.floor(opts.episode) : 1;

    let path: string;
    if (opts.type === "anime" && opts.anilistId) {
      path = `/embed/anilist/${opts.anilistId}/${episode}`;
    } else if (opts.type === "movie") {
      if (!opts.tmdbId) throw new Error("[vidriftEmbed] tmdbId is required for movie");
      path = `/embed/movie/${opts.tmdbId}`;
    } else {
      if (!opts.tmdbId) throw new Error("[vidriftEmbed] tmdbId is required for tv");
      path = `/embed/tv/${opts.tmdbId}/${season}/${episode}`;
    }

    const url = new URL(`${VIDRIFT_ORIGIN}${path}`);
    url.searchParams.set("brand", VIDRIFT_BRAND);

    const brandColor = cleanHexColor(opts.theme?.primary);
    if (brandColor) url.searchParams.set("brandColor", brandColor);

    if (opts.title) url.searchParams.set("title", opts.title);
    if (opts.posterUrl) url.searchParams.set("poster", opts.posterUrl);
    // Autoplay is on by default; only an explicit opt-out needs a parameter.
    if (opts.autoplay === false) url.searchParams.set("autoplay", "0");

    return url.toString();
  },
  parseEvent(origin: string, data: unknown): EmbedNormalizedEvent | null {
    if (!isOriginAllowed(origin, vidriftEmbed.allowedOrigins)) return null;

    const message = toRecord(data);
    if (!message || typeof message.type !== "string" || !message.type.startsWith(MESSAGE_PREFIX)) return null;

    const event = VIDRIFT_EVENTS[message.type.slice(MESSAGE_PREFIX.length)];
    if (!event) return null;

    // Fields may sit at the top level or under `data`.
    const payload = toRecord(message.data) ?? message;
    const result: EmbedNormalizedEvent = {
      event,
      currentTime: toNonNegativeNumber(payload.currentTime ?? message.currentTime),
      duration: toNonNegativeNumber(payload.duration ?? message.duration),
    };

    // Progress events carry the episode being played too, so history stays right even if "episode" is missed.
    const season = toNonNegativeNumber(payload.season ?? message.season);
    const episode = toNonNegativeNumber(payload.episode ?? message.episode);
    if (season !== undefined && episode !== undefined) {
      result.season = season;
      result.episode = episode;
    }

    return result;
  },
  iframe: {
    allow: "encrypted-media; autoplay *; fullscreen *",
    referrerPolicy: "origin",
  },
  resume: {
    targetOrigin: VIDRIFT_ORIGIN,
    buildMessage: (startAtSec) => ({ type: "vidrift:resume", currentTime: Math.floor(startAtSec) }),
  },
};
