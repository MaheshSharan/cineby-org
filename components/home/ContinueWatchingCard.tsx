import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { HistoryEntry } from "@/lib/db/types";
import { getBackdropResponsiveUrls, getPosterResponsiveUrls } from "@/lib/tmdb/image";
import { calculateResumeSeconds, formatTimeLeft, getEpisodeHref, getMediaHref, getPlayHref } from "@/lib/utils/media";
import { useSettings } from "@/hooks/useSettings";
import { useDetailModal } from "@/components/detail/DetailModalContext";
import { PlayButton } from "@/components/ui/PlayButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { ChevronDownIcon, InfoIcon, MoreVerticalIcon, TrashIcon, XIcon } from "@/components/ui/icons";

const POPUP_SCALE = 1.3;
const POPUP_OPEN_DELAY_MS = 250;
const VIEWPORT_MARGIN_PX = 8;
// Stays inside the gap under the "Continue watching" heading, so the popup never covers it.
const POPUP_RISE_PX = 10;

const ROUND_BUTTON_CLASS =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer";
const OUTLINE_BUTTON_CLASS =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/40 text-white transition-colors hover:border-white hover:bg-white/10 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer";

interface CardViewProps {
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  titleBackdropPath: string | null;
  playHref: string;
  infoHref: string;
  subtitle?: string;
  timeLeft: string;
  progress: number;
  onInfoClick: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  onRemove: () => void;
}

interface ContinueWatchingCardProps {
  entry: HistoryEntry;
  onRemove: (entry: HistoryEntry) => void;
}

export function ContinueWatchingCard({ entry, onRemove }: ContinueWatchingCardProps) {
  const { settings } = useSettings();
  const { openDetailModal } = useDetailModal();

  // Use exact progress seconds if available; otherwise calculate from progress % and duration
  const resumeSeconds =
    entry.progressSeconds && entry.progressSeconds > 0
      ? entry.progressSeconds
      : calculateResumeSeconds(entry.progress, entry.duration);

  const isEpisode = entry.mediaType === "tv" && Boolean(entry.seasonNumber && entry.episodeNumber);
  const playHref = isEpisode
    ? getEpisodeHref(entry.mediaId, entry.seasonNumber ?? 1, entry.episodeNumber ?? 1, resumeSeconds, entry.title)
    : getPlayHref(entry.mediaType, entry.mediaId, resumeSeconds, entry.title);

  const handleInfoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const isPlainClick = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
    if (settings.appearance.detailViewType !== "modal" || !isPlainClick) return;

    event.preventDefault();
    openDetailModal({ mediaType: entry.mediaType, id: entry.mediaId });
  };

  const view: CardViewProps = {
    title: entry.title,
    posterPath: entry.posterPath,
    backdropPath: entry.backdropPath,
    titleBackdropPath: entry.titleBackdropPath ?? null,
    playHref,
    infoHref: getMediaHref(entry.mediaType, entry.mediaId, entry.title),
    subtitle: isEpisode ? `S${entry.seasonNumber}:E${entry.episodeNumber}` : undefined,
    timeLeft: formatTimeLeft(entry.progress, entry.duration, resumeSeconds) || "In progress",
    progress: Math.min(100, Math.max(0, entry.progress ?? 0)),
    onInfoClick: handleInfoClick,
    onRemove: () => onRemove(entry),
  };

  // Touch screens get the portrait card; desktops get the wide card that grows on hover.
  return (
    <div className="flex-none snap-start">
      <PortraitCard {...view} />
      <HoverCard {...view} />
    </div>
  );
}

