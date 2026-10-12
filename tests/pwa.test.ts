import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, it, expect, vi } from "vitest";

import { INSTALL_DISMISS_DAYS, PWA_BACKGROUND_COLOR } from "@/lib/constants/pwa";
import { isDismissalActive } from "@/lib/pwa/installDismissal";
import { getIosSplashImagePath, getIosSplashMedia, IOS_SPLASH_SCREENS } from "@/lib/pwa/iosSplash";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const PNG_COLOR_TYPE_OFFSET = 25;
const PNG_COLOR_TYPE_RGB = 2;

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose: string;
}

interface WebManifest {
  display: string;
  start_url: string;
  background_color: string;
  theme_color: string;
  orientation?: string;
  icons: ManifestIcon[];
}

function readPublicFile(relativePath: string): Buffer {
  return fs.readFileSync(path.join(PUBLIC_DIR, relativePath));
}

function readPngSize(relativePath: string): string {
  const png = readPublicFile(relativePath);
  return `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`;
}

const manifest = JSON.parse(readPublicFile("manifest.webmanifest").toString("utf8")) as WebManifest;

describe("web app manifest", () => {
  it("installs as a standalone app", () => {
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
  });

  it("does not lock orientation, because the player needs landscape", () => {
    expect(manifest.orientation).toBeUndefined();
  });

  it("uses the app background for the launch splash and the offline page", () => {
    expect(manifest.background_color).toBe(PWA_BACKGROUND_COLOR);
    expect(manifest.theme_color).toBe(PWA_BACKGROUND_COLOR);
    expect(readPublicFile("offline.html").toString("utf8")).toContain(PWA_BACKGROUND_COLOR);
  });

  it("matches the --background token in globals.css", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "styles/globals.css"), "utf8");
    const lightness = css.match(/--background:\s*0 0% (\d+(?:\.\d+)?)%/)?.[1];

    expect(lightness).toBeDefined();
    const channel = Math.round(Number(lightness) * 2.55).toString(16).padStart(2, "0");
    expect(PWA_BACKGROUND_COLOR).toBe(`#${channel}${channel}${channel}`);
  });

  it("points every icon at a PNG with the declared size", () => {
    for (const icon of manifest.icons) {
      expect(icon.type).toBe("image/png");
      expect(readPngSize(icon.src.slice(1))).toBe(icon.sizes);
    }
  });

  it("offers the icon sizes and purposes Android needs for a WebAPK", () => {
    const has = (sizes: string, purpose: string) =>
      manifest.icons.some((icon) => icon.sizes === sizes && icon.purpose === purpose);

    expect(has("192x192", "any")).toBe(true);
    expect(has("512x512", "any")).toBe(true);
    expect(has("512x512", "maskable")).toBe(true);
  });

  it("ships an opaque 180px Apple touch icon", () => {
    const png = readPublicFile("icons/apple-touch-icon.png");

    expect(readPngSize("icons/apple-touch-icon.png")).toBe("180x180");
    // iOS fills transparent pixels with black, so the icon must have no alpha channel.
    expect(png[PNG_COLOR_TYPE_OFFSET]).toBe(PNG_COLOR_TYPE_RGB);
  });
});

type WorkerEvent = Record<string, unknown>;
type WorkerListener = (event: WorkerEvent) => void;
type FetchImplementation = (input: unknown, init?: unknown) => Promise<Response>;

function loadServiceWorker(fetchImplementation: FetchImplementation) {
  const listeners = new Map<string, WorkerListener>();
  const offlineResponse = new Response("offline");
  const put = vi.fn<(url: string, response: Response) => Promise<undefined>>(async () => undefined);

  const sandbox = {
    self: {
      addEventListener: (type: string, listener: WorkerListener) => listeners.set(type, listener),
      skipWaiting: async () => undefined,
      clients: { claim: async () => undefined },
      registration: { navigationPreload: { enable: async () => undefined } },
    },
    caches: {
      open: async () => ({ put }),
      match: async () => offlineResponse,
      keys: async () => [],
      delete: async () => true,
    },
    fetch: fetchImplementation,
    Response,
  };
  vm.runInNewContext(readPublicFile("sw.js").toString("utf8"), sandbox);

  return { listeners, offlineResponse, put };
}

function dispatchFetch(
  listeners: Map<string, WorkerListener>,
  request: { mode: string; url: string }
): Promise<unknown> | undefined {
  let answer: Promise<unknown> | undefined;
  listeners.get("fetch")?.({
    request,
    preloadResponse: Promise.resolve(undefined),
    respondWith: (response: Promise<unknown>) => {
      answer = response;
    },
  });
  return answer;
}

describe("service worker", () => {
  it("leaves API, stream and asset requests to the network", () => {
    const { listeners } = loadServiceWorker(async () => new Response("network"));

    for (const url of ["/api/stream/proxy", "/_next/static/chunk.js", "/video/segment.ts"]) {
      expect(dispatchFetch(listeners, { mode: "cors", url })).toBeUndefined();
    }
  });

  it("passes page navigations through while online", async () => {
    const networkResponse = new Response("page");
    const { listeners } = loadServiceWorker(async () => networkResponse);

    const answer = await dispatchFetch(listeners, { mode: "navigate", url: "/watch/1" });

    expect(answer).toBe(networkResponse);
  });

  it("shows the offline page when a page navigation fails", async () => {
    const { listeners, offlineResponse } = loadServiceWorker(async () => {
      throw new TypeError("Failed to fetch");
    });

    const answer = await dispatchFetch(listeners, { mode: "navigate", url: "/watch/1" });

    expect(answer).toBe(offlineResponse);
  });

  it("stores the offline page without the redirected flag", async () => {
    const redirected = new Response("<html>offline</html>", { status: 200 });
    Object.defineProperty(redirected, "redirected", { value: true });
    const { listeners, put } = loadServiceWorker(async () => redirected);

    let installation: Promise<unknown> | undefined;
    listeners.get("install")?.({
      waitUntil: (work: Promise<unknown>) => {
        installation = work;
      },
    });
    await installation;

    const [url, stored] = put.mock.calls[0];
    expect(url).toBe("/offline.html");
    expect(stored.redirected).toBe(false);
    expect(await stored.text()).toBe("<html>offline</html>");
  });
});

describe("home screen shortcuts", () => {
  const shortcuts = (manifest as WebManifest & { shortcuts: { url: string }[] }).shortcuts;

  it("link to the search deep link and the watchlist page", () => {
    expect(shortcuts.map((shortcut) => shortcut.url)).toEqual(["/?search=1", "/watchlist"]);
    expect(fs.existsSync(path.join(process.cwd(), "pages/watchlist.tsx"))).toBe(true);
  });
});

describe("iOS launch images", () => {
  it("ship one image per device with the exact pixel size", () => {
    for (const screen of IOS_SPLASH_SCREENS) {
      const expected = `${screen.width * screen.pixelRatio}x${screen.height * screen.pixelRatio}`;
      expect(readPngSize(getIosSplashImagePath(screen).slice(1))).toBe(expected);
    }
  });

  it("never declare the same device query twice", () => {
    const queries = IOS_SPLASH_SCREENS.map(getIosSplashMedia);
    expect(new Set(queries).size).toBe(queries.length);
  });
});

describe("install banner dismissal", () => {
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  it("stays hidden until the dismissal period ends", () => {
    expect(isDismissalActive(null, now)).toBe(false);
    expect(isDismissalActive(now - DAY_MS, now)).toBe(true);
    expect(isDismissalActive(now - (INSTALL_DISMISS_DAYS + 1) * DAY_MS, now)).toBe(false);
  });
});
