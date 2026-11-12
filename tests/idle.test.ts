import { afterEach, describe, expect, it, vi } from "vitest";

import { runWhenIdle } from "@/lib/utils/idle";

describe("runWhenIdle", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("does nothing on the server, where there is no window", () => {
    const task = vi.fn();

    const cancel = runWhenIdle(task);
    cancel();

    expect(task).not.toHaveBeenCalled();
  });

  it("uses requestIdleCallback with the timeout and can cancel it", () => {
    const requestIdleCallback = vi.fn(() => 7);
    const cancelIdleCallback = vi.fn();
    vi.stubGlobal("window", { requestIdleCallback, cancelIdleCallback });
    const task = vi.fn();

    const cancel = runWhenIdle(task, 1500);
    cancel();

    expect(requestIdleCallback).toHaveBeenCalledWith(task, { timeout: 1500 });
    expect(cancelIdleCallback).toHaveBeenCalledWith(7);
  });

  it("falls back to a timer when requestIdleCallback is missing, as in Safari", () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", { setTimeout, clearTimeout });
    const task = vi.fn();

    runWhenIdle(task, 500);
    expect(task).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("does not run a cancelled fallback timer", () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", { setTimeout, clearTimeout });
    const task = vi.fn();

    const cancel = runWhenIdle(task, 500);
    cancel();
    vi.advanceTimersByTime(1000);

    expect(task).not.toHaveBeenCalled();
  });
});
