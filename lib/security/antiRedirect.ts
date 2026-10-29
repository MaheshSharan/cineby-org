// ============================================================
// CINEBY POWER-RANGER ANTI-REDIRECT & ANTI-POPUP SHIELD
// Powered by uBlock Origin (gorhill/uBlock) Scriptlets
//
// Defenses:
// 1. `prevent-window-open.js` (`nowo.js`): Intercepts window.open and returns
//    a fully mocked Window object so ad scripts don't throw or trigger fallbacks.
// 2. `prevent-navigation.js`: Halts non-user-initiated top-level redirects
//    via the Chromium Navigation API.
// 3. `disable-newtab-links.js`: Defuses target="_blank" and rogue anchor clicks
//    in the capture phase.
// 4. `beforeunload` guard: Stops rogue iframe navigations from replacing
//    or redirecting the top-level Cineby window.
// ============================================================

let shieldInitialized = false;
let shieldActive = false;

/**
 * Creates a complete mock Window proxy matching uBlock Origin's `nowo.js`.
 */
function createDummyWindow(): Window {
  return {
    closed: false,
    name: "",
    opener: null,
    length: 0,
    parent: null,
    top: null,
    focus: () => {},
    blur: () => {},
    close: () => {},
    postMessage: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    location: {
      href: "",
      pathname: "",
      search: "",
      hash: "",
      host: "",
      hostname: "",
      origin: "",
      protocol: "",
      port: "",
      replace: () => {},
      assign: () => {},
      reload: () => {},
      toString: () => "",
    },
    document: {
      write: () => {},
      writeln: () => {},
      close: () => {},
      open: () => {},
      createElement: () => ({ setAttribute: () => {}, style: {} }),
      querySelector: () => null,
      querySelectorAll: () => [],
      getElementById: () => null,
      body: {},
      documentElement: {},
    },
  } as unknown as Window;
}

const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (document.activeElement && document.activeElement.tagName === "IFRAME") {
    console.warn("[Cineby Anti-Ad] Blocked parent window navigation attempt from iframe");
    e.preventDefault();
  }
};

/**
 * Installs the complete uBlock Origin scriptlet shield into the window runtime.
 */
export const initAntiRedirectShield = () => {
  if (typeof window === "undefined" || shieldInitialized) return;
  shieldInitialized = true;

  const originalOpen = window.open;

  // 1. uBlock Origin `prevent-window-open.js`
  window.open = function (url?: string | URL, target?: string, features?: string) {
    const targetUrl = typeof url === "string" ? url : url instanceof URL ? url.href : "";

    // Allow genuine user navigation to the AdGuard Chrome Store
    if (
      targetUrl &&
      targetUrl.startsWith("https://chromewebstore.google.com/detail/adguard-adblocker")
    ) {
      return originalOpen.call(window, url, target, features);
    }

    console.warn("[Cineby Anti-Ad] Defused popup attempt:", targetUrl || "empty");
    return createDummyWindow();
  };

  // 2. uBlock Origin `prevent-navigation.js` (Chromium Navigation API)
  if (
    "navigation" in window &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).navigation != null &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof (window as any).navigation.addEventListener === "function"
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const navHandler = (e: any) => {
      if (e.userInitiated) return;
      const destinationUrl = e.destination?.url || "";
      if (
        destinationUrl &&
        !destinationUrl.includes(window.location.host) &&
        !destinationUrl.startsWith("about:blank") &&
        !destinationUrl.startsWith("javascript:")
      ) {
        console.warn("[Cineby Anti-Ad] Cancelled top-level hijack navigation:", destinationUrl);
        e.preventDefault();
      }
    };
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).navigation.addEventListener("navigate", navHandler);
    } catch {}
  }

  // 3. uBlock Origin `disable-newtab-links.js`
  window.addEventListener(
    "click",
    (ev) => {
      let target = ev.target as HTMLElement | null;
      while (target !== null && target !== document.body) {
        if (target.localName === "a") {
          const anchor = target as HTMLAnchorElement;
          const href = anchor.href || "";
          const hasBlankTarget = anchor.getAttribute("target") === "_blank";
          const isExternal =
            href.startsWith("http") &&
            !href.includes(window.location.host) &&
            !href.startsWith("https://chromewebstore.google.com/detail/adguard-adblocker");

          if (hasBlankTarget || isExternal) {
            console.warn("[Cineby Anti-Ad] Defused external link click in capture phase:", href);
            ev.stopPropagation();
            ev.preventDefault();
            break;
          }
        }
        target = target.parentElement;
      }
    },
    { capture: true }
  );
};

/**
 * Activates/deactivates beforeunload guard.
 */
export const setAntiRedirectShieldActive = (active: boolean) => {
  if (typeof window === "undefined") return;
  if (!shieldInitialized) {
    initAntiRedirectShield();
  }

  if (active && !shieldActive) {
    shieldActive = true;
    window.addEventListener("beforeunload", handleBeforeUnload);
  } else if (!active && shieldActive) {
    shieldActive = false;
    window.removeEventListener("beforeunload", handleBeforeUnload);
  }
};
