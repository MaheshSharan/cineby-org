import Link from "next/link";

import type { MediaSummary } from "@/lib/tmdb";
import { getBackdropResponsiveUrls } from "@/lib/tmdb/image";
import { getMediaHref, getMediaTypeLabel, getYear } from "@/lib/utils/media";
import { useSettings } from "@/hooks/useSettings";
import { useDetailModal } from "@/components/detail/DetailModalContext";

import { MediaPosterCard } from "@/components/movie/MediaPosterCard";
import { PlayIcon, StarIcon } from "@/components/ui/icons";

type CardVariant = "poster" | "backdrop" | "grid" | "catalog";

const VARIANT_WIDTH: Record<CardVariant, string> = {
  poster: "w-[140px] xs:w-[150px] md:w-[180px] lg:w-[200px] flex-shrink-0",
  backdrop: "w-[240px] xs:w-[260px] md:w-[280px] lg:w-[320px] flex-shrink-0",
  grid: "w-full",
  catalog: "w-[140px] xs:w-[150px] md:w-[180px] lg:w-[200px] flex-shrink-0",
};

interface MovieCardProps {
  media: MediaSummary;
  variant?: CardVariant;
  rank?: number;
  className?: string;
}

export function MovieCard({ media, variant = "poster", rank, className = "" }: MovieCardProps) {
  const { settings } = useSettings();
  const { openDetailModal } = useDetailModal();
  const isModalDetail = settings.appearance.detailViewType === "modal";

  const backdrop = getBackdropResponsiveUrls(media.backdropPath || media.posterPath);
  const href = getMediaHref(media.mediaType, media.id, media.title);
  const year = getYear(media.releaseDate);
  const typeLabel = getMediaTypeLabel(media.mediaType);
  const widthClass = VARIANT_WIDTH[variant];

  const handleCardClick = (e: React.MouseEvent) => {
    if (isModalDetail) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      e.preventDefault();
      openDetailModal({ mediaType: media.mediaType, id: media.id });
    }
  };

  if (variant !== "backdrop") {
    return (
      <MediaPosterCard
        title={media.title}
        posterPath={media.posterPath}
        backdropPath={media.backdropPath}
        href={href}
        mediaType={media.mediaType}
        mediaId={media.id}
        onClick={handleCardClick}
        rating={media.voteAverage}
        year={year}
        typeLabel={typeLabel}
        rank={rank}
        className={`${widthClass} snap-start ${className}`}
      />
    );
  }

  return (
    <div className={`group/card relative flex min-w-0 flex-col transition-transform duration-500 ease-out hover:scale-105 hover:z-30 origin-center cursor-pointer ${widthClass} snap-start ${className}`}>
      <Link
        href={href}
        onClick={handleCardClick}
        aria-label={media.title}
        className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neo-bg"
      >
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-white/5 shadow-xl shadow-black/40 isolate">
          {backdrop.mobile ? (
            <picture>
              {backdrop.desktop ? <source media="(min-width: 768px)" srcSet={backdrop.desktop} /> : null}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={backdrop.mobile}
                alt={media.title}
                loading="lazy"
                decoding="async"
                className="block h-full w-full object-cover transition-all duration-300 lg:group-hover/card:brightness-50"
              />
            </picture>
          ) : (
            <div className="flex h-full w-full items-center justify-center p-3 text-center text-[11px] font-medium text-text-mid">
              {media.title}
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
                {media.title}
              </h3>
              <div className="flex items-center justify-center gap-2 text-xs font-medium text-white/80">
                {year ? <span>{year}</span> : null}
                {media.voteAverage > 0 ? (
                  <span className="flex items-center gap-0.5">
                    <StarIcon size={12} className="fill-current text-white" />
                    <span>{media.voteAverage.toFixed(1)}</span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Bottom Info */}
        <div className="mt-2 pb-1 space-y-1 lg:hidden">
          <h3 className="line-clamp-1 text-xs font-medium leading-tight text-white">
            {media.title}
          </h3>
          <div className="flex items-center gap-2 text-[10px] text-white/60">
            {media.voteAverage > 0 ? (
              <span className="flex items-center gap-0.5">
                <StarIcon size={10} className="fill-current text-white" />
                <span>{media.voteAverage.toFixed(1)}</span>
              </span>
            ) : null}
            {year ? <span>{year}</span> : null}
          </div>
        </div>
      </Link>
    </div>
  );
}
