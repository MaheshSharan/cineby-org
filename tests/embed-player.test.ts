import { describe, expect, it, afterEach } from "vitest";
import { getEmbedProvider, listAvailableEmbedProviders } from "@/lib/embeds/registry";
import { vixsrcEmbed } from "@/lib/embeds/sites/vixsrc";
import { vidyEmbed } from "@/lib/embeds/sites/vidy";
import { cleanHexColor, isOriginAllowed, parseEmbedMessage } from "@/lib/embeds/common";
import { getPlayerModeConfig } from "@/lib/player/modeConfig";

describe("Shared Embed Helpers", () => {
  it("cleanHexColor cleans and validates 6-digit hex colors", () => {
    expect(cleanHexColor("#DC2626")).toBe("DC2626");
    expect(cleanHexColor("22C55E")).toBe("22C55E");
    expect(cleanHexColor("#e50914")).toBe("e50914");
    expect(cleanHexColor(" #170000 ")).toBe("170000");
    expect(cleanHexColor("red")).toBeUndefined();
    expect(cleanHexColor("#FFF")).toBeUndefined();
    expect(cleanHexColor("")).toBeUndefined();
    expect(cleanHexColor(undefined)).toBeUndefined();
  });

  it("isOriginAllowed verifies origins securely", () => {
    const allowed = ["https://vidy.st", "https://player.vidy.st", "https://vixsrc.to"];
    expect(isOriginAllowed("https://vidy.st", allowed)).toBe(true);
    expect(isOriginAllowed("https://vidy.st/", allowed)).toBe(true);
    expect(isOriginAllowed("https://player.vidy.st", allowed)).toBe(true);
    expect(isOriginAllowed("https://vixsrc.to", allowed)).toBe(true);
    expect(isOriginAllowed("https://evil-vidy.st", allowed)).toBe(false);
    expect(isOriginAllowed("https://not-allowed.com", allowed)).toBe(false);
    expect(isOriginAllowed("", allowed)).toBe(false);
  });
});

