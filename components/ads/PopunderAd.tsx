import { useEffect, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/router";
import { isPlayerPath } from "@/lib/ads/placement";
import { trackEvent } from "@/lib/analytics/gtag";

const POPUNDER_SRC = "https://overestimatecapricornspittle.com/fb/38/40/fb3840091737b03ef8887d50204af917.js";
const POPUNDER_STORAGE_KEY = "cineby_last_popunder";
const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes cooldown (player-gated)

// Currently disabled: not mounted in pages/_app.tsx. Re-enable by mounting <PopunderAd />.
export function PopunderAd() {
  const router = useRouter();
  const [shouldLoad, setShouldLoad] = useState(false);

  // Strict Player Gating: NEVER load on any watch page or active video playback
  const isWatchingVideo = isPlayerPath(router.asPath);

  useEffect(() => {
    if (isWatchingVideo) {
      setShouldLoad(false);
      return;
    }

    // 30-minute frequency check
    try {
      const lastPopunder = localStorage.getItem(POPUNDER_STORAGE_KEY);
      const now = Date.now();
      if (lastPopunder && now - Number(lastPopunder) < COOLDOWN_MS) {
        setShouldLoad(false);
        return;
      }

      // Delay popunder injection so initial page paint is completely clean
      const timer = setTimeout(() => {
        try {
          localStorage.setItem(POPUNDER_STORAGE_KEY, String(Date.now()));
        } catch {
          // Ignore storage errors
        }
        setShouldLoad(true);
      }, 3000);

      return () => clearTimeout(timer);
    } catch {
      setShouldLoad(false);
    }
  }, [isWatchingVideo, router.asPath]);

  if (isWatchingVideo || !shouldLoad) {
    return null;
  }

  return (
    <Script
      id="adsterra-popunder"
      src={POPUNDER_SRC}
      strategy="lazyOnload"
      data-cfasync="false"
      onLoad={() =>
        trackEvent({ action: "ad_impression", params: { ad_unit: "popunder", format: "popunder_30m" } })
      }
    />
  );
}
