import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  checkDebuggerTiming,
  checkDimensionDelta,
  createConsoleTrap,
  initDevtoolsGuard,
  triggerDevtoolsNeutralization,
} from "@/lib/security/devtoolsGuard";

describe("devtoolsGuard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("triggerDevtoolsNeutralization", () => {
    it("clears sessionStorage, wipes document, and redirects", () => {
      const clearSpy = vi.fn();
      const replaceSpy = vi.fn();

      vi.stubGlobal("window", {
        sessionStorage: { clear: clearSpy },
        location: { replace: replaceSpy, href: "" },
      });
      vi.stubGlobal("document", {
        documentElement: { innerHTML: "<div>secret</div>" },
      });

      triggerDevtoolsNeutralization("about:blank");

      expect(clearSpy).toHaveBeenCalledTimes(1);
      expect(document.documentElement.innerHTML).toBe("");
      expect(replaceSpy).toHaveBeenCalledWith("about:blank");
    });
  });

  describe("checkDebuggerTiming", () => {
    it("returns false when execution delta is below threshold", () => {
      let callCount = 0;
      vi.spyOn(performance, "now").mockImplementation(() => {
        callCount += 1;
        return callCount === 1 ? 100 : 105; // 5ms delta
      });

      const detected = checkDebuggerTiming(100);
      expect(detected).toBe(false);
    });

    it("returns true when execution delta meets or exceeds threshold", () => {
      let callCount = 0;
      vi.spyOn(performance, "now").mockImplementation(() => {
        callCount += 1;
        return callCount === 1 ? 100 : 250; // 150ms delta
      });

      const detected = checkDebuggerTiming(100);
      expect(detected).toBe(true);
    });
  });

  describe("checkDimensionDelta", () => {
    it("detects docked devtools when outer - inner exceeds threshold on non-touch desktop", () => {
      vi.stubGlobal("window", {
        outerWidth: 1400,
        innerWidth: 1000, // 400px diff
        outerHeight: 900,
        innerHeight: 900,
      });
      vi.stubGlobal("navigator", {
        maxTouchPoints: 0,
      });

      expect(checkDimensionDelta(160)).toBe(true);
    });

    it("ignores dimension difference on touch devices", () => {
      vi.stubGlobal("window", {
        outerWidth: 800,
        innerWidth: 400,
        outerHeight: 1200,
        innerHeight: 800,
        ontouchstart: {},
      });
      vi.stubGlobal("navigator", {
        maxTouchPoints: 5,
      });

      expect(checkDimensionDelta(160)).toBe(false);
    });

    it("returns false when window dimensions are within tolerance", () => {
      vi.stubGlobal("window", {
        outerWidth: 1020,
        innerWidth: 1000, // 20px difference (standard window borders)
        outerHeight: 820,
        innerHeight: 800,
      });
      vi.stubGlobal("navigator", {
        maxTouchPoints: 0,
      });

      expect(checkDimensionDelta(160)).toBe(false);
    });
  });

  describe("createConsoleTrap", () => {
    it("triggers callback when console inspection accesses properties", () => {
      const onTrigger = vi.fn();
      const { trap } = createConsoleTrap(onTrigger);

      // Simulate DevTools console reading id
      const debugSpy = vi.spyOn(console, "debug").mockImplementation((obj: unknown) => {
        // Devtools logs and reads property getters
        if (obj && typeof obj === "object" && "id" in obj) {
          void (obj as { id: string }).id;
        }
      });

      trap();

      expect(onTrigger).toHaveBeenCalledTimes(1);
      debugSpy.mockRestore();
    });
  });

  describe("initDevtoolsGuard", () => {
    it("does nothing when disabled", () => {
      const onDetect = vi.fn();
      const teardown = initDevtoolsGuard({
        enabled: false,
        onDetect,
      });

      teardown();
      expect(onDetect).not.toHaveBeenCalled();
    });

    it("attaches resize listener and triggers onDetect when triggered", () => {
      const onDetect = vi.fn();
      const addEventListenerSpy = vi.fn();
      const removeEventListenerSpy = vi.fn();

      vi.stubGlobal("window", {
        addEventListener: addEventListenerSpy,
        removeEventListener: removeEventListenerSpy,
        outerWidth: 1000,
        innerWidth: 1000,
        outerHeight: 800,
        innerHeight: 800,
      });
      vi.stubGlobal("navigator", {
        maxTouchPoints: 0,
      });

      const teardown = initDevtoolsGuard({
        enabled: true,
        onDetect,
        checkIntervalMs: 1000,
      });

      expect(addEventListenerSpy).toHaveBeenCalledWith("resize", expect.any(Function), { passive: true });
      teardown();
      expect(removeEventListenerSpy).toHaveBeenCalledWith("resize", expect.any(Function));
    });
  });
});
