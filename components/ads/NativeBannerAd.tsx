import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics/gtag";
import { useFirstInteraction } from "@/hooks/useFirstInteraction";
import { getNativeBannerUrl } from "@/lib/env/public";

interface NativeBannerAdProps {
  className?: string;
  /** Tells apart several banners on one page, because element ids must be unique. */
  instance?: string;
}

const AD_UNIT_NAME = "native_banner";
// The ad network renders its links without text, which screen readers announce as an unnamed link.
const AD_LINK_LABEL = "Sponsored link";

function getPlacementKey(scriptUrl: string): string {
  return new URL(scriptUrl).pathname.split("/").filter(Boolean).pop() ?? "";
}

export function NativeBannerAd({ className = "", instance }: NativeBannerAdProps) {
  const scriptSrc = getNativeBannerUrl();
  const baseId = scriptSrc ? `container-${getPlacementKey(scriptSrc)}` : "";
  const id = instance ? `${baseId}-${instance}` : baseId;
  const containerRef = useRef<HTMLDivElement>(null);
  const impressionTrackedRef = useRef(false);
  const [hasAdLoaded, setHasAdLoaded] = useState(false);
  // The ad script sets third-party cookies and is not needed for the first paint, so it waits for the visitor.
  const hasInteracted = useFirstInteraction();

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !hasInteracted || !scriptSrc) return;

    let observer: IntersectionObserver | null = null;

    // Track ad impression once container is in viewport
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          const first = entries[0];
          if (first && first.isIntersecting && !impressionTrackedRef.current) {
            impressionTrackedRef.current = true;
            trackEvent({
              action: "ad_impression",
              params: {
                ad_unit: AD_UNIT_NAME,
                ad_id: id,
                format: "banner",
              },
            });
            observer?.disconnect();
          }
        },
        { threshold: 0.5 }
      );
      observer.observe(container);
    }

    // Observe child DOM mutations inside the ad container to detect when Adsterra actually populates content
    let mutationObserver: MutationObserver | null = null;
    if (typeof MutationObserver !== "undefined") {
      mutationObserver = new MutationObserver(() => {
        // Enforce rel="nofollow noopener noreferrer" on injected ad anchors for SEO/Lighthouse integrity
        const anchors = container.querySelectorAll("a");
        for (const a of anchors) {
          if (!a.getAttribute("rel")) {
            a.setAttribute("rel", "nofollow noopener noreferrer");
          }
          if (!a.hasAttribute("aria-label") && !a.textContent?.trim() && !a.querySelector("img[alt]")) {
            a.setAttribute("aria-label", AD_LINK_LABEL);
          }
        }

        const hasContent = Boolean(
          container.querySelector("iframe") ||
          container.querySelector('div[class*="__stand"]') ||
          container.querySelector('div[class*="__bn-container"]') ||
          (container.children.length > 1)
        );
        if (hasContent) {
          setHasAdLoaded(true);
        }
      });
      mutationObserver.observe(container, { childList: true, subtree: true });
    }

    // Direct injection into container
    container.innerHTML = "";
    const script = document.createElement("script");
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.src = scriptSrc;
    container.appendChild(script);

    return () => {
      observer?.disconnect();
      mutationObserver?.disconnect();
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [id, hasInteracted, scriptSrc]);

  const handleClick = () => {
    trackEvent({
      action: "ad_click",
      params: {
        ad_unit: AD_UNIT_NAME,
        ad_id: id,
        format: "banner",
      },
    });
  };

  if (!scriptSrc) return null;

  return (
    <div
      className={`native-ad-wrapper mx-auto w-full min-w-0 max-w-full overflow-x-auto rounded-2xl border border-white/5 bg-white/[0.015] p-2 sm:p-3 text-center no-scrollbar ${className} ${
        hasAdLoaded ? "block" : "hidden"
      }`}
      onClick={handleClick}
    >
      <div
        ref={containerRef}
        id={id}
        className="w-full flex items-center justify-center min-h-[90px] overflow-x-auto"
      />
    </div>
  );
}
