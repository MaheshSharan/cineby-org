import { useEffect, useState } from "react";

import type { WatchlistItem } from "@/lib/db/types";
import { clearAllWatchlist, listWatchlist, removeFromWatchlist } from "@/lib/api/watchlist";
import { getMediaHref } from "@/lib/utils/media";
import { useAuth } from "@/components/auth/AuthProvider";
import { MediaPosterCard } from "@/components/movie/MediaPosterCard";
import { PageSeo } from "@/components/seo/PageSeo";
import { SkeletonCardGrid } from "@/components/skeleton/SkeletonCard";
import { TrashIcon, XIcon } from "@/components/ui/icons";

export default function WatchlistPage() {
  const { user, isLoading, openAuthModal, showToast } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [isWatchlistLoading, setIsWatchlistLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setIsWatchlistLoading(false);
      return;
    }

    let isCurrent = true;
    setIsWatchlistLoading(true);

    listWatchlist()
      .then((result) => {
        if (isCurrent) {
          setItems(result);
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsWatchlistLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [user]);

  const handleRemoveItem = async (item: WatchlistItem) => {
    const success = await removeFromWatchlist(item.mediaType, item.mediaId);
    if (success) {
      setItems((prev) => prev.filter((i) => !(i.mediaType === item.mediaType && i.mediaId === item.mediaId)));
      showToast("Removed from watchlist successfully");
    }
  };

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      const success = await clearAllWatchlist();
      if (success) {
        setItems([]);
        setShowClearConfirm(false);
        showToast("Watchlist cleared successfully");
      }
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <>
      <PageSeo title="Watchlist - Cineby" noindex />

      <main className="page-shell max-w-[1360px] min-h-[calc(100vh-88px)] md:min-h-[calc(100vh-90px)] px-4 pb-16 pt-28 md:px-8 md:pt-36">
        {isLoading || (user && isWatchlistLoading) ? (
          <div className="py-4">
            <SkeletonCardGrid />
          </div>
        ) : !user ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/popcorn.svg"
              alt="Empty watchlist illustration"
              className="mb-4 h-36 w-36 select-none opacity-80 drop-shadow-2xl"
            />
            <h1 className="mb-1 text-xl font-semibold text-white md:text-2xl">Watchlist is empty</h1>
            <p className="mb-6 max-w-sm text-sm text-gray-400">
              Sign in to save and access your favorite movies and TV shows.
            </p>
            <button
              type="button"
              onClick={() => openAuthModal("login")}
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary/20 transition-all duration-200 hover:bg-primary/90 hover:scale-105"
            >
              Sign in
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/popcorn.svg"
              alt="Empty watchlist illustration"
              className="mb-4 h-36 w-36 select-none drop-shadow-2xl"
            />
            <h1 className="mb-1 text-xl font-semibold text-white">Watchlist is empty</h1>
            <p className="text-sm text-gray-400">
              It seems that you haven&apos;t added any movies to watchlist
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl font-bold text-white md:text-2xl">Watchlist</h1>
                <p className="mt-1 text-xs text-text-mid md:text-sm">
                  Save your favorite movies and TV shows to watch later
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="inline-flex items-center gap-2 self-start rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-text-mid backdrop-blur-md transition-all duration-200 hover:border-primary/40 hover:bg-primary/15 hover:text-primary sm:self-auto"
              >
                <TrashIcon size={14} />
                <span>Clear all watchlist</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-3">
              {items.map((item) => (
                <WatchlistCard
                  key={`${item.mediaType}-${item.mediaId}`}
                  item={item}
                  onRemove={handleRemoveItem}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {showClearConfirm ? (
        <>
          <div
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={() => setShowClearConfirm(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Clear all watchlist"
            className="glass-card-dark fixed left-1/2 top-1/2 z-[200] w-[90%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 p-6 shadow-2xl backdrop-blur-xl"
          >
            <h3 className="text-lg font-semibold text-white">Clear Watchlist</h3>
            <p className="mt-2 text-sm text-gray-400">
              Are you sure that want to clear all watchlist?
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={isClearing}
                onClick={handleClearAll}
                className="flex-1 rounded-xl bg-primary py-2.5 px-4 text-sm font-medium text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
                {isClearing ? "Clearing…" : "Clear all"}
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="glass-card-subtle flex-1 rounded-xl border border-gray-400/20 py-2.5 px-4 text-sm font-medium text-gray-300 transition-colors hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

interface WatchlistCardProps {
  item: WatchlistItem;
  onRemove: (item: WatchlistItem) => void;
}

function WatchlistCard({ item, onRemove }: WatchlistCardProps) {
  const href = getMediaHref(item.mediaType, item.mediaId, item.title);
  const typeLabel = item.mediaType === "tv" ? "TV Show" : "Movie";

  return (
    <MediaPosterCard
      title={item.title}
      posterPath={item.posterPath}
      href={href}
      mediaType={item.mediaType}
      mediaId={item.mediaId}
      subtitle={typeLabel}
      actions={
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(item);
          }}
          title="Remove from watchlist"
          aria-label={`Remove ${item.title} from watchlist`}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white/70 backdrop-blur-md transition-colors duration-200 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          <XIcon size={16} />
        </button>
      }
    />
  );
}
