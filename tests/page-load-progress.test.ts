import { describe, expect, it } from "vitest";

import { computeLoadProgress, isInViewport, PAGE_RENDERED_PROGRESS } from "@/lib/loading/viewportProgress";

const rect = { top: 100, bottom: 300, left: 20, right: 220, width: 200, height: 200 };

describe("isInViewport", () => {
  it("counts elements that overlap the viewport", () => {
    expect(isInViewport(rect, 390, 800)).toBe(true);
    expect(isInViewport({ ...rect, top: -150, bottom: 50 }, 390, 800)).toBe(true);
  });

  it("ignores elements below the fold, off to the side, or hidden", () => {
    expect(isInViewport({ ...rect, top: 900, bottom: 1100 }, 390, 800)).toBe(false);
    expect(isInViewport({ ...rect, left: 500, right: 700 }, 390, 800)).toBe(false);
    expect(isInViewport({ ...rect, width: 0, height: 0 }, 390, 800)).toBe(false);
  });
});

describe("computeLoadProgress", () => {
  it("rises from the base to 100 as images settle", () => {
    expect(computeLoadProgress(0, 4, PAGE_RENDERED_PROGRESS)).toBe(40);
    expect(computeLoadProgress(2, 4, PAGE_RENDERED_PROGRESS)).toBe(70);
    expect(computeLoadProgress(4, 4, PAGE_RENDERED_PROGRESS)).toBe(100);
  });

  it("stays at the base when there are no images to wait for", () => {
    expect(computeLoadProgress(0, 0, PAGE_RENDERED_PROGRESS)).toBe(40);
  });
});
