import Head from "next/head";

import type { MediaSummary } from "@/lib/tmdb";
import { buildImageUrl, getBackdropResponsiveUrls, getLogoUrl } from "@/lib/tmdb/image";

interface HeroPreloadProps {
  item: MediaSummary | undefined;
}

/**
 * Preloads the first hero image at high priority. The media queries and sources mirror the
 * <picture> in HeroCarousel, so the browser starts the same request the page will use and
 * does not download a second variant.
 */
export function HeroPreload({ item }: HeroPreloadProps) {
  if (!item) return null;

  const { mobile, tablet, desktopSrcSet, desktop } = getBackdropResponsiveUrls(item.backdropPath);
  const phone = buildImageUrl(item.heroPosterPath, "w780") ?? mobile;
  // On most screens the title logo is the largest element painted, so it is preloaded next to the backdrop.
  const logo = getLogoUrl(item.logoPath);

  return (
    <Head>
      {logo ? <link key="hero-preload-logo" rel="preload" as="image" href={logo} fetchPriority="high" /> : null}
      {phone ? (
        <link key="hero-preload-phone" rel="preload" as="image" href={phone} media="(max-width: 599px)" fetchPriority="high" />
      ) : null}
      {tablet ? (
        <link
          key="hero-preload-tablet"
          rel="preload"
          as="image"
          href={tablet}
          media="(min-width: 600px) and (max-width: 959px)"
          fetchPriority="high"
        />
      ) : null}
      {desktopSrcSet ? (
        <link
          key="hero-preload-desktop"
          rel="preload"
          as="image"
          imageSrcSet={desktopSrcSet}
          imageSizes="100vw"
          media="(min-width: 960px)"
          fetchPriority="high"
        />
      ) : desktop ? (
        <link key="hero-preload-desktop" rel="preload" as="image" href={desktop} media="(min-width: 960px)" fetchPriority="high" />
      ) : null}
    </Head>
  );
}