function PortraitCard(view: CardViewProps) {
  const art = view.posterPath ? getPosterResponsiveUrls(view.posterPath) : getBackdropResponsiveUrls(view.backdropPath);

  return (
    <div className="w-[42vw] max-w-44 rounded-2xl bg-surface-2 shadow-lg shadow-black/40 sm:w-44 lg:hidden">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-t-2xl bg-white/5">
        <Link href={view.playHref} tabIndex={-1} aria-hidden="true" className="absolute inset-0 block">
          {art.mobile ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={art.mobile} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center p-3 text-center text-xs font-medium text-white/60">
              {view.title}
            </span>
          )}
        </Link>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <PlayButton
            href={view.playHref}
            iconOnly
            size="iconLg"
            aria-label={`Resume ${view.title}`}
            className="pointer-events-auto"
          />
        </div>

        {view.subtitle ? (
          <p className="pointer-events-none absolute inset-x-0 bottom-3 bg-gradient-to-t from-black/70 to-transparent pb-1 pt-6 text-center text-sm font-semibold text-white">
            {view.subtitle}
          </p>
        ) : null}
        <ProgressBar value={view.progress} className="absolute inset-x-0 bottom-0" />
      </div>

      <div className="px-3 pt-2">
        <p className="truncate text-sm font-medium text-white/90" title={view.title}>
          {view.title}
        </p>
        <p className="mt-0.5 text-xs text-white/50">{view.timeLeft}</p>
      </div>

      <div className="flex items-center justify-between px-1.5 pb-1.5 pt-0.5">
        <Link href={view.infoHref} onClick={view.onInfoClick} aria-label={`More info for ${view.title}`} className={ROUND_BUTTON_CLASS}>
          <InfoIcon size={24} />
        </Link>
        <RemoveMenu title={view.title} onRemove={view.onRemove} />
      </div>
    </div>
  );
}

