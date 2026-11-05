import { useEffect, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/router";
import { isTier1Country } from "@/lib/geo";

const SOCIAL_BAR_SRC = "https://bicea.org/14/6fa9ccc24c9972e71deaa2ad60a46e55";
const LOAD_DELAY_MS = 2500; // 2.5s delay for smooth initial paint and higher perceived value

function purgeActiveSocialBarWidgets() {
  if (typeof document === "undefined") return;

  // Clean any floating notifications, message boxes, or chat heads created by the Adsterra script
  const selectors = [
    'div[class*="sb_"]',
    'div[id*="sb_"]',
    'div[class*="bicea"]',
    'div[id*="bicea"]',
    'iframe[src*="bicea"]',
    'div[class*="container-"][style*="fixed"]',
    'div[class*="container-"][style*="absolute"]'
  ];

  selectors.forEach((sel) => {
    try {
      const elements = document.querySelectorAll(sel);
      elements.forEach((el) => el.remove());
    } catch {
      // Ignore query errors
    }
  });
}

export function SocialBarAd() {
  const router = useRouter();
  const [shouldLoad, setShouldLoad] = useState(false);

  // Precision Check: Only treat as player when actively watching playback (?play=true or /watch/...)
  const isWatchingVideo =
    router.pathname.startsWith("/watch") ||
    router.query.play === "true" ||
    router.asPath.includes("play=true");

  useEffect(() => {
    if (isWatchingVideo || !isTier1Country()) {
      setShouldLoad(false);
      purgeActiveSocialBarWidgets();
      return;
    }

    // Delay loading Social Bar so visitors experience clean initial paint first
    const timer = setTimeout(() => {
      setShouldLoad(true);
    }, LOAD_DELAY_MS);

    return () => clearTimeout(timer);
  }, [isWatchingVideo, router.asPath]);

  if (isWatchingVideo || !shouldLoad) {
    return null;
  }

  return (
    <Script
      id="social-bar-ad"
      strategy="lazyOnload"
      src={SOCIAL_BAR_SRC}
      data-cfasync="false"
    />
  );
}
