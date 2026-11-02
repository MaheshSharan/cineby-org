import { useEffect, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/router";

const POPUNDER_SRC = "https://overestimatecapricornspittle.com/fb/38/40/fb3840091737b03ef8887d50204af917.js";

export function PopunderAd() {
  const router = useRouter();
  const [shouldLoad, setShouldLoad] = useState(false);

  // Strict Player Gating: NEVER load on any watch page or active video playback
  const isWatchingVideo =
    router.pathname.startsWith("/watch") ||
    router.pathname.startsWith("/sports/") ||
    router.query.play === "true" ||
    router.asPath.includes("play=true");

  useEffect(() => {
    if (isWatchingVideo) {
      setShouldLoad(false);
      return;
    }

    // Delay popunder injection so initial page paint is clean
    const timer = setTimeout(() => {
      setShouldLoad(true);
    }, 2000);

    return () => clearTimeout(timer);
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
    />
  );
}
