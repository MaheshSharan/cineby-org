import { POPUP_BLOCKING_SANDBOX } from "../sandboxPolicy";
import type { EmbedBuildUrlOptions, EmbedNormalizedEvent, EmbedProvider } from "../types";
import { parseEmbedMessage, toRecord } from "../common";

export const FRAMEXTV_ORIGIN = "https://framextv.xyz";
const EVENT_PREFIX = "framextv:";

/** frameXTV prefixes event names ("frameXTV:timeupdate"); the shared parser expects bare names. */
function stripEventPrefix(data: unknown): unknown {
  const record = toRecord(data);
  const name = record?.event;
  if (!record || typeof name !== "string" || !name.toLowerCase().startsWith(EVENT_PREFIX)) return data;

  return { ...record, event: name.slice(EVENT_PREFIX.length) };
}

export const framextvEmbed: EmbedProvider = {
  id: "framextv",
  name: "FrameXTV",
  capabilities: {
    startAt: true,
    events: true,
    // No colour parameter is documented.
    theme: false,
    autoplay: true,
    lang: false,
    idType: "tmdb",
    anime: false,
    tvControls: false,
  },
  // framextv.xyz redirects to framextv.cc, and the player posts its events from that host.
  allowedOrigins: [FRAMEXTV_ORIGIN, "https://www.framextv.xyz", "https://framextv.cc"],
  buildUrl(opts: EmbedBuildUrlOptions): string {
    if (!opts.tmdbId) {
      throw new Error("[framextvEmbed] tmdbId is required");
    }

    const season = opts.season && opts.season > 0 ? Math.floor(opts.season) : 1;
    const episode = opts.episode && opts.episode > 0 ? Math.floor(opts.episode) : 1;
    const path = opts.type === "movie" ? `/embed/${opts.tmdbId}` : `/embed/${opts.tmdbId}/${season}/${episode}`;

    const url = new URL(`${FRAMEXTV_ORIGIN}${path}`);
    if (opts.autoplay !== undefined) url.searchParams.set("autoplay", opts.autoplay ? "1" : "0");

    const startSec = opts.startAtSec ?? opts.progress;
    if (startSec && startSec > 0) url.searchParams.set("t", Math.floor(startSec).toString());

    if (opts.title) url.searchParams.set("title", opts.title);
    if (opts.posterUrl) url.searchParams.set("poster", opts.posterUrl);

    return url.toString();
  },
  parseEvent(origin: string, data: unknown): EmbedNormalizedEvent | null {
    return parseEmbedMessage(origin, framextvEmbed.allowedOrigins, stripEventPrefix(data));
  },
  iframe: {
    allow: "encrypted-media; autoplay *; fullscreen *",
    referrerPolicy: "origin",
    // Plays sandboxed, but its "Please Disable Sandbox" check is intermittent; EmbedPlayer falls back if it trips.
    sandbox: POPUP_BLOCKING_SANDBOX,
  },
};