describe("Vixsrc Embed Provider", () => {
  const originalEnv = process.env.VIXSRC_EMBED_HOST;
  afterEach(() => {
    process.env.VIXSRC_EMBED_HOST = originalEnv;
  });

  it("registers vixsrc embed provider with correct capabilities & iframe attributes", () => {
    const provider = getEmbedProvider("vixsrc");
    expect(provider).toBeDefined();
    expect(provider?.id).toBe("vixsrc");
    expect(provider?.name).toBe("Vixsrc");
    expect(provider?.capabilities.startAt).toBe(true);
    expect(provider?.capabilities.events).toBe(true);
    expect(provider?.capabilities.theme).toBe(true);
    expect(provider?.capabilities.autoplay).toBe(true);
    expect(provider?.capabilities.lang).toBe(true);
    expect(provider?.capabilities.idType).toBe("both");

    expect(provider?.iframe.allow).toContain("encrypted-media; autoplay *; fullscreen *");
    expect(provider?.iframe.referrerPolicy).toBe("origin");
  });

  it("builds movie and tv URLs with query options according to Vixsrc spec", () => {
    // Movie with TMDB ID, primaryColor, secondaryColor, startAt, autoplay, lang
    const movieUrl = vixsrcEmbed.buildUrl({
      type: "movie",
      tmdbId: 550,
      startAtSec: 60,
      autoplay: true,
      lang: "it",
      theme: { primary: "#B20710", secondary: "170000" },
    });
    expect(movieUrl).toBe(
      "https://vixsrc.to/movie/550?startAt=60&autoplay=true&lang=it&primaryColor=B20710&secondaryColor=170000"
    );

    // Movie with IMDb ID
    const imdbMovieUrl = vixsrcEmbed.buildUrl({
      type: "movie",
      imdbId: "tt0137523",
      autoplay: false,
    });
    expect(imdbMovieUrl).toBe("https://vixsrc.to/movie/tt0137523?autoplay=false");

    // TV Show with season and episode
    const tvUrl = vixsrcEmbed.buildUrl({
      type: "tv",
      tmdbId: 1399,
      season: 2,
      episode: 5,
      startAtSec: 120,
    });
    expect(tvUrl).toBe("https://vixsrc.to/tv/1399/2/5?startAt=120");

    // TV Show defaults season and episode to 1
    const tvDefaultUrl = vixsrcEmbed.buildUrl({
      type: "tv",
      tmdbId: 1399,
    });
    expect(tvDefaultUrl).toBe("https://vixsrc.to/tv/1399/1/1");
  });

  it("throws error when tmdbId and imdbId are both missing", () => {
    expect(() =>
      vixsrcEmbed.buildUrl({
        type: "movie",
      })
    ).toThrowError("[vixsrcEmbed] Either tmdbId or imdbId is required");
  });

  it("parses vixsrc postMessage events (both object and JSON string formats)", () => {
    const validOrigin = "https://vixsrc.to";

    // 1. Standard Object format
    const eventObj = vixsrcEmbed.parseEvent(validOrigin, {
      type: "PLAYER_EVENT",
      data: {
        event: "timeupdate",
        currentTime: 42,
        duration: 100,
        video_id: "550",
      },
    });

    expect(eventObj).toEqual({
      event: "timeupdate",
      currentTime: 42,
      duration: 100,
      videoId: "550",
    });

    // 2. Stringified JSON format
    const eventStr = vixsrcEmbed.parseEvent(
      validOrigin,
      JSON.stringify({
        type: "PLAYER_EVENT",
        data: {
          event: "timeupdate",
          currentTime: 84,
          duration: 200,
          video_id: 12345,
        },
      })
    );

    expect(eventStr).toEqual({
      event: "timeupdate",
      currentTime: 84,
      duration: 200,
      videoId: "12345",
    });

    // 3. Play, pause, seeked, ended
    const playEvent = vixsrcEmbed.parseEvent("https://vixcloud.co", {
      type: "PLAYER_EVENT",
      data: { event: "play", currentTime: 10, duration: 120 },
    });
    expect(playEvent).toEqual({
      event: "play",
      currentTime: 10,
      duration: 120,
      videoId: undefined,
    });

    const pauseEvent = vixsrcEmbed.parseEvent("https://vixsrc.to", {
      type: "PLAYER_EVENT",
      data: { event: "pause", currentTime: 25, duration: 120 },
    });
    expect(pauseEvent).toEqual({
      event: "pause",
      currentTime: 25,
      duration: 120,
      videoId: undefined,
    });

    const seekedEvent = vixsrcEmbed.parseEvent("https://vixsrc.to", {
      type: "PLAYER_EVENT",
      data: { event: "seeked", currentTime: 95, duration: 120 },
    });
    expect(seekedEvent).toEqual({
      event: "seeked",
      currentTime: 95,
      duration: 120,
      videoId: undefined,
    });

    const endedEvent = vixsrcEmbed.parseEvent("https://vixsrc.to", {
      type: "PLAYER_EVENT",
      data: { event: "ended", currentTime: 120, duration: 120 },
    });
    expect(endedEvent).toEqual({
      event: "ended",
      currentTime: 120,
      duration: 120,
      videoId: undefined,
    });

    // 4. Untrusted origin
    const untrustedEvent = vixsrcEmbed.parseEvent("https://malicious-site.com", {
      type: "PLAYER_EVENT",
      data: { event: "timeupdate", currentTime: 42 },
    });
    expect(untrustedEvent).toBeNull();
  });
});

