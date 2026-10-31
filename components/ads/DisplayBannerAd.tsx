import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics/gtag";

interface DisplayBannerAdProps {
  className?: string;
}

const DESKTOP_KEY = "d00497e923c9d5d37a63a4339e0d61a3"; // 728x90
const MOBILE_KEY = "5063a4e3bd84a189a0cddd20e9072623";  // 300x250

export function DisplayBannerAd({ className = "" }: DisplayBannerAdProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const impressionTrackedRef = useRef(false);
  const [hasAdLoaded, setHasAdLoaded] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Detect mobile viewport (< 768px)
    const isMobile = window.innerWidth < 768;
    const key = isMobile ? MOBILE_KEY : DESKTOP_KEY;
    const width = isMobile ? 300 : 728;
    const height = isMobile ? 250 : 90;

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
                ad_unit: "display_banner",
                ad_id: key,
                format: `${width}x${height}`,
              },
            });
            observer?.disconnect();
          }
        },
        { threshold: 0.5 }
      );
      observer.observe(container);
    }

    // Clean container before writing iframe
    container.innerHTML = "";

    // Create an isolated sandboxed iframe for the standard Adsterra display banner
    const iframe = document.createElement("iframe");
    iframe.title = "Advertisement";
    iframe.width = String(width);
    iframe.height = String(height);
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute("scrolling", "no");
    iframe.setAttribute(
      "sandbox",
      "allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation-by-user-activation"
    );
    iframe.style.border = "none";
    iframe.style.overflow = "hidden";
    iframe.style.maxWidth = "100%";
    iframe.style.display = "block";
    iframe.style.margin = "0 auto";

    container.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { margin: 0; padding: 0; background: transparent; overflow: hidden; display: flex; justify-content: center; align-items: center; }
            </style>
          </head>
          <body>
            <script type="text/javascript">
              atOptions = {
                'key' : '${key}',
                'format' : 'iframe',
                'height' : ${height},
                'width' : ${width},
                'params' : {}
              };
            <\/script>
            <script type="text/javascript" src="https://bicea.org/22/${key}"><\/script>
          </body>
        </html>
      `);
      doc.close();

      // Show container once iframe is injected
      setHasAdLoaded(true);
    }

    return () => {
      observer?.disconnect();
      if (container) {
        container.innerHTML = "";
      }
    };
  }, []);

  const handleClick = () => {
    trackEvent({
      action: "ad_click",
      params: {
        ad_unit: "display_banner",
        format: "display",
      },
    });
  };

  return (
    <div
      className={`display-ad-wrapper mx-auto w-full max-w-[1360px] overflow-hidden rounded-2xl border border-white/5 bg-white/[0.015] p-2 sm:p-3 text-center ${className} ${
        hasAdLoaded ? "block" : "hidden"
      }`}
      onClick={handleClick}
    >
      <div
        ref={containerRef}
        className="w-full flex items-center justify-center min-h-[90px] overflow-hidden"
      />
    </div>
  );
}
