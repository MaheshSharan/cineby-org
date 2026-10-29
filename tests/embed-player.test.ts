import { describe, expect, it } from "vitest";
import { getEmbedProvider, listAvailableEmbedProviders } from "@/lib/embeds/registry";
import { vixsrcEmbed } from "@/lib/embeds/sites/vixsrc";
import { vidyEmbed } from "@/lib/embeds/sites/vidy";
import { getPlayerModeConfig } from "@/lib/player/modeConfig";

describe("Embed Providers Registry & Capabilities", () => {
  it("registers vixsrc embed provider with correct capabilities", () => {
    const provider = getEmbedProvider("vixsrc");
    expect(provider).toBeDefined();
    expect(provider?.id).toBe("vixsrc");
    expect(provider?.capabilities.startAt).toBe(true);
    expect(provider?.capabilities.events).toBe(true);

    const movieUrl = provider?.buildUrl({
      type: "movie",
      tmdbId: 550,
      startAtSec: 120,
      autoplay: true,
      lang: "en",
    });
    expect(movieUrl).toContain("/movie/550");
    expect(movieUrl).toContain("startAt=120");
    expect(movieUrl).toContain("autoplay=true");

    const tvUrl = provider?.buildUrl({
      type: "tv",
      tmdbId: 1399,
      season: 2,
      episode: 5,
    });
    expect(tvUrl).toContain("/tv/1399/2/5");
  });

  it("parses vixsrc postMessage events accurately", () => {
    const validOrigin = "https://vixsrc.to";
    const event = vixsrcEmbed.parseEvent(validOrigin, {
      type: "PLAYER_EVENT",
      data: {
        event: "timeupdate",
        currentTime: 42,
        duration: 100,
        video_id: "550",
      },
    });

    expect(event).toEqual({
      event: "timeupdate",
      currentTime: 42,
      duration: 100,
      videoId: "550",
    });

    const untrustedOrigin = "https://malicious-site.com";
    const untrustedEvent = vixsrcEmbed.parseEvent(untrustedOrigin, {
      event: "timeupdate",
      currentTime: 42,
    });
    expect(untrustedEvent).toBeNull();
  });

  it("registers vidy embed provider with correct capabilities", () => {
    const provider = getEmbedProvider("vidy");
    expect(provider).toBeDefined();
    expect(provider?.id).toBe("vidy");
    expect(provider?.capabilities.startAt).toBe(true);

    const movieUrl = provider?.buildUrl({
      type: "movie",
      tmdbId: 550,
      startAtSec: 60,
    });
    expect(movieUrl).toContain("/embed/movie/550");
    expect(movieUrl).toContain("t=60");

    const tvUrl = provider?.buildUrl({
      type: "tv",
      tmdbId: 1399,
      season: 1,
      episode: 2,
    });
    expect(tvUrl).toContain("/embed/tv/1399/1/2");
  });

  it("parses play, pause, and ended events on vixsrc and vidy", () => {
    const vixPlay = vixsrcEmbed.parseEvent("https://vixsrc.to", {
      type: "PLAYER_EVENT",
      data: { event: "play", currentTime: 10, duration: 120 },
    });
    expect(vixPlay).toEqual({
      event: "play",
      currentTime: 10,
      duration: 120,
      videoId: undefined,
    });

    const vixPause = vixsrcEmbed.parseEvent("https://vixsrc.to", {
      type: "PLAYER_EVENT",
      data: { event: "pause", currentTime: 25, duration: 120 },
    });
    expect(vixPause).toEqual({
      event: "pause",
      currentTime: 25,
      duration: 120,
      videoId: undefined,
    });

    const vidyPlay = vidyEmbed.parseEvent("https://vidy.st", {
      type: "PLAYER_EVENT",
      data: { event: "play", currentTime: 5, duration: 60 },
    });
    expect(vidyPlay).toEqual({
      event: "play",
      currentTime: 5,
      duration: 60,
      videoId: undefined,
    });

    const vidyUntrusted = vidyEmbed.parseEvent("https://evil.org", {
      type: "PLAYER_EVENT",
      data: { event: "play", currentTime: 5 },
    });
    expect(vidyUntrusted).toBeNull();
  });

  it("resolves player mode config as embed-only", () => {
    const config = getPlayerModeConfig();
    expect(config.mode).toBe("embed");
    expect(config.nativeEnabled).toBe(false);
    expect(config.embedEnabled).toBe(true);
    expect(config.servers.length).toBeGreaterThan(0);
    expect(config.servers[0].id).toBe("vixsrc");
    expect(config.servers.some((s) => s.id === "native")).toBe(false);
  });
});
