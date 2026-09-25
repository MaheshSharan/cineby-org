import { useCallback, useEffect, useRef, useState } from "react";

import type { MediaSummary } from "@/lib/tmdb";
import { deduplicateMediaPool } from "@/lib/tmdb/deduplicate";
import { ContentRow } from "@/components/content/ContentRow";
import { MovieCard } from "@/components/movie/MovieCard";
import { useInView } from "@/hooks/useInView";
import { STREAMING_PROVIDERS, type StreamingProvider } from "@/lib/constants/providers";

interface OnlyOnRowProps {
  initialItems?: MediaSummary[];
  activeProviderId?: number;
  excludeMediaKeys?: string[];
  onProviderChange?: (providerId: number) => void;
}

export function OnlyOnRow({
  initialItems = [],
  activeProviderId,
  excludeMediaKeys = [],
  onProviderChange,
}: OnlyOnRowProps) {
  const [selectedProvider, setSelectedProvider] = useState<StreamingProvider>(
    STREAMING_PROVIDERS.find((p) => p.id === activeProviderId) ?? STREAMING_PROVIDERS[0]
  );
  const [isOpen, setIsOpen] = useState(false);
  const { ref: inViewRef, isInView } = useInView();
  const [items, setItems] = useState<MediaSummary[]>(initialItems);
  const [isLoading, setIsLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const attemptedProviderRef = useRef<number | null>(initialItems.length > 0 ? (activeProviderId ?? 8) : null);

  const fetchProviderItems = useCallback(
    async (providerId: number) => {
      if (providerId === 8 && initialItems.length > 0) {
        setItems(initialItems);
        return;
      }

      setIsLoading(true);

      try {
        const res = await fetch(`/api/discover/provider?providerId=${providerId}`);
        if (res.ok) {
          const data = (await res.json()) as { results: MediaSummary[] };
          const seen = new Set<string>(excludeMediaKeys);
          const uniqueItems = deduplicateMediaPool(data.results || [], seen, 20);
          setItems(uniqueItems);
        }
      } catch {
        // Keep existing items on failure
      } finally {
        setIsLoading(false);
      }
    },
    [excludeMediaKeys, initialItems]
  );

  // Sync external provider selection from BrowseByProviderRow
  useEffect(() => {
    if (!activeProviderId) return;
    const match = STREAMING_PROVIDERS.find((p) => p.id === activeProviderId);
    if (match && match.id !== selectedProvider.id) {
      setSelectedProvider(match);
      attemptedProviderRef.current = match.id;
      void fetchProviderItems(match.id);
    }
  }, [activeProviderId, fetchProviderItems, selectedProvider.id]);

  // Lazy load provider items when row enters viewport if items are not yet populated
  useEffect(() => {
    if (isInView && items.length === 0 && attemptedProviderRef.current !== selectedProvider.id) {
      attemptedProviderRef.current = selectedProvider.id;
      void fetchProviderItems(selectedProvider.id);
    }
  }, [isInView, items.length, selectedProvider.id, fetchProviderItems]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectProvider = useCallback(
    (provider: StreamingProvider) => {
      setSelectedProvider(provider);
      setIsOpen(false);
      onProviderChange?.(provider.id);
      attemptedProviderRef.current = provider.id;
      void fetchProviderItems(provider.id);
    },
    [fetchProviderItems, onProviderChange]
  );

  const customTitle = (
    <div className="flex items-baseline gap-2 flex-wrap" ref={containerRef}>
      <span>Only on</span>
      <div className="relative inline-block select-none align-baseline">
        <button
          type="button"
          aria-label="Select streaming provider"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
          className="group inline-flex items-center gap-2 text-inherit font-inherit cursor-pointer hover:opacity-90 transition-opacity focus:outline-none"
        >
          <span className="w-6 h-6 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex-shrink-0 inline-flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedProvider.logo}
              alt=""
              className="w-full h-full object-cover"
            />
          </span>
          <span className="border-b-2 border-primary pb-0.5">{selectedProvider.name}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`lucide lucide-chevron-down flex-shrink-0 self-center -ml-0.5 transition-transform duration-200 text-primary ${
              isOpen ? "rotate-180" : ""
            }`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {isOpen ? (
          <div
            role="listbox"
            aria-label="Select streaming provider"
            className="absolute left-0 top-full mt-2 z-[9999] min-w-[15rem] rounded-2xl shadow-2xl bg-[#12151c]/95 backdrop-blur-xl border border-white/10 flex flex-col overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100"
          >
            <ul className="no-scrollbar py-1.5 overflow-y-auto max-h-72 divide-y divide-white/[0.04]">
              {STREAMING_PROVIDERS.map((provider) => {
                const isSelected = provider.id === selectedProvider.id;

                return (
                  <li key={provider.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelectProvider(provider)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-[13.5px] transition-colors ${
                        isSelected
                          ? "text-primary font-semibold bg-white/[0.06]"
                          : "text-white/85 hover:bg-white/[0.04] hover:text-white"
                      }`}
                    >
                      <span className="flex-shrink-0 w-7 h-7 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={provider.logo}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </span>
                      <span className="flex-1 truncate">{provider.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );

  const displayItems = Array.isArray(items) ? items : (Array.isArray(initialItems) ? initialItems : []);

  return (
    <div id="only-on-section" className="scroll-mt-24" ref={inViewRef}>
      <ContentRow
        title={customTitle}
        className={isLoading && displayItems.length > 0 ? "opacity-50 transition-opacity duration-200" : "transition-opacity duration-200"}
      >
        {isLoading && displayItems.length === 0
          ? Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="aspect-[2/3] w-[140px] xs:w-[150px] md:w-[180px] lg:w-[200px] flex-shrink-0 animate-pulse rounded-xl bg-white/5"
              />
            ))
          : displayItems.map((item) => (
              <MovieCard key={`${item.mediaType || "movie"}-${item.id}`} media={item} variant="catalog" />
            ))}
      </ContentRow>
    </div>
  );
}
