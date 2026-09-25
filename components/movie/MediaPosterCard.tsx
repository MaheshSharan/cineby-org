import Link from "next/link";
import type { ReactNode } from "react";

import { getBackdropResponsiveUrls, getPosterResponsiveUrls } from "@/lib/tmdb/image";
import { useSettings } from "@/hooks/useSettings";
import { useDetailModal } from "@/components/detail/DetailModalContext";

import { ClockIcon, PlayIcon, StarIcon } from "@/components/ui/icons";

type MediaPosterCardMode = "poster" | "continue";

interface MediaPosterCardProps {
  title: string;
  posterPath: string | null;
  backdropPath?: string | null;
  href: string;
  mediaType?: "movie" | "tv";
  mediaId?: number;
  onClick?: (e: React.MouseEvent) => void;
  subtitle?: ReactNode;
  rating?: number;
  year?: string;
  typeLabel?: string;
  progress?: number | null;
  duration?: string | null;
  infoHref?: string;
  actions?: ReactNode;
  mode?: MediaPosterCardMode;
  rank?: number;
  className?: string;
}

export function MediaPosterCard({
  title,
  posterPath,
  backdropPath,
  href,
  mediaType,
  mediaId,
  onClick,
  subtitle,
  rating,
  year,
  progress,
  duration,
  infoHref,
  actions,
  mode = "poster",
  rank,
  className = "",
}: MediaPosterCardProps) {
  const { settings } = useSettings();
  const { openDetailModal } = useDetailModal();
  const isModalDetail = settings.appearance.detailViewType === "modal";

  const handleDetailClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick(e);
      if (e.defaultPrevented) return;
    }
    if (isModalDetail && mediaType && mediaId) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      e.preventDefault();
      openDetailModal({ mediaType, id: mediaId });
    }
  };

  const isContinue = mode === "continue";
  const poster = getPosterResponsiveUrls(posterPath);
  const backdrop = getBackdropResponsiveUrls(backdropPath ?? posterPath);
  const progressValue = progress == null ? 0 : Math.min(100, Math.max(0, progress));

  if (isContinue) {
    return (
      <div className={`group relative w-60 md:w-72 flex-none snap-start transition-all duration-300 ease-out group-hover:z-30 ${className}`}>
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[#1a1a1a] shadow-lg shadow-black/40 transition-all duration-300 ease-out group-hover:scale-[1.06] group-hover:shadow-2xl group-hover:shadow-black/70 active:scale-95 cursor-pointer">
          <Link
            href={href}
            aria-label={`Resume ${title}`}
            className="absolute inset-0 z-10 block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-neo-bg"
          >
            {backdrop.mobile ? (
              <picture>
                {backdrop.desktop ? <source media="(min-width: 768px)" srcSet={backdrop.desktop} /> : null}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={backdrop.mobile}
                  alt={title}
                  loading="lazy"
                  decoding="async"
                  className="block h-full w-full object-cover"
                />
              </picture>
            ) : (
              <div
                className="flex h-full w-full items-center justify-center p-3 text-center text-xs font-medium text-white/60"
                style={{ background: "linear-gradient(to right, #262626 0%, #30302e 100%)" }}
              >
                {title}
              </div>
            )}

            {/* Cinejoy Progress bar */}
            {progress != null ? (
              <div className="absolute bottom-0 left-0 right-0 z-20 h-[3px] bg-white/20">
                <div
                  className="h-full bg-white rounded-r-full transition-all duration-300"
                  style={{ width: `${progressValue}%` }}
                />
              </div>
            ) : null}
          </Link>

          {/* Smooth hover gradient */}
          <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-black/90 via-black/35 to-transparent opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100" />

          {/* Cinejoy Bottom Action Buttons Row */}
          <div className="absolute inset-x-0 bottom-3 z-30 flex items-center gap-2.5 px-3 opacity-0 translate-y-2 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0">
            {/* Play button */}
            <Link
              href={href}
              aria-label={`Resume ${title}`}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#05070a] shadow-lg hover:bg-white/90 transition-all active:scale-95 shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <PlayIcon size={20} className="fill-[#05070a] text-[#05070a] ml-0.5" />
            </Link>

            {/* Action button (e.g. remove) */}
            {actions ? <div className="shrink-0">{actions}</div> : null}

            {/* Info button */}
            {infoHref ? (
              <Link
                href={infoHref}
                onClick={handleDetailClick}
                aria-label={`More info for ${title}`}
                title="More info"
                className="ml-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95 shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide-icon lucide lucide-info w-5 h-5" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
              </Link>
            ) : null}
          </div>
        </div>

        {/* Cinejoy Bottom text */}
        <div className="mt-2.5 px-0.5 transition-transform duration-300 ease-out group-hover:translate-y-1">
          <Link href={href} className="block focus:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded">
            <p className="text-sm font-medium text-white/90 truncate transition-colors duration-200 group-hover:text-white" title={title}>
              {title}
            </p>
          </Link>
          <p className="text-xs text-white/50 mt-0.5 flex items-center gap-1 overflow-hidden">
            {subtitle ? (
              <>
                <span className="truncate">{subtitle}</span>
                <span className="shrink-0">·</span>
              </>
            ) : null}
            <ClockIcon size={12} className="shrink-0 text-white/50" />
            <span className="shrink-0">{duration || "In progress"}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`group/card relative flex min-w-0 flex-col transition-transform duration-500 ease-out hover:scale-105 hover:z-30 origin-center cursor-pointer ${className}`}>
      {actions ? <div className="absolute right-2 top-2 z-20">{actions}</div> : null}

      <Link
        href={href}
        onClick={handleDetailClick}
        aria-label={title}
        className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neo-bg"
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-white/5 shadow-xl shadow-black/40 isolate">
          {poster.mobile ? (
            <picture>
              {poster.desktop ? <source media="(min-width: 768px)" srcSet={poster.desktop} /> : null}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={poster.mobile}
                alt={title}
                loading="lazy"
                decoding="async"
                className="block h-full w-full object-cover transition-all duration-300 lg:group-hover/card:brightness-50"
              />
            </picture>
          ) : (
            <div className="flex h-full w-full items-center justify-center p-3 text-center text-[11px] font-medium text-text-mid">
              {title}
            </div>
          )}

          {rank ? (
            <div
              aria-hidden="true"
              className="absolute left-0 top-0 z-[15] flex flex-col items-center justify-center overflow-hidden bg-primary font-bold text-white shadow-[0_4px_10px_var(--accent-glow)]"
              style={{
                width: "30px",
                height: "38px",
                padding: "5px 2px 7px",
                clipPath: "polygon(0px 0px, 100% 0px, 100% 100%, 50% 85%, 0px 100%)",
              }}
            >
              <span className="text-[9px] uppercase leading-tight tracking-wide">Top</span>
              <span className="-mt-0.5 text-[11px] tabular-nums leading-none">
                {String(rank).padStart(2, "0")}
              </span>
            </div>
          ) : null}

          {/* Card hover veil */}
          <div className="card-hover-veil pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 transition-opacity duration-500 lg:group-hover/card:opacity-100" />

          {/* Desktop Hover Overlay */}
          <div className="hidden lg:flex absolute inset-0 flex-col items-center justify-center p-4 transition-all duration-300 transform opacity-0 translate-y-4 group-hover/card:opacity-100 group-hover/card:translate-y-0">
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-black shadow-lg shadow-white/20 transition-transform group-hover/card:scale-110" aria-hidden="true">
              <PlayIcon size={20} className="fill-current text-black ml-0.5" />
            </span>
            <div className="w-full space-y-1 text-center">
              <h3 className="line-clamp-2 text-sm font-bold leading-tight text-white drop-shadow-md">
                {title}
              </h3>
              <div className="flex items-center justify-center gap-2 text-xs font-medium text-white/80">
                {year ? <span>{year}</span> : null}
                {rating != null && rating > 0 ? (
                  <span className="flex items-center gap-0.5">
                    <StarIcon size={12} className="fill-current text-white" />
                    <span>{rating.toFixed(1)}</span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {progress != null ? (
            <div className="absolute bottom-0 left-0 z-20 h-[3px] w-full bg-white/20">
              <div className="h-full bg-white rounded-r-full" style={{ width: `${progressValue}%` }} />
            </div>
          ) : null}
        </div>

        {/* Mobile Bottom Info */}
        <div className="mt-2 pb-1 space-y-1 lg:hidden">
          <h3 className="line-clamp-1 text-xs font-medium leading-tight text-white">
            {title}
          </h3>
          <div className="flex items-center gap-2 text-[10px] text-white/60">
            {rating != null && rating > 0 ? (
              <span className="flex items-center gap-0.5">
                <StarIcon size={10} className="fill-current text-white" />
                <span>{rating.toFixed(1)}</span>
              </span>
            ) : null}
            {year ? <span>{year}</span> : null}
          </div>
        </div>
      </Link>
    </div>
  );
}
