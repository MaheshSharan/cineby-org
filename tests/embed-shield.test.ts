import { describe, expect, it, vi, afterEach } from "vitest";
import { isHumanInteraction } from "@/lib/player/embedShield";

describe("lib/player/embedShield.ts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true for trusted human click events", () => {
    const mockEvent = {
      nativeEvent: { isTrusted: true },
    } as any;

    expect(isHumanInteraction(mockEvent)).toBe(true);
  });

  it("returns false for synthetic bot click events (isTrusted: false)", () => {
    const mockEvent = {
      nativeEvent: { isTrusted: false },
    } as any;

    expect(isHumanInteraction(mockEvent)).toBe(false);
  });

  it("returns false when navigator.webdriver is true (automated headless browser)", () => {
    const originalWindow = (globalThis as any).window;
    const originalWebdriverDesc = Object.getOwnPropertyDescriptor(globalThis.navigator, "webdriver");

    try {
      (globalThis as any).window = {};
      Object.defineProperty(globalThis.navigator, "webdriver", {
        value: true,
        configurable: true,
        writable: true,
      });

      const mockEvent = {
        nativeEvent: { isTrusted: true },
      } as any;

      expect(isHumanInteraction(mockEvent)).toBe(false);
    } finally {
      (globalThis as any).window = originalWindow;
      if (originalWebdriverDesc) {
        Object.defineProperty(globalThis.navigator, "webdriver", originalWebdriverDesc);
      } else {
        delete (globalThis.navigator as any).webdriver;
      }
    }
  });

  it("returns true when event is omitted or lacks isTrusted in normal environment", () => {
    expect(isHumanInteraction(null)).toBe(true);
    expect(isHumanInteraction({} as any)).toBe(true);
  });
});
