import Link from "next/link";
import type { ReactNode } from "react";

import { getPosterResponsiveUrls } from "@/lib/tmdb/image";
import { useSettings } from "@/hooks/useSettings";
import { useDetailModal } from "@/components/detail/DetailModalContext";

import { PlayIcon, StarIcon } from "@/components/ui/icons";

interface MediaPosterCardProps {
  title: string;
  posterPath: string | null;
  href: string;
  mediaType?: "movie" | "tv";
  mediaId?: number;
  onClick?: (e: React.MouseEvent) => void;
  rating?: number;
  year?: string;
  progress?: number | null;
  actions?: ReactNode;
  rank?: number;
  className?: string;
}

export function MediaPosterCard({
  title,
  posterPath,
  href,
  mediaType,
  mediaId,
  onClick,
  rating,
  year,
  progress,
  actions,
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

  const poster = getPosterResponsiveUrls(posterPath);
  const progressValue = progress == null ? 0 : Math.min(100, Math.max(0, progress));

  return (
    <div className={`group/card relative flex min-w-0 flex-col transition-transform duration-500 ease-out hover:scale-105 hover:z-30 origin-center cursor-pointer ${className}`}>
      {actions ? <div className="absolute right-2 top-2 z-20">{actions}</div> : null}

      <Link
        href={href}
        onClick={handleDetailClick}
        className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neo-bg"
      >
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-white/5 shadow-xl shadow-black/40 isolate">
          {poster.mobile ? (
            <picture>
              {poster.desktop ? <source media="(min-width: 768px)" srcSet={poster.desktop} /> : null}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={poster.mobile}
                alt={rank ? "" : `${title} - Cineby`}
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
            // Not hidden from assistive technology: the link's name starts with this "Top 02" text, so the
            // spoken name contains the visible label as WCAG 2.5.3 requires.
            <div
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
