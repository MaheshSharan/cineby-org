import { useCallback } from "react";

export interface ProviderItem {
  id: number;
  name: string;
  logo: string;
}

export const PROVIDERS_LIST: ProviderItem[] = [
  { id: 8, name: "Netflix", logo: "/assets/providers/netflix.png" },
  { id: 9, name: "Prime Video", logo: "/assets/providers/prime.png" },
  { id: 337, name: "Disney+", logo: "/assets/providers/disney.png" },
  { id: 350, name: "Apple TV+", logo: "/assets/providers/apple.png" },
  { id: 1899, name: "HBO Max", logo: "/assets/providers/max.png" },
  { id: 15, name: "Hulu", logo: "/assets/providers/hulu.png" },
  { id: 531, name: "Paramount+", logo: "/assets/providers/paramount.png" },
  { id: 386, name: "Peacock", logo: "/assets/providers/peacock.png" },
  { id: 283, name: "Crunchyroll", logo: "/assets/providers/crunchyroll.png" },
  { id: 43, name: "Starz", logo: "/assets/providers/starz.png" },
  { id: 526, name: "AMC+", logo: "/assets/providers/amc.png" },
  { id: 34, name: "MGM+", logo: "/assets/providers/mgm.png" },
  { id: 188, name: "YouTube Premium", logo: "/assets/providers/youtube_premium.png" },
  { id: 73, name: "Tubi", logo: "/assets/providers/tubi.png" },
  { id: 300, name: "Pluto TV", logo: "/assets/providers/pluto.png" },
];

interface BrowseByProviderRowProps {
  onSelectProvider?: (providerId: number) => void;
}

export function BrowseByProviderRow({ onSelectProvider }: BrowseByProviderRowProps) {
  const handleClick = useCallback(
    (provider: ProviderItem) => {
      onSelectProvider?.(provider.id);

      // Scroll smoothly to the Only On section
      const target = document.getElementById("only-on-section");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
    [onSelectProvider]
  );

  return (
    <div className="space-y-4 relative z-10 group/row">
      <div className="flex items-center justify-between">
        <h2 className="heading-trail text-xl font-semibold text-text-hi md:text-2xl">
          Browse by Provider
        </h2>
      </div>

      <div className="no-scrollbar flex gap-4 lg:gap-5 overflow-x-auto overflow-y-visible pb-2 pt-1 items-start">
        {PROVIDERS_LIST.map((provider) => (
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
      </div>
    </div>
  );
}
