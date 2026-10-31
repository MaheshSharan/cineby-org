import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics/gtag";

interface NativeBannerAdProps {
  className?: string;
  id?: string;
}

const AD_SCRIPT_SRC = "https://pl32119482.profitableratecpmnetwork.com/7f39a089ecb822ed1c9d27240135d8fd/invoke.js";
const AD_UNIT_NAME = "native_banner";

export function NativeBannerAd({ className = "", id = "container-7f39a089ecb822ed1c9d27240135d8fd" }: NativeBannerAdProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const impressionTrackedRef = useRef(false);
  const [hasAdLoaded, setHasAdLoaded] = useState(false);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let observer: IntersectionObserver | null = null;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    const handleMessage = (e: MessageEvent) => {
      if (e.data && typeof e.data === "object" && e.data.type === "adsterra_native_loaded") {
        setHasAdLoaded(true);
        if (iframe && typeof e.data.height === "number" && e.data.height > 50) {
          iframe.style.height = `${e.data.height}px`;
        }
      }
    };
    window.addEventListener("message", handleMessage);

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
      observer.observe(iframe);
    }

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
            <style>
              body, html {
                margin: 0;
                padding: 0;
                background: transparent;
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
                scrollbar-width: none;
              }
              body::-webkit-scrollbar { display: none; }
              #container-7f39a089ecb822ed1c9d27240135d8fd {
                width: 100%;
                display: flex;
                justify-content: center;
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
              }
              [class*="__stand"] {
                display: flex !important;
                flex-flow: row nowrap !important;
                overflow-x: auto !important;
                overflow-y: hidden !important;
                justify-content: flex-start !important;
                gap: 12px !important;
                padding-bottom: 6px !important;
                -webkit-overflow-scrolling: touch;
              }
              @media (min-width: 768px) {
                [class*="__stand"] {
                  flex-flow: row wrap !important;
                  justify-content: space-around !important;
                  overflow-x: visible !important;
                }
              }
              [class*="__bn-container"] {
                flex: 0 0 auto !important;
                width: 260px !important;
                max-width: 80vw !important;
                padding: 4px !important;
              }
              @media (min-width: 768px) {
                [class*="__bn-container"] {
                  width: auto !important;
                  flex: 1 1 220px !important;
                  max-width: 320px !important;
                  padding: 8px !important;
                }
              }
              [class*="__title"] {
                font-size: 13px !important;
                line-height: 1.3 !important;
                max-height: 2.6em !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                display: -webkit-box !important;
                -webkit-line-clamp: 2 !important;
                -webkit-box-orient: vertical !important;
                color: rgba(255, 255, 255, 0.85) !important;
                font-family: system-ui, -apple-system, sans-serif !important;
              }
            </style>
          </head>
          <body>
            <div id="container-7f39a089ecb822ed1c9d27240135d8fd"></div>
            <script async data-cfasync="false" src="${AD_SCRIPT_SRC}"><\/script>
            <script>
              var observer = new MutationObserver(function() {
                var el = document.getElementById("container-7f39a089ecb822ed1c9d27240135d8fd");
                if (el && (el.querySelector("iframe") || el.querySelector("[class*='__stand']") || el.children.length > 0)) {
                  var h = document.body.scrollHeight || 160;
                  window.parent.postMessage({ type: "adsterra_native_loaded", height: h }, "*");
                }
              });
              observer.observe(document.body, { childList: true, subtree: true });
            <\/script>
          </body>
        </html>
      `);
      iframeDoc.close();
    }

    return () => {
      observer?.disconnect();
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener("message", handleMessage);
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
      ref={containerRef}
      className={`native-ad-wrapper mx-auto w-full max-w-[1360px] overflow-x-auto rounded-2xl border border-white/5 bg-white/[0.015] p-2 sm:p-3 text-center no-scrollbar ${className} ${
        hasAdLoaded ? "block" : "hidden"
      }`}
      onClick={handleClick}
    >
      <iframe
        ref={iframeRef}
        title="Sponsored Recommendation"
        className="w-full border-0 overflow-hidden"
        style={{ minHeight: "150px", height: "160px" }}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation-by-user-activation"
      />
    </div>
  );
}