describe("Vidy Embed Provider", () => {
  const originalEnv = process.env.VIDY_EMBED_HOST;
  afterEach(() => {
    process.env.VIDY_EMBED_HOST = originalEnv;
  });

  it("registers vidy embed provider with correct capabilities & iframe attributes", () => {
    const provider = getEmbedProvider("vidy");
    expect(provider).toBeDefined();
    expect(provider?.id).toBe("vidy");
    expect(provider?.name).toBe("Vidy");
    expect(provider?.capabilities.startAt).toBe(true);
    expect(provider?.capabilities.events).toBe(true);
    expect(provider?.capabilities.theme).toBe(true);
    expect(provider?.capabilities.autoplay).toBe(true);
    expect(provider?.capabilities.anime).toBe(true);
    expect(provider?.capabilities.tvControls).toBe(true);
    expect(provider?.capabilities.idType).toBe("tmdb");

    expect(provider?.iframe.allow).toBe("encrypted-media; autoplay *; fullscreen *");
    expect(provider?.iframe.referrerPolicy).toBe("origin");
  });

  it("builds movie, tv, and anime URLs with official Vidy routes and query options", () => {
    // 1. Movie worked examples from official docs:
    // /movie/315162?color=22C55E&progress=90
    const movieWithColorProgress = vidyEmbed.buildUrl({
      type: "movie",
      tmdbId: 315162,
      theme: { primary: "22C55E" },
      startAtSec: 90,
    });
    expect(movieWithColorProgress).toBe("https://vidy.st/movie/315162?color=22C55E&progress=90");

    // /movie/315162?autoplay=true
    const movieAutoplay = vidyEmbed.buildUrl({
      type: "movie",
      tmdbId: 315162,
      autoplay: true,
    });
    expect(movieAutoplay).toBe("https://vidy.st/movie/315162?autoplay=true");

    // 2. TV worked example:
    // /tv/1396/1/1?nextEpisode=true&episodeSelector=true&autoplayNextEpisode=true
    const tvFullControls = vidyEmbed.buildUrl({
      type: "tv",
      tmdbId: 1396,
      season: 1,
      episode: 1,
      nextEpisode: true,
      episodeSelector: true,
      autoplayNextEpisode: true,
    });
    expect(tvFullControls).toBe(
      "https://vidy.st/tv/1396/1/1?nextEpisode=true&episodeSelector=true&autoplayNextEpisode=true"
    );

    // TV defaults missing season and episode to 1
    const tvDefaults = vidyEmbed.buildUrl({
      type: "tv",
      tmdbId: 1396,
    });
    expect(tvDefaults).toBe("https://vidy.st/tv/1396/1/1");

    // 3. Anime worked example:
    // /anime/21/1?color=FFFFFF&episodeSelector=true
    const animeWorkedExample = vidyEmbed.buildUrl({
      type: "anime",
      anilistId: 21,
      episode: 1,
      theme: { primary: "#FFFFFF" },
      episodeSelector: true,
    });
    expect(animeWorkedExample).toBe("https://vidy.st/anime/21/1?color=FFFFFF&episodeSelector=true");

    // Anime defaults missing episode to 1 and can use tmdbId if anilistId omitted
    const animeDefault = vidyEmbed.buildUrl({
      type: "anime",
      tmdbId: 456,
    });
    expect(animeDefault).toBe("https://vidy.st/anime/456/1");
  });

  it("throws error when tmdbId is missing for movie/tv or anilistId/tmdbId for anime", () => {
    expect(() => vidyEmbed.buildUrl({ type: "movie" })).toThrowError(
      "[vidyEmbed] tmdbId is required for movie"
    );
    expect(() => vidyEmbed.buildUrl({ type: "tv" })).toThrowError(
      "[vidyEmbed] tmdbId is required for tv"
    );
    expect(() => vidyEmbed.buildUrl({ type: "anime" })).toThrowError(
      "[vidyEmbed] anilistId or tmdbId is required for anime"
    );
  });

  it("supports custom host via VIDY_EMBED_HOST", () => {
    process.env.VIDY_EMBED_HOST = "https://custom.vidy.st";
    const url = vidyEmbed.buildUrl({
      type: "movie",
      tmdbId: 550,
    });
    expect(url).toBe("https://custom.vidy.st/movie/550");
    expect(vidyEmbed.allowedOrigins).toContain("https://custom.vidy.st");
  });

  it("parses Vidy stringified JSON postMessage events according to official spec", () => {
    const origin = "https://vidy.st";

    // 1. Vidy PLAYER_EVENT stringified JSON: { event: "timeupdate", currentTime, duration }
    const timeUpdateStr = JSON.stringify({
      event: "timeupdate",
      currentTime: 120.5,
      duration: 3600,
    });
    const parsedTime = vidyEmbed.parseEvent(origin, timeUpdateStr);
    expect(parsedTime).toEqual({
      event: "timeupdate",
      currentTime: 120.5,
      duration: 3600,
      videoId: undefined,
    });

    // 2. Play, pause, ended in stringified format
    const playParsed = vidyEmbed.parseEvent(
      "https://player.vidy.st",
      JSON.stringify({ event: "play", currentTime: 5, duration: 60 })
    );
    expect(playParsed).toEqual({
      event: "play",
      currentTime: 5,
      duration: 60,
      videoId: undefined,
    });

    const pauseParsed = vidyEmbed.parseEvent(
      origin,
      JSON.stringify({ event: "pause", currentTime: 15, duration: 60 })
    );
    expect(pauseParsed).toEqual({
      event: "pause",
      currentTime: 15,
      duration: 60,
      videoId: undefined,
    });

    const endedParsed = vidyEmbed.parseEvent(origin, JSON.stringify({ event: "ended" }));
    expect(endedParsed).toEqual({
      event: "ended",
      currentTime: undefined,
      duration: undefined,
      videoId: undefined,
    });

    // 3. MEDIA_DATA event with serialized progress
    const mediaDataWithTime = JSON.stringify({
      type: "MEDIA_DATA",
      data: JSON.stringify({ currentTime: 240, duration: 1800 }),
    });
    const parsedMediaData = vidyEmbed.parseEvent(origin, mediaDataWithTime);
    expect(parsedMediaData?.event).toBe("media_data");
    expect(parsedMediaData?.currentTime).toBe(240);
    expect(parsedMediaData?.duration).toBe(1800);

    // MEDIA_DATA event with raw token
    const mediaDataRaw = JSON.stringify({
      type: "MEDIA_DATA",
      data: "opaque-history-token",
    });
    const parsedRawMedia = vidyEmbed.parseEvent(origin, mediaDataRaw);
    expect(parsedRawMedia?.event).toBe("media_data");
    expect(parsedRawMedia?.rawData).toBe("opaque-history-token");

    // 4. Object format compatibility
    const objParsed = vidyEmbed.parseEvent(origin, {
      type: "PLAYER_EVENT",
      data: { event: "play", currentTime: 5, duration: 60 },
    });
    expect(objParsed).toEqual({
      event: "play",
      currentTime: 5,
      duration: 60,
      videoId: undefined,
    });

    // 5. Untrusted origin rejection
    expect(vidyEmbed.parseEvent("https://evil.org", timeUpdateStr)).toBeNull();

    // 6. Malformed JSON / invalid payloads
    expect(vidyEmbed.parseEvent(origin, "not-json")).toBeNull();
    expect(vidyEmbed.parseEvent(origin, "{ incomplete json")).toBeNull();
    expect(vidyEmbed.parseEvent(origin, null)).toBeNull();
    expect(vidyEmbed.parseEvent(origin, 12345)).toBeNull();
  });
});

