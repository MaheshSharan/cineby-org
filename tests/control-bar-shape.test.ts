import { describe, expect, it } from "vitest";

import {
  CONTROL_BAR_HEIGHT,
  EPISODES_TAB_BASE_WIDTH,
  EPISODES_TAB_HEIGHT,
  buildControlBarPaths,
} from "@/lib/player/controlBarShape";

function countCurves(path: string): number {
  return (path.match(/ C /g) ?? []).length;
}

describe("buildControlBarPaths", () => {
  it("draws a plain rounded bar without a tab", () => {
    const { outline, tabFill } = buildControlBarPaths(800, false);

    expect(tabFill).toBeNull();
    expect(countCurves(outline)).toBe(0);
    expect(outline.startsWith("M ")).toBe(true);
    expect(outline.endsWith("Z")).toBe(true);
  });

  it("lifts the bottom edge into a tab through two S-curves", () => {
    const { outline, tabFill } = buildControlBarPaths(800, true);

    expect(countCurves(outline)).toBe(2);
    expect(tabFill).not.toBeNull();
    expect(countCurves(tabFill as string)).toBe(2);
  });

  it("centers the tab and reaches the expected height", () => {
    const { outline } = buildControlBarPaths(800, true);
    const tabTop = CONTROL_BAR_HEIGHT - 0.5 - EPISODES_TAB_HEIGHT;

    const topHalf = EPISODES_TAB_BASE_WIDTH / 2 - 38;

    // The flat top of the tab runs between the inner ends of the two curves, symmetric around x = 400.
    expect(outline).toContain(`${400 + topHalf} ${tabTop} H ${400 - topHalf}`);
  });

  it("drops the tab when the bar is too narrow to hold it", () => {
    const { outline, tabFill } = buildControlBarPaths(240, true);

    expect(tabFill).toBeNull();
    expect(countCurves(outline)).toBe(0);
  });
});
