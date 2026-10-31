import { useEffect, useRef } from "react";

interface NativeBannerAdProps {
  className?: string;
}

const AD_CONTAINER_ID = "container-7f39a089ecb822ed1c9d27240135d8fd";
const AD_SCRIPT_SRC = "https://pl32119482.profitableratecpmnetwork.com/7f39a089ecb822ed1c9d27240135d8fd/invoke.js";

export function NativeBannerAd({ className = "" }: NativeBannerAdProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Avoid double injecting script into the same ad container
    if (container.querySelector(`script[src*="7f39a089ecb822ed1c9d27240135d8fd"]`)) {
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.src = AD_SCRIPT_SRC;

    container.appendChild(script);

    return () => {
      // Optional cleanup on component unmount
      if (container) {
        container.innerHTML = "";
      }
    };
  }, []);

  return (
    <div
      className={`mx-auto w-full max-w-[1360px] overflow-hidden rounded-2xl border border-white/5 bg-white/[0.015] p-2 sm:p-4 text-center ${className}`}
    >
      <div ref={containerRef} id={AD_CONTAINER_ID} className="min-h-[90px] w-full flex items-center justify-center" />
    </div>
  );
}