function HoverCard(view: CardViewProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const openPopup = (delayMs: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const rect = cardRef.current?.getBoundingClientRect();
      if (rect) setAnchor(rect);
    }, delayMs);
  };

  // The popup is fixed-position, so it floats over the page and never changes the row's size.
  const closePopup = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setAnchor(null);
    setIsExpanded(false);
  }, []);

  useEffect(() => {
    if (!anchor) return;

    // Start at the card's size, then grow on the next frame so the transition runs.
    const frame = requestAnimationFrame(() => setIsExpanded(true));
    window.addEventListener("scroll", closePopup, true);
    window.addEventListener("resize", closePopup);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", closePopup, true);
      window.removeEventListener("resize", closePopup);
    };
  }, [anchor, closePopup]);

  useEffect(() => closePopup, [closePopup]);

  // One image size is enough for these cards, so the large desktop sources are not downloaded.
  const backdropUrl = getBackdropResponsiveUrls(view.backdropPath ?? view.posterPath).mobile;
  const titleBackdropUrl = getBackdropResponsiveUrls(view.titleBackdropPath).mobile;

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => {
        // Start downloading the popup image now, so it is usually cached by the time the popup opens.
        if (titleBackdropUrl) new Image().src = titleBackdropUrl;
        openPopup(POPUP_OPEN_DELAY_MS);
      }}
      onMouseLeave={closePopup}
      onFocus={(event) => {
        if (event.target.matches(":focus-visible")) openPopup(0);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) closePopup();
      }}
      className="relative hidden w-72 lg:block"
    >
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-surface-2 shadow-lg shadow-black/40">
        <Link href={view.playHref} tabIndex={-1} aria-hidden="true" className="absolute inset-0 block">
          <CardArt url={backdropUrl} title={view.title} />
        </Link>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <PlayButton
            href={view.playHref}
            iconOnly
            size="iconLg"
            aria-label={`Resume ${view.title}`}
            className="pointer-events-auto"
          />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pb-6 pt-12">
          <p className="truncate text-sm font-semibold text-white">{view.title}</p>
          <p className="mt-0.5 truncate text-xs text-white/70">{getSubtitleAndTimeLeft(view)}</p>
        </div>
        <ProgressBar value={view.progress} className="absolute inset-x-4 bottom-3 rounded-full" />
      </div>

      {anchor ? (
        <div
          style={getPopupStyle(anchor)}
          className={`fixed z-50 overflow-hidden rounded-xl bg-surface-2 shadow-2xl shadow-black/70 transition-[opacity,transform] duration-200 ease-out ${
            isExpanded ? "scale-100 opacity-100" : "scale-[0.77] opacity-0"
          }`}
        >
          <div className="relative aspect-video bg-white/5">
            <Link href={view.playHref} tabIndex={-1} aria-hidden="true" className="absolute inset-0 block">
              <CardArt url={titleBackdropUrl ?? backdropUrl} title={view.title} loading="eager" />
            </Link>
            {titleBackdropUrl ? null : (
              <p className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/85 to-transparent px-4 pb-4 pt-10 text-lg font-bold text-white">
                {view.title}
              </p>
            )}
            <ProgressBar value={view.progress} className="absolute inset-x-0 bottom-0" />
          </div>

          <div className="flex items-center gap-2 px-3 py-2.5">
            <PlayButton href={view.playHref} iconOnly size="iconSm" aria-label={`Resume ${view.title}`} />
            <button
              type="button"
              onClick={view.onRemove}
              aria-label={`Remove ${view.title} from history`}
              title="Remove from history"
              className={OUTLINE_BUTTON_CLASS}
            >
              <XIcon size={16} />
            </button>
            <div className="min-w-0 flex-1 px-1">
              <p className="truncate text-sm font-semibold text-white" title={view.title}>
                {view.title}
              </p>
              <p className="truncate text-xs text-white/60">{getSubtitleAndTimeLeft(view)}</p>
            </div>
            <Link
              href={view.infoHref}
              onClick={view.onInfoClick}
              aria-label={`More info for ${view.title}`}
              title="More info"
              className={OUTLINE_BUTTON_CLASS}
            >
              <ChevronDownIcon size={16} />
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function getSubtitleAndTimeLeft(view: CardViewProps): string {
  return view.subtitle ? `${view.subtitle} · ${view.timeLeft}` : view.timeLeft;
}

function getPopupStyle(anchor: DOMRect): React.CSSProperties {
  const width = anchor.width * POPUP_SCALE;
  const maxLeft = window.innerWidth - width - VIEWPORT_MARGIN_PX;
  const left = Math.min(Math.max(anchor.left - (width - anchor.width) / 2, VIEWPORT_MARGIN_PX), maxLeft);

  return { top: anchor.top - POPUP_RISE_PX, left, width };
}

function CardArt({ url, title, loading = "lazy" }: { url: string | null; title: string; loading?: "lazy" | "eager" }) {
  const [isLoaded, setIsLoaded] = useState(false);

  if (!url) {
    return (
      <span className="flex h-full w-full items-center justify-center p-3 text-center text-xs font-medium text-white/60">
        {title}
      </span>
    );
  }

  return (
    <>
      {isLoaded ? null : <Skeleton className="absolute inset-0 rounded-none" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        loading={loading}
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        className={`h-full w-full object-cover transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`}
      />
    </>
  );
}

function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div
      role="progressbar"
      aria-label="Watched"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      className={`h-1 overflow-hidden bg-white/25 ${className}`}
    >
      <div className="h-full bg-primary" style={{ width: `${value}%` }} />
    </div>
  );
}

function RemoveMenu({ title, onRemove }: { title: string; onRemove: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label={`More options for ${title}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className={ROUND_BUTTON_CLASS}
      >
        <MoreVerticalIcon size={24} />
      </button>

      {isOpen ? (
        <div role="menu" className="absolute bottom-full right-0 z-40 mb-1 min-w-48 rounded-xl border border-white/10 bg-[#05070a]/95 p-1 shadow-2xl backdrop-blur-xl">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onRemove();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-white transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <TrashIcon size={16} />
            Remove from history
          </button>
        </div>
      ) : null}
    </div>
  );
}
