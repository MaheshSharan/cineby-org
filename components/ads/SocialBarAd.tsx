import { useEffect, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/router";

import { trackEvent } from "@/lib/analytics/gtag";
import { isPlayerPath } from "@/lib/ads/placement";
import { useFirstInteraction } from "@/hooks/useFirstInteraction";
import { getSocialBarUrl } from "@/lib/env/public";

const SCRIPT_ID = "social-bar-ad";
const LOAD_DELAY_MS = 2500;

let scriptLoaded = false;

function purgeActiveSocialBarWidgets() {
  if (typeof document === "undefined") return;

  const selectors = [
    'div[class*="sb_"]',
    'div[id*="sb_"]',
    'div[class*="bicea"]',
    'div[id*="bicea"]',
    'iframe[src*="bicea"]',
    'div[class*="container-"][style*="fixed"]',
    'div[class*="container-"][style*="absolute"]',
  ];

  for (const sel of selectors) {
    try {
      document.querySelectorAll(sel).forEach((el) => el.remove());
    } catch {
      // Ignore selector errors
    }
  }
}

export function SocialBarAd() {
  const router = useRouter();
  const socialBarSrc = getSocialBarUrl();
  const [shouldLoad, setShouldLoad] = useState(false);
  // The bar sets third-party cookies and is not needed for the first paint, so it waits for the visitor.
  const hasInteracted = useFirstInteraction();
  const onPlayer = isPlayerPath(router.asPath);

  useEffect(() => {
    if (onPlayer) {
      setShouldLoad(false);
      purgeActiveSocialBarWidgets();
      return;
    }

    if (!hasInteracted) return;

    const timer = setTimeout(() => setShouldLoad(true), LOAD_DELAY_MS);
    return () => clearTimeout(timer);
  }, [onPlayer, hasInteracted]);

  // Once loaded, the script keeps running for the whole session and cannot be unloaded. A full page
  // load is the only reliable way to guarantee no ad code runs on a player page.
  useEffect(() => {
    const handleRouteStart = (url: string) => {
      if (!scriptLoaded || !isPlayerPath(url)) return;
      window.location.assign(url);
      router.events.emit("routeChangeError");
      throw new Error("Route change aborted: reloading without ads");
    };

    router.events.on("routeChangeStart", handleRouteStart);
    return () => router.events.off("routeChangeStart", handleRouteStart);
  }, [router.events]);

  if (!socialBarSrc || onPlayer || !shouldLoad) return null;

  return (
    <Script
      id={SCRIPT_ID}
      strategy="lazyOnload"
      src={socialBarSrc}
      data-cfasync="false"
      onLoad={() => {
        scriptLoaded = true;
        trackEvent({
          action: "ad_impression",
          params: { ad_unit: "social_bar", format: "social_bar" },
        });
      }}
    />
  );
}
