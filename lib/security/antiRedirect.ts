// ============================================================
// CINEBY ANTI-REDIRECT & ANTI-POPUP SHIELD
// Prevents third-party embed iframes and rogue ad scripts from:
// 1. Spawning popup tabs/windows via window.open (returns a closed dummy Window mock).
// 2. Navigating or hijacking the top parent window (beforeunload lock on iframe interactions).
// 3. Capturing and blocking rogue synthetic or bubbled clicks on external ad links.
// ============================================================

let shieldInitialized = false;
let shieldActive = false;

const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  // If active focused element is an iframe trying to navigate the parent window away
  if (document.activeElement && document.activeElement.tagName === "IFRAME") {
    console.warn("[Cineby Anti-Ad] Blocked parent window navigation from iframe");
    e.preventDefault();
  }
};

/**
 * Installs the anti-redirect shield on the window object once (idempotent).
 */
export const initAntiRedirectShield = () => {
  if (typeof window === "undefined" || shieldInitialized) return;
  shieldInitialized = true;

  // Safe dummy Window proxy to satisfy ad scripts expecting a returned Window instance
  const dummyWindow = {
    closed: true,
    focus: () => {},
    blur: () => {},
    close: () => {},
    postMessage: () => {},
    location: { href: "", replace: () => {} },
  } as unknown as Window;

  const originalOpen = window.open;

  window.open = function (url?: string | URL, target?: string, features?: string) {
    const targetUrl = typeof url === "string" ? url : url instanceof URL ? url.href : "";

    // Allow legitimate Cineby links (e.g. Chrome Web Store AdGuard link)
    if (
      targetUrl &&
      targetUrl.startsWith("https://chromewebstore.google.com/detail/adguard-adblocker")
    ) {
      return originalOpen.call(window, url, target, features);
    }

    console.warn("[Cineby Anti-Ad] Blocked popup attempt:", targetUrl || "empty");
    return dummyWindow;
  };

  // Intercept and prevent synthetic clicks on external ad/popup links on capturing phase
  window.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLElement | null;
      const link = target?.closest("a");
      if (link) {
        const href = link.getAttribute("href") || "";
        const targetAttr = link.getAttribute("target");
        const isExternal =
          href.startsWith("http://") ||
          href.startsWith("https://") ||
          targetAttr === "_blank";

        if (
          isExternal &&
          !href.startsWith(window.location.origin) &&
          !href.startsWith("https://chromewebstore.google.com/detail/adguard-adblocker")
        ) {
          e.preventDefault();
          e.stopPropagation();
          console.warn("[Cineby Anti-Ad] Blocked unauthorized ad link click:", href);
        }
      }
    },
    { capture: true }
  );
};

/**
 * Activates/deactivates beforeunload hijack protection while player is active.
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

