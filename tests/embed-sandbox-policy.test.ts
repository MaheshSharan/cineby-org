import { describe, expect, it } from "vitest";

import {
  canUseSandbox,
  POPUP_BLOCKING_SANDBOX,
  rememberSandboxRefusal,
  SANDBOX_RETRY_AFTER_MS,
} from "@/lib/embeds/sandboxPolicy";
import { framextvEmbed } from "@/lib/embeds/sites/framextv";
import { vidriftEmbed } from "@/lib/embeds/sites/vidrift";

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  } as Storage;
}

describe("popup-blocking sandbox", () => {
  it("never grants popups, top navigation, modals or downloads", () => {
    expect(POPUP_BLOCKING_SANDBOX).not.toMatch(/popups|top-navigation|modals|downloads/);
    expect(POPUP_BLOCKING_SANDBOX).toContain("allow-scripts");
    expect(POPUP_BLOCKING_SANDBOX).toContain("allow-same-origin");
  });

  it("is declared by FrameXTV, but not by VidRift, which refuses to play sandboxed", () => {
    expect(vidriftEmbed.iframe.sandbox).toBeUndefined();
    expect(framextvEmbed.iframe.sandbox).toBe(POPUP_BLOCKING_SANDBOX);
  });

  it("remembers a refusal for 14 days, then tries the sandbox again", () => {
    const storage = memoryStorage();
    expect(canUseSandbox("vidrift", storage, 1000)).toBe(true);

    rememberSandboxRefusal("vidrift", storage, 1000);
    expect(canUseSandbox("vidrift", storage, 2000)).toBe(false);
    expect(canUseSandbox("framextv", storage, 2000)).toBe(true);
    expect(canUseSandbox("vidrift", storage, 1000 + SANDBOX_RETRY_AFTER_MS)).toBe(true);
  });
});
