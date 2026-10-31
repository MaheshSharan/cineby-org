import { describe, it, expect } from "vitest";
import { buildShareUrl, PEER_SHARE_UTM } from "@/lib/utils/share";

describe("buildShareUrl", () => {
  it("appends default peer share UTM parameters to relative path", () => {
    const url = "/movie/1726-iron-man";
    const tagged = buildShareUrl(url);

    expect(tagged).toBe(
      "/movie/1726-iron-man?utm_source=user_share&utm_medium=referral&utm_campaign=peer_share"
    );
  });

  it("preserves existing query parameters and appends UTM parameters", () => {
    const url = "/tv/1399-game-of-thrones/1/1?play=true";
    const tagged = buildShareUrl(url);

    expect(tagged).toBe(
      "/tv/1399-game-of-thrones/1/1?play=true&utm_source=user_share&utm_medium=referral&utm_campaign=peer_share"
    );
  });

  it("preserves hash fragment at the end of the URL", () => {
    const url = "/movie/1726-iron-man#trailer";
    const tagged = buildShareUrl(url);

    expect(tagged).toBe(
      "/movie/1726-iron-man?utm_source=user_share&utm_medium=referral&utm_campaign=peer_share#trailer"
    );
  });

  it("handles full absolute URLs correctly", () => {
    const url = "https://cineby.app/movie/1726-iron-man?ref=home";
    const tagged = buildShareUrl(url);

    expect(tagged).toBe(
      "https://cineby.app/movie/1726-iron-man?ref=home&utm_source=user_share&utm_medium=referral&utm_campaign=peer_share"
    );
  });

  it("supports custom UTM parameters", () => {
    const url = "/blog/how-to-find-movies";
    const tagged = buildShareUrl(url, {
      source: "twitter",
      medium: "social",
      campaign: "spring_launch",
    });

    expect(tagged).toBe(
      "/blog/how-to-find-movies?utm_source=twitter&utm_medium=social&utm_campaign=spring_launch"
    );
  });

  it("returns empty string when url is empty", () => {
    expect(buildShareUrl("")).toBe("");
  });

  it("handles relative path without leading slash cleanly", () => {
    const url = "movie/1726-iron-man";
    const tagged = buildShareUrl(url);

    expect(tagged).toBe(
      "/movie/1726-iron-man?utm_source=user_share&utm_medium=referral&utm_campaign=peer_share"
    );
  });

  it("overrides existing UTM params with new ones", () => {
    const url = "/movie/1726-iron-man?utm_source=old&utm_medium=banner";
    const tagged = buildShareUrl(url);

    expect(tagged).toBe(
      "/movie/1726-iron-man?utm_source=user_share&utm_medium=referral&utm_campaign=peer_share"
    );
  });
});
