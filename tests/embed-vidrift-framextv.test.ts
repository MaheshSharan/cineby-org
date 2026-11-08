import { describe, expect, it } from "vitest";

import { getEmbedTheme } from "@/lib/embeds/theme";
import { framextvEmbed } from "@/lib/embeds/sites/framextv";
import { vidriftEmbed } from "@/lib/embeds/sites/vidrift";
import { listAvailableEmbedProviders } from "@/lib/embeds/registry";

describe("VidRift embed", () => {
  it("builds movie, tv and anilist urls with the user's theme colour", () => {
    const movie = new URL(
      vidriftEmbed.buildUrl({ type: "movie", tmdbId: 550, title: "Fight Club", theme: { primary: "#10B981" } })
    );
    expect(movie.origin + movie.pathname).toBe("https://embed.vidrift.net/embed/movie/550");
    expect(movie.searchParams.get("brandColor")).toBe("10B981");
    expect(movie.searchParams.get("brand")).toBe("Cineby");
    expect(movie.searchParams.get("title")).toBe("Fight Club");

    const tv = new URL(vidriftEmbed.buildUrl({ type: "tv", tmdbId: 1399, season: 2, episode: 5 }));
    expect(tv.pathname).toBe("/embed/tv/1399/2/5");

    const anime = new URL(vidriftEmbed.buildUrl({ type: "anime", anilistId: 21, episode: 3 }));
    expect(anime.pathname).toBe("/embed/anilist/21/3");
  });

  it("has no start-time url parameter and resumes by message", () => {
    const url = new URL(vidriftEmbed.buildUrl({ type: "movie", tmdbId: 550, startAtSec: 90 }));
    expect(url.searchParams.has("progress")).toBe(false);
    expect(url.searchParams.has("t")).toBe(false);
    expect(vidriftEmbed.resume?.buildMessage(90.7)).toEqual({ type: "vidrift:resume", currentTime: 90 });
    expect(vidriftEmbed.resume?.targetOrigin).toBe("https://embed.vidrift.net");
  });

  it("normalizes player events and rejects other origins", () => {
    const origin = "https://embed.vidrift.net";

    expect(vidriftEmbed.parseEvent(origin, { type: "vidrift:progress", currentTime: 42, duration: 100 })).toEqual({
      event: "timeupdate",
      currentTime: 42,
      duration: 100,
    });
    expect(vidriftEmbed.parseEvent(origin, JSON.stringify({ type: "vidrift:paused", currentTime: 7 }))?.event).toBe(
      "pause"
    );
    expect(vidriftEmbed.parseEvent(origin, { type: "vidrift:unpaused", currentTime: 7 })?.event).toBe("play");
    expect(vidriftEmbed.parseEvent(origin, { type: "vidrift:ended" })?.event).toBe("ended");
    expect(vidriftEmbed.parseEvent(origin, { type: "vidrift:episode", season: 2, episode: 4 })).toMatchObject({
      event: "episode",
      season: 2,
      episode: 4,
    });
    expect(vidriftEmbed.parseEvent(origin, { type: "vidrift:ui-visible" })).toBeNull();
    expect(vidriftEmbed.parseEvent("https://evil.example", { type: "vidrift:progress", currentTime: 1 })).toBeNull();
  });
});

describe("FrameXTV embed", () => {
  it("builds movie and tv urls with resume time and autoplay", () => {
    const movie = new URL(framextvEmbed.buildUrl({ type: "movie", tmdbId: 550, startAtSec: 120.9, autoplay: true }));
    expect(movie.origin + movie.pathname).toBe("https://framextv.xyz/embed/550");
    expect(movie.searchParams.get("t")).toBe("120");
    expect(movie.searchParams.get("autoplay")).toBe("1");

    const tv = new URL(framextvEmbed.buildUrl({ type: "tv", tmdbId: 1399, season: 3, episode: 9 }));
    expect(tv.pathname).toBe("/embed/1399/3/9");
  });

  it("normalizes prefixed telemetry events and rejects other origins", () => {
    const origin = "https://framextv.xyz";
    expect(
      framextvEmbed.parseEvent(origin, { event: "frameXTV:timeupdate", currentTime: 30, duration: 600 })
    ).toMatchObject({ event: "timeupdate", currentTime: 30, duration: 600 });
    // Real traffic arrives from the redirect target.
    expect(
      framextvEmbed.parseEvent("https://framextv.cc", { event: "frameXTV:timeupdate", currentTime: 5, duration: 60 })
    ).toMatchObject({ event: "timeupdate", currentTime: 5 });
    expect(framextvEmbed.parseEvent(origin, { event: "frameXTV:ready" })).toBeNull();
    expect(framextvEmbed.parseEvent("https://evil.example", { event: "frameXTV:timeupdate", currentTime: 1 })).toBeNull();
  });
});

describe("embed theme and priority", () => {
  it("maps every site theme to hex colours", () => {
    expect(getEmbedTheme("default").primary).toBe("DC2626");
    expect(getEmbedTheme("purple").primary).toBe("A855F7");
  });

  it("lists VidRift then FrameXTV first", () => {
    const ids = listAvailableEmbedProviders(["vidrift", "framextv", "vidy", "vidnest", "vixsrc"]).map((p) => p.id);
    expect(ids).toEqual(["vidrift", "framextv", "vidy", "vidnest", "vixsrc"]);
  });
});
