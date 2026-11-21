import { describe, expect, it } from "vitest";

import { getChristmasStatus } from "@/lib/christmas";

describe("getChristmasStatus", () => {
  it("reads the UTC date, so server and browser agree", () => {
    // 20:00 UTC on Dec 24 is already Dec 25 in IST; the answer must not depend on the machine's timezone.
    const status = getChristmasStatus(new Date("2026-12-24T20:00:00Z"));
    expect(status.isEve).toBe(true);
    expect(status.isChristmasDay).toBe(false);
  });

  it("is inactive before Nov 15", () => {
    expect(getChristmasStatus(new Date("2026-11-14T12:00:00Z")).isActive).toBe(false);
  });

  it("counts down to Christmas", () => {
    expect(getChristmasStatus(new Date("2026-12-10T00:00:00Z")).pillText).toBe("15 days to Christmas");
  });
});
