import Link from "next/link";
import { useEffect, useState } from "react";

import type { HistoryEntry } from "@/lib/db/types";
import { listHistory, removeFromHistory } from "@/lib/api/history";
import { calculateResumeSeconds, getEpisodeHref, getPlayHref } from "@/lib/utils/media";
import { getPosterResponsiveUrls } from "@/lib/tmdb/image";
import { useAuth } from "@/components/auth/AuthProvider";
import { ContentRow } from "@/components/content/ContentRow";
import { XIcon } from "@/components/ui/icons";

export function ContinueWatchingRow() {
  const { user } = useAuth();
  const [items, setItems] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }

    let isCurrent = true;

    const loadHistory = () => {
      listHistory().then((data) => {
        if (!isCurrent) return;
        // Filter: only show items with meaningful in-progress content (progress > 0 and progress < 95)
        const inProgress = data.filter(
          (item) => item.progress !== null && item.progress > 0 && item.progress < 95
        );
        setItems(inProgress);
      });
    };

    loadHistory();

    const handleProfileChange = () => {
      loadHistory();
    };

    window.addEventListener("cineby:profile-change", handleProfileChange);
    window.addEventListener("storage", handleProfileChange);

    return () => {
      isCurrent = false;
      window.removeEventListener("cineby:profile-change", handleProfileChange);
      window.removeEventListener("storage", handleProfileChange);
    };
  }, [user]);

  const handleRemove = async (entry: HistoryEntry) => {
    const success = await removeFromHistory(entry.id);
    if (success) {
      setItems((prev) => prev.filter((i) => i.id !== entry.id));
    }
  };

  if (!user || items.length === 0) {
    return null;
  }

  return (
    <ContentRow title="Continue watching">
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
  const poster = getPosterResponsiveUrls(entry.posterPath);

  // Use exact progress seconds if available; otherwise calculate from progress % and duration
  const resumeSeconds =
    entry.progressSeconds && entry.progressSeconds > 0
      ? entry.progressSeconds
      : calculateResumeSeconds(entry.progress, entry.duration);

  const playHref =
    entry.mediaType === "tv" && entry.seasonNumber && entry.episodeNumber
      ? getEpisodeHref(entry.mediaId, entry.seasonNumber, entry.episodeNumber, resumeSeconds)
      : getPlayHref(entry.mediaType, entry.mediaId, resumeSeconds);

  const subtitle =
    entry.mediaType === "tv"
      ? `S:${entry.seasonNumber ?? 1} E:${entry.episodeNumber ?? 1}`
      : "Movie";

  return (
    <div className="group relative w-[140px] xs:w-[150px] flex-shrink-0 md:w-[180px] lg:w-[200px] snap-start">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove(entry);
        }}
        title="Remove from history"
        aria-label={`Remove ${entry.title} from history`}
        className="absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white/70 backdrop-blur-md transition-colors duration-normal hover:text-red-400 md:invisible md:opacity-0 md:group-hover:visible md:group-hover:opacity-100 focus-visible:visible focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        <XIcon size={14} />
      </button>

      <Link
        href={playHref}
        aria-label={`Resume ${entry.title}${entry.progress ? ` at ${entry.progress}%` : ""}`}
        className="flex flex-col rounded-[10px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-neo-bg"
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[10px] border border-white/10 bg-surface-1 transition-all duration-normal ease-out group-hover:border-white/20">
          <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#05070a]/[0.92] via-[#05070a]/30 to-transparent opacity-0 transition-opacity duration-normal group-hover:opacity-100" />
          {poster.mobile ? (
            <picture>
              {poster.desktop ? (
                <source media="(min-width: 768px)" srcSet={poster.desktop} />
              ) : null}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={poster.mobile}
                alt={entry.title}
                loading="lazy"
                decoding="async"
                className="aspect-[2/3] h-full w-full object-cover object-top transition-transform duration-normal ease-out group-hover:scale-[1.03]"
              />
            </picture>
          ) : (
            <div className="flex aspect-[2/3] h-full w-full items-center justify-center p-3 text-center text-[11px] font-medium text-text-mid">
              {entry.title}
            </div>
          )}

          {entry.progress ? (
            <div className="absolute bottom-0 left-0 z-[6] h-[3px] w-full bg-[#05070a]/60">
              <div
                className="h-full bg-gradient-to-r from-primary to-[#ff5252] shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                style={{ width: `${Math.min(100, Math.max(0, entry.progress))}%` }}
              />
            </div>
          ) : null}

          {entry.duration ? (
            <div className="absolute bottom-2 right-2 z-[6] flex items-center gap-1 rounded-md border border-white/10 bg-[#05070a]/75 px-2 py-1 text-[11px] font-medium text-[#eef1f6] backdrop-blur-md">
              <span>{entry.duration}</span>
            </div>
          ) : null}
        </div>

        <div className="mt-2.5 px-0.5">
          <h3 className="line-clamp-1 text-[13px] font-medium leading-snug text-text-hi transition-colors duration-200 group-hover:text-primary">
            {entry.title}
          </h3>
          <div className="mt-1 flex items-center gap-1.5 truncate text-[11px] leading-none text-text-mid">
            <span>{subtitle}</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
