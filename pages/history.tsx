import type { NextPage } from "next";
import Head from "next/head";
import { useEffect, useState } from "react";

import type { HistoryEntry } from "@/lib/db/types";
import { clearAllHistory, listHistory, removeFromHistory } from "@/lib/api/history";
import { addToWatchlist } from "@/lib/api/watchlist";
import { getEpisodeHref, getPlayHref } from "@/lib/utils/media";
import { useAuth } from "@/components/auth/AuthProvider";
import { MediaPosterCard } from "@/components/movie/MediaPosterCard";
import { BookmarkIcon, TrashIcon, XIcon } from "@/components/ui/icons";

const HistoryPage: NextPage = () => {
  const { user, isLoading, openAuthModal, showToast } = useAuth();
  const [items, setItems] = useState<HistoryEntry[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    const load = () => {
      listHistory(Boolean(user)).then((result) => {
        if (isCurrent) {
          setItems(result);
        }
      });
    };

    load();

    const handleHistoryChange = () => {
      load();
    };

    window.addEventListener("cineby:history-change", handleHistoryChange);
    window.addEventListener("cineby:profile-change", handleHistoryChange);

    return () => {
      isCurrent = false;
      window.removeEventListener("cineby:history-change", handleHistoryChange);
      window.removeEventListener("cineby:profile-change", handleHistoryChange);
    };
  }, [user]);

  const handleRemoveItem = async (entry: HistoryEntry) => {
    const success = await removeFromHistory(entry.id, Boolean(user));
    if (success) {
      setItems((prev) => prev.filter((i) => i.id !== entry.id));
      showToast("Removed from history successfully");
    }
  };

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      const success = await clearAllHistory(Boolean(user));
      if (success) {
        setItems([]);
        setShowClearConfirm(false);
        showToast("History cleared successfully");
      }
    } finally {
      setIsClearing(false);
    }
  };

  const handleAddToWatchlist = async (entry: HistoryEntry) => {
    if (!user) {
      openAuthModal("login");
      return;
    }

    const success = await addToWatchlist({
      mediaType: entry.mediaType,
      mediaId: entry.mediaId,
      title: entry.title,
      posterPath: entry.posterPath,
      backdropPath: entry.backdropPath,
    });

    if (success) {
      showToast("Added to watchlist");
    }
  };

  return (
    <>
      <Head>
        <title>History - Cineby</title>
        <meta name="description" content="Keep track of all the movies and TV shows you've watched." />
      </Head>

      <main className="mx-auto max-w-[1360px] min-h-[calc(100vh-88px)] md:min-h-[calc(100vh-90px)] px-4 pb-16 pt-28 md:px-8 md:pt-36">
        {isLoading ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/popcorn.svg"
              alt=""
              aria-hidden="true"
              className="mb-4 h-36 w-36 select-none opacity-80 drop-shadow-2xl"
            />
            <h1 className="mb-1 text-xl font-semibold text-white md:text-2xl">No watch history found</h1>
            <p className="mb-6 max-w-sm text-sm text-gray-400">
              {user
                ? "Keep track of all the movies and TV shows you've watched."
                : "Watch movies and shows or sign in to sync your progress across devices."}
            </p>
            {!user ? (
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary/20 transition-all duration-200 hover:bg-primary/90 hover:scale-105"
              >
                Sign in
              </button>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl font-bold text-white md:text-2xl">Watch history</h1>
                <p className="mt-1 text-xs text-text-mid md:text-sm">
                  {user
                    ? "Keep track of all the movies and TV shows you've watched"
                    : "Saved on this device. Sign in to sync across all your devices."}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {!user ? (
                  <button
                    type="button"
                    onClick={() => openAuthModal("login")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-primary/25 transition-all duration-200 hover:bg-primary/90 hover:scale-[1.02] active:scale-95 cursor-pointer"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="shrink-0"
                    >
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                      <path d="M16 21h5v-5" />
                    </svg>
                    <span>Sign in to sync</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="inline-flex items-center gap-2 self-start rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-text-mid backdrop-blur-md transition-all duration-200 hover:border-primary/40 hover:bg-primary/15 hover:text-primary sm:self-auto"
                >
                  <TrashIcon size={14} />
                  <span>Clear all history</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-3">
              {items.map((entry) => (
                <HistoryCard
                  key={entry.id}
                  entry={entry}
                  onRemove={handleRemoveItem}
                  onAddToWatchlist={handleAddToWatchlist}
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
            aria-label="Clear all history"
            className="glass-card-dark fixed left-1/2 top-1/2 z-[200] w-[90%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 p-6 shadow-2xl backdrop-blur-xl"
          >
            <h3 className="text-lg font-semibold text-white">Clear History</h3>
            <p className="mt-2 text-sm text-gray-400">
              Are you sure that want to clear all history?
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
};

interface HistoryCardProps {
  entry: HistoryEntry;
  onRemove: (entry: HistoryEntry) => void;
  onAddToWatchlist: (entry: HistoryEntry) => void;
}

function HistoryCard({ entry, onRemove, onAddToWatchlist }: HistoryCardProps) {
  const playHref =
    entry.mediaType === "tv" && entry.seasonNumber && entry.episodeNumber
      ? getEpisodeHref(entry.mediaId, entry.seasonNumber, entry.episodeNumber)
      : getPlayHref(entry.mediaType, entry.mediaId);

  const subtitle =
    entry.mediaType === "tv"
      ? `S:${entry.seasonNumber ?? 1} E:${entry.episodeNumber ?? 1}`
      : "Movie";

  return (
    <MediaPosterCard
      title={entry.title}
      posterPath={entry.posterPath}
      href={playHref}
      subtitle={subtitle}
      progress={entry.progress}
      duration={entry.duration}
      actions={
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddToWatchlist(entry);
            }}
            title="Add to watchlist"
            aria-label={`Add ${entry.title} to watchlist`}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white/70 backdrop-blur-md transition-colors duration-200 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <BookmarkIcon size={15} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove(entry);
            }}
            title="Remove from history"
            aria-label={`Remove ${entry.title} from history`}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white/70 backdrop-blur-md transition-colors duration-200 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <XIcon size={16} />
          </button>
        </div>
      }
    />
  );
}

export default HistoryPage;
