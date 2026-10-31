import Script from "next/script";
import { useRouter } from "next/router";

const SOCIAL_BAR_SRC = "https://bicea.org/14/6fa9ccc24c9972e71deaa2ad60a46e55";

export function SocialBarAd() {
  const router = useRouter();

  // Strict rule: skip all player/detail streaming routes
  const isPlayerRoute =
    router.pathname.startsWith("/watch") ||
    router.pathname.startsWith("/movie") ||
    router.pathname.startsWith("/tv");

  if (isPlayerRoute) {
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
