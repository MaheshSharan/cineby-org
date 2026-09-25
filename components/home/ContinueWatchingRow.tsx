import { useEffect, useState } from "react";

import type { HistoryEntry } from "@/lib/db/types";
import { listHistory, removeFromHistory } from "@/lib/api/history";
import { calculateResumeSeconds, formatTimeLeft, getEpisodeHref, getMediaHref, getPlayHref } from "@/lib/utils/media";
import { useAuth } from "@/components/auth/AuthProvider";
import { ContentRow } from "@/components/content/ContentRow";
import { MediaPosterCard } from "@/components/movie/MediaPosterCard";
import { XIcon } from "@/components/ui/icons";

export function ContinueWatchingRow() {
  const { user } = useAuth();
  const [items, setItems] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    let isCurrent = true;

    const loadHistory = () => {
      listHistory(Boolean(user)).then((data) => {
        if (!isCurrent) return;
        // Filter: only show items with meaningful in-progress content (progress > 0 and progress < 95)
        const inProgress = data.filter(
          (item) => item.progress !== null && item.progress > 0 && item.progress < 95
        );
        setItems(inProgress);
      });
    };

    loadHistory();

    const handleHistoryChange = () => {
      loadHistory();
    };

    window.addEventListener("cineby:profile-change", handleHistoryChange);
    window.addEventListener("cineby:history-change", handleHistoryChange);

    return () => {
      isCurrent = false;
      window.removeEventListener("cineby:profile-change", handleHistoryChange);
      window.removeEventListener("cineby:history-change", handleHistoryChange);
    };
  }, [user]);

  const handleRemove = async (entry: HistoryEntry) => {
    const success = await removeFromHistory(entry.id, Boolean(user));
    if (success) {
      setItems((prev) => prev.filter((i) => i.id !== entry.id));
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <ContentRow
      title="Continue watching"
      scrollerClassName="pt-3 pb-4 -my-3 px-3 -mx-3"
    >
      {items.map((item) => (
        <ContinueWatchingCard
          key={item.id}
          entry={item}
          onRemove={handleRemove}
        />
      ))}
    </ContentRow>
  );
}

interface ContinueWatchingCardProps {
  entry: HistoryEntry;
  onRemove: (entry: HistoryEntry) => void;
}

function ContinueWatchingCard({ entry, onRemove }: ContinueWatchingCardProps) {
  // Use exact progress seconds if available; otherwise calculate from progress % and duration
  const resumeSeconds =
    entry.progressSeconds && entry.progressSeconds > 0
      ? entry.progressSeconds
      : calculateResumeSeconds(entry.progress, entry.duration);

  const playHref =
    entry.mediaType === "tv" && entry.seasonNumber && entry.episodeNumber
      ? getEpisodeHref(entry.mediaId, entry.seasonNumber, entry.episodeNumber, resumeSeconds)
      : getPlayHref(entry.mediaType, entry.mediaId, resumeSeconds);

  const isTv = entry.mediaType === "tv";
  const subtitle =
    isTv && entry.seasonNumber && entry.episodeNumber
      ? `S${entry.seasonNumber}:E${entry.episodeNumber}`
      : undefined;

  const timeLeft = formatTimeLeft(entry.progress, entry.duration, resumeSeconds);

  return (
    <MediaPosterCard
      title={entry.title}
      posterPath={entry.posterPath}
      backdropPath={entry.backdropPath}
      href={playHref}
      infoHref={getMediaHref(entry.mediaType, entry.mediaId)}
      mediaType={entry.mediaType}
      mediaId={entry.mediaId}
      subtitle={subtitle}
      progress={entry.progress}
      duration={timeLeft || (entry.duration ? `${entry.duration} left` : null)}
      mode="continue"
      actions={
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(entry);
          }}
          title="Remove from history"
          aria-label={`Remove ${entry.title} from history`}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer shrink-0"
        >
          <XIcon size={20} className="w-5 h-5 text-white" />
        </button>
      }
    />
  );
}
