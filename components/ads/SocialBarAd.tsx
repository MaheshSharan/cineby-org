import { useEffect, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/router";

const SOCIAL_BAR_SRC = "https://bicea.org/14/6fa9ccc24c9972e71deaa2ad60a46e55";
const LOAD_DELAY_MS = 2500; // 2.5s delay for smooth initial paint and higher perceived value

export function SocialBarAd() {
  const router = useRouter();
  const [shouldLoad, setShouldLoad] = useState(false);

  // Strict rule: skip all player/detail streaming routes
  const isPlayerRoute =
    router.pathname.startsWith("/watch") ||
    router.pathname.startsWith("/movie") ||
    router.pathname.startsWith("/tv");

  useEffect(() => {
    if (isPlayerRoute) {
      setShouldLoad(false);
      return;
    }

    // Delay loading Social Bar so visitors experience fast, clean initial page load first
    const timer = setTimeout(() => {
      setShouldLoad(true);
    }, LOAD_DELAY_MS);

    return () => clearTimeout(timer);
  }, [isPlayerRoute]);

  if (isPlayerRoute || !shouldLoad) {
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