describe("Player Mode Config", () => {
  it("resolves player mode config as embed-only with all available servers", () => {
    const config = getPlayerModeConfig();
    expect(config.mode).toBe("embed");
    expect(config.nativeEnabled).toBe(false);
    expect(config.embedEnabled).toBe(true);
    expect(config.servers.length).toBeGreaterThanOrEqual(2);
    expect(config.servers.some((s) => s.id === "vixsrc")).toBe(true);
    expect(config.servers.some((s) => s.id === "vidy")).toBe(true);

    const vidyServer = config.servers.find((s) => s.id === "vidy");
    expect(vidyServer?.startAtSupported).toBe(true);
    expect(vidyServer?.eventsSupported).toBe(true);

    const vixsrcServer = config.servers.find((s) => s.id === "vixsrc");
    expect(vixsrcServer?.startAtSupported).toBe(true);
    expect(vixsrcServer?.eventsSupported).toBe(true);
  });

  it("lists providers by priority order correctly without duplicates", () => {
    const providers = listAvailableEmbedProviders(["vidy", "vixsrc", "vidy", "unknown"]);
    expect(providers.map((p) => p.id)).toEqual(["vidy", "vixsrc"]);
  });
});

describe("Edge Cases & Normalization", () => {
  const allowed = ["https://vixsrc.to", "https://vidy.st"];

  it("normalizes uppercase and mixed-case event names", () => {
    const res = parseEmbedMessage(
      "https://vidy.st",
      allowed,
      JSON.stringify({ event: "TIMEUPDATE", currentTime: 10, duration: 100 })
    );
    expect(res?.event).toBe("timeupdate");

    const vixRes = parseEmbedMessage("https://vixsrc.to", allowed, {
      type: "PLAYER_EVENT",
      data: { event: "PAUSE", currentTime: 15 },
    });
    expect(vixRes?.event).toBe("pause");
  });

  it("handles stringified numeric timestamps and zero values", () => {
    const res = parseEmbedMessage(
      "https://vidy.st",
      allowed,
      JSON.stringify({ event: "timeupdate", currentTime: "45.5", duration: "180" })
    );
    expect(res?.currentTime).toBe(45.5);
    expect(res?.duration).toBe(180);

    const zeroRes = parseEmbedMessage(
      "https://vidy.st",
      allowed,
      JSON.stringify({ event: "play", currentTime: 0, duration: 180 })
    );
    expect(zeroRes?.currentTime).toBe(0);
  });

  it("ignores negative timestamps and non-numeric strings", () => {
    const res = parseEmbedMessage(
      "https://vidy.st",
      allowed,
      JSON.stringify({ event: "timeupdate", currentTime: -10, duration: "invalid" })
    );
    expect(res?.currentTime).toBeUndefined();
    expect(res?.duration).toBeUndefined();
  });

  it("normalizes seeked events for both providers", () => {
    const vidySeeked = parseEmbedMessage(
      "https://vidy.st",
      allowed,
      JSON.stringify({ event: "seeked", currentTime: 55, duration: 120 })
    );
    expect(vidySeeked).toEqual({
      event: "seeked",
      currentTime: 55,
      duration: 120,
      videoId: undefined,
    });

    const vixSeeked = parseEmbedMessage("https://vixsrc.to", allowed, {
      type: "PLAYER_EVENT",
      data: { event: "seeked", currentTime: 88, duration: 120, video_id: 999 },
    });
    expect(vixSeeked).toEqual({
      event: "seeked",
      currentTime: 88,
      duration: 120,
      videoId: "999",
    });
  });

  it("handles stringified inner data inside PLAYER_EVENT", () => {
    const res = parseEmbedMessage("https://vixsrc.to", allowed, {
      type: "PLAYER_EVENT",
      data: JSON.stringify({
        event: "timeupdate",
        currentTime: 77,
        duration: 200,
        video_id: "vid-1",
      }),
    });
    expect(res).toEqual({
      event: "timeupdate",
      currentTime: 77,
      duration: 200,
      videoId: "vid-1",
    });
  });

  it("extracts progress from serialized array in MEDIA_DATA", () => {
    const arrayHistory = JSON.stringify({
      type: "MEDIA_DATA",
      data: JSON.stringify([
        { id: "100", currentTime: 10, duration: 100 },
        { id: "200", currentTime: 350, duration: 1800 },
      ]),
    });
    const parsed = parseEmbedMessage("https://vidy.st", allowed, arrayHistory);
    expect(parsed?.event).toBe("media_data");
    expect(parsed?.currentTime).toBe(350);
    expect(parsed?.duration).toBe(1800);
  });

  it("normalizes next, nextEpisode and next_episode events", () => {
    const e1 = parseEmbedMessage(
      "https://vidy.st",
      allowed,
      JSON.stringify({ event: "nextEpisode" })
    );
    expect(e1?.event).toBe("next");

    const e2 = parseEmbedMessage(
      "https://vidy.st",
      allowed,
      JSON.stringify({ event: "next_episode" })
    );
    expect(e2?.event).toBe("next");

    const e3 = parseEmbedMessage(
      "https://vidy.st",
      allowed,
      JSON.stringify({ event: "next" })
    );
    expect(e3?.event).toBe("next");
  });

  it("safely verifies subdomain origins while rejecting lookalikes and protocol mismatches", () => {
    const baseAllowed = ["https://vixcloud.co", "https://vidy.st"];
    expect(isOriginAllowed("https://s1.vixcloud.co", baseAllowed)).toBe(true);
    expect(isOriginAllowed("https://stream.edge2.vixcloud.co", baseAllowed)).toBe(true);
    expect(isOriginAllowed("https://player.vidy.st", baseAllowed)).toBe(true);
    expect(isOriginAllowed("https://evil-vidy.st", baseAllowed)).toBe(false);
    expect(isOriginAllowed("https://vixcloud.co.attacker.com", baseAllowed)).toBe(false);
    expect(isOriginAllowed("http://vidy.st", baseAllowed)).toBe(false);
  });

  it("defaults non-positive season and episode values to 1 for both providers", () => {
    const vidyZero = vidyEmbed.buildUrl({
      type: "tv",
      tmdbId: 100,
      season: 0,
      episode: -5,
    });
    expect(vidyZero).toBe("https://vidy.st/tv/100/1/1");

    const vixZero = vixsrcEmbed.buildUrl({
      type: "tv",
      tmdbId: 100,
      season: 0,
      episode: 0,
    });
    expect(vixZero).toBe("https://vixsrc.to/tv/100/1/1");
  });

  it("configures proper sandbox permissions on iframe options", () => {
    expect(vidyEmbed.iframe.sandbox).toContain("allow-scripts");
    expect(vidyEmbed.iframe.sandbox).toContain("allow-same-origin");
    expect(vidyEmbed.iframe.sandbox).toContain("allow-presentation");
    expect(vixsrcEmbed.iframe.sandbox).toContain("allow-scripts");
    expect(vixsrcEmbed.iframe.sandbox).toContain("allow-same-origin");
  });
});
