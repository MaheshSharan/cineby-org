import { useCallback } from "react";

import { ContentRow } from "@/components/content/ContentRow";
import {
  STREAMING_PROVIDERS,
  type StreamingProvider,
} from "@/lib/constants/providers";

interface BrowseByProviderRowProps {
  onSelectProvider?: (providerId: number) => void;
}

export function BrowseByProviderRow({ onSelectProvider }: BrowseByProviderRowProps) {
  const handleClick = useCallback(
    (provider: StreamingProvider) => {
      onSelectProvider?.(provider.id);

      const target = document.getElementById("only-on-section");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
    [onSelectProvider]
  );

  return (
    <ContentRow title="Browse by Provider" className="relative z-10" scrollerClassName="pt-1 items-start lg:gap-5">
      {STREAMING_PROVIDERS.map((provider) => (
        <button
          key={provider.id}
          type="button"
          onClick={() => handleClick(provider)}
          aria-label={`Browse movies and shows on ${provider.name}`}
          className="group/tile flex-none flex flex-col items-center gap-2 w-[76px] lg:w-[88px] cursor-pointer focus:outline-none"
        >
          <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl overflow-hidden bg-white/5 ring-1 ring-white/10 shadow-lg shadow-black/40 transition-all duration-300 group-hover/tile:scale-105 group-hover/tile:ring-white/30 group-active/tile:scale-95">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={provider.logo}
              alt={provider.name}
              loading="lazy"
              className="w-full h-full object-cover pointer-events-none"
            />
          </div>
          <span className="text-[11px] lg:text-xs font-medium text-white/70 truncate text-center w-full transition-colors duration-200 group-hover/tile:text-white">
            {provider.name}
          </span>
        </button>
      ))}
    </ContentRow>
  );
}
