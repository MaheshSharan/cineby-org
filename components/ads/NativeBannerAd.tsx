import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics/gtag";

interface NativeBannerAdProps {
  className?: string;
  id?: string;
}

const AD_SCRIPT_SRC = "https://pl32119482.profitableratecpmnetwork.com/7f39a089ecb822ed1c9d27240135d8fd/invoke.js";
const AD_UNIT_NAME = "native_banner";

export function NativeBannerAd({ className = "", id = "container-7f39a089ecb822ed1c9d27240135d8fd" }: NativeBannerAdProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const impressionTrackedRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Track ad impression once container is in viewport
    let observer: IntersectionObserver | null = null;
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

    // Avoid double injecting script into the same ad container
    if (container.querySelector(`script[src*="7f39a089ecb822ed1c9d27240135d8fd"]`)) {
      return () => {
        observer?.disconnect();
      };
    }

    const script = document.createElement("script");
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.src = AD_SCRIPT_SRC;

    container.appendChild(script);

    return () => {
      observer?.disconnect();
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [id]);

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

  return (
    <div
      className={`native-ad-wrapper mx-auto w-full max-w-[1360px] overflow-hidden rounded-2xl border border-white/5 bg-white/[0.015] p-2 sm:p-3 text-center ${className}`}
      onClick={handleClick}
    >
      <div
        ref={containerRef}
        id={id}
        className="w-full flex items-center justify-center min-h-[90px]"
      />
    </div>
  );
}
