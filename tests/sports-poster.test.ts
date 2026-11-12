import { describe, expect, it } from "vitest";

import { getUsablePosterUrl } from "@/lib/sports/poster";

describe("getUsablePosterUrl", () => {
  it("returns a reachable absolute URL unchanged", () => {
    const url = "https://static.ppvservices.st/assets/thumb/abc-thumbnail.jpg";

    expect(getUsablePosterUrl(url)).toBe(url);
  });

  it("returns null for a host that no longer resolves", () => {
    expect(getUsablePosterUrl("https://thumbs.poocloud.in/familyguy/preview.jpg")).toBeNull();
  });

  it("returns null for a missing or blank poster", () => {
    expect(getUsablePosterUrl(undefined)).toBeNull();
    expect(getUsablePosterUrl(null)).toBeNull();
    expect(getUsablePosterUrl("   ")).toBeNull();
  });

  it("keeps a path on our own origin", () => {
    expect(getUsablePosterUrl("/screenshots/home-wide.png")).toBe("/screenshots/home-wide.png");
  });

  it("trims surrounding whitespace", () => {
    expect(getUsablePosterUrl("  https://example.test/a.jpg ")).toBe("https://example.test/a.jpg");
  });
});
